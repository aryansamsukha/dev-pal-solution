
import { useState, useEffect } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Download, Trash2 } from "lucide-react";
import { ProductType } from "@/types/product";
import { generateQRCodeURL } from "@/utils/qrCode";
import ProductImageUploader from "@/components/ProductImageUploader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface ProductDetailProps {
  product: ProductType;
  onImageUpdated: (productId: string, imageUrl: string) => void;
  onProductDeleted?: (productId: string) => void;
}

const ProductDetail = ({ product, onImageUpdated, onProductDeleted }: ProductDetailProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const generateQR = async () => {
      setLoading(true);
      try {
        // Generate a URL with the product details embedded
        const productData = `https://${window.location.host}/product/${product.id}`;
        const qrUrl = await generateQRCodeURL(productData, product.code);
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
        .eq('id', product.id);

      if (error) throw error;
      
      // Update local state via the callback
      onImageUpdated(product.id, imageUrl);
      
      toast({
        title: "Image updated",
        description: "Product image has been updated successfully"
      });
    } catch (error) {
      console.error("Error updating product image:", error);
      toast({
        title: "Error updating image",
        description: "There was an error updating the product image",
        variant: "destructive"
      });
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
  
  const handleDeleteProduct = async () => {
    try {
      setLoading(true);
      
      // Delete product from database
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);
        
      if (error) throw error;
      
      // Try to delete image if it exists
      if (product.image) {
        try {
          const fileName = product.image.split('/').pop();
          if (fileName) {
            await supabase.storage
              .from('product-images')
              .remove([fileName]);
          }
        } catch (imageError) {
          console.error("Error deleting product image:", imageError);
          // Continue even if image deletion fails
        }
      }
      
      setShowDeleteDialog(false);
      
      if (onProductDeleted) {
        onProductDeleted(product.id);
      }
      
      toast({
        title: "Product deleted",
        description: `Product ${product.code} has been deleted successfully.`,
      });
    } catch (error: any) {
      console.error("Error deleting product:", error);
      toast({
        title: "Error deleting product",
        description: error.message || "An error occurred while deleting the product.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Format dimensions to ensure it's displayed properly
  const formatDimensions = (dimensions: string) => {
    if (!dimensions) return "N/A";
    
    // If already in the format L x W x H, return as is
    if (dimensions.includes("x") || dimensions.includes("X")) {
      // Ensure consistent formatting with lowercase 'x' and proper spacing
      return dimensions.replace(/[xX]/g, " x ").replace(/\s+/g, " ").trim();
    }
    
    // Try to parse dimensions based on common patterns
    const possibleSeparators = [" ", ",", "-", "/"];
    for (const separator of possibleSeparators) {
      if (dimensions.includes(separator)) {
        const parts = dimensions.split(separator).filter(p => p.trim() !== "").map(p => p.trim());
        if (parts.length === 3) {
          return `${parts[0]} x ${parts[1]} x ${parts[2]}`;
        }
      }
    }
    
    // If we couldn't parse it but it seems to have numbers, just return the original
    if (/\d/.test(dimensions)) {
      return dimensions;
    }
    
    return "N/A";
  };

  return (
    <>
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
                  productId={product.id}
                  onImageUploaded={handleImageUploaded}
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-1">Product Details</h3>
              <dl className="grid grid-cols-1 gap-2 text-sm">
                <div className="grid grid-cols-[120px_1fr] gap-1">
                  <dt className="font-medium text-muted-foreground">Description:</dt>
                  <dd>{product.description || "N/A"}</dd>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-1">
                  <dt className="font-medium text-muted-foreground">Dimensions:</dt>
                  <dd>{formatDimensions(product.dimensions)}</dd>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-1">
                  <dt className="font-medium text-muted-foreground">Finish:</dt>
                  <dd>{product.finish || "N/A"}</dd>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-1">
                  <dt className="font-medium text-muted-foreground">Price:</dt>
                  <dd>{typeof product.price === 'number' ? `$${product.price.toLocaleString()}` : "N/A"}</dd>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-1">
                  <dt className="font-medium text-muted-foreground">CBM:</dt>
                  <dd>{product.cbm || "N/A"}</dd>
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
                  <div className="text-center text-sm font-medium">{product.code}</div>
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
            
            <div className="pt-4 flex justify-end">
              <Button 
                variant="destructive" 
                size="sm" 
                className="flex items-center"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Product
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete product {product.code}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteProduct} disabled={loading}>
              {loading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                  Deleting...
                </>
              ) : (
                <>Delete</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProductDetail;
