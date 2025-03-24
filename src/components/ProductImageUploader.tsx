
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ProductImageUploaderProps {
  productCode: string;
  productId: string;
  onImageUploaded: (url: string) => void;
}

const ProductImageUploader = ({ productCode, productId, onImageUploaded }: ProductImageUploaderProps) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${productCode}.${fileExt}`;
    const filePath = `${fileName}`;

    setIsUploading(true);
    
    try {
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      onImageUploaded(publicUrl);
      
      toast({
        title: "Image uploaded successfully",
        description: `Image for product ${productCode} has been uploaded.`,
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: error.message || "An error occurred while uploading the image.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-2">
      <label className="cursor-pointer">
        <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-md border-gray-300 hover:border-primary">
          <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
          <span className="text-sm text-muted-foreground">Click to upload product image</span>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </div>
      </label>
      {isUploading && (
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      )}
    </div>
  );
};

export default ProductImageUploader;
