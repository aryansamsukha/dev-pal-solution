
import { useState, useEffect } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Download } from "lucide-react";
import { ProductType } from "@/types/product";
import { generateQRCodeURL } from "@/utils/qrCode";
import ProductImageUploader from "@/components/ProductImageUploader";
import { supabase } from "@/integrations/supabase/client";

interface ProductDetailProps {
  product: ProductType;
  onImageUpdated: (productId: string, imageUrl: string) => void;
}

const ProductDetail = ({ product, onImageUpdated }: ProductDetailProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateQR = async () => {
      setLoading(true);
      try {
        // Generate a URL with the product details embedded
        const productData = `https://${window.location.host}/product/${product.id}`;
        const qrUrl = await generateQRCodeURL(productData);
        setQrCodeUrl(qrUrl);
      } catch (error) {
        console.error("Error generating QR code:", error);
      } finally {
        setLoading(false);
      }
    };

    generateQR();
  }, [product]);

  const handleImageUploaded = async (imageUrl: string) => {
    try {
      // Update the product in Supabase
      const { error } = await supabase
        .from('products')
        .update({ image_url: imageUrl })
        .eq('code', product.code);

      if (error) throw error;
      
      // Update local state via the callback
      onImageUpdated(product.id, imageUrl);
    } catch (error) {
      console.error("Error updating product image:", error);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `${product.code}-qrcode.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format dimensions for better display
  const formatDimensions = (dimensions: string) => {
    if (!dimensions) return "N/A";
    
    // If already in the format L x W x H, return as is
    if (dimensions.includes("x")) return dimensions;
    
    // Try to parse dimensions if in another format
    // For now, just return the original
    return dimensions;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg font-medium">{product.code}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-1">Product Image</h3>
            {product.image ? (
              <div className="overflow-hidden rounded-md border bg-muted">
                <AspectRatio ratio={4/3}>
                  <img
                    src={product.image}
                    alt={product.code}
                    className="h-full w-full object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "/placeholder.svg";
                    }}
                  />
                </AspectRatio>
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-md border bg-muted h-48">
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
            <div className="mt-3">
              <ProductImageUploader 
                productCode={product.code} 
                onImageUploaded={handleImageUploaded}
              />
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-1">Product Details</h3>
            <dl className="grid grid-cols-1 gap-2 text-sm">
              <div className="grid grid-cols-3 gap-1">
                <dt className="font-medium text-muted-foreground">Description:</dt>
                <dd className="col-span-2">{product.description || "N/A"}</dd>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <dt className="font-medium text-muted-foreground">Dimensions (L x W x H):</dt>
                <dd className="col-span-2">{formatDimensions(product.dimensions)}</dd>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <dt className="font-medium text-muted-foreground">Finish:</dt>
                <dd className="col-span-2">{product.finish || "N/A"}</dd>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <dt className="font-medium text-muted-foreground">Price:</dt>
                <dd className="col-span-2">{typeof product.price === 'number' ? `$${product.price.toLocaleString()}` : "N/A"}</dd>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <dt className="font-medium text-muted-foreground">CBM:</dt>
                <dd className="col-span-2">{product.cbm || "N/A"}</dd>
              </div>
            </dl>
          </div>
          
          <div>
            <h3 className="font-medium mb-1">QR Code</h3>
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : qrCodeUrl ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="overflow-hidden rounded-md border bg-white p-2 w-32 h-32">
                  <img 
                    src={qrCodeUrl}
                    alt={`QR Code for ${product.code}`}
                    className="h-full w-full"
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center" 
                  onClick={downloadQRCode}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Failed to generate QR code.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductDetail;
