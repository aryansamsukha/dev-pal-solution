
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductType } from "@/types/product";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search, Image as ImageIcon, Download, Trash2 } from "lucide-react";
import ProductDetail from "@/components/ProductDetail";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { generateQRCodeURL } from "@/utils/qrCode";
import { useToast } from "@/components/ui/use-toast";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProductListProps {
  products: ProductType[];
  isLoading: boolean;
  onProductDeleted?: (productId: string) => void;
}

const ProductList = ({ products, isLoading, onProductDeleted }: ProductListProps) => {
  const [localProducts, setLocalProducts] = useState<ProductType[]>(products);
  const [isGeneratingQRs, setIsGeneratingQRs] = useState(false);
  const { toast } = useToast();
  
  // Update local products when props change
  useEffect(() => {
    if (JSON.stringify(products) !== JSON.stringify(localProducts)) {
      setLocalProducts(products);
    }
  }, [products]);

  const handleImageUpdated = (productId: string, imageUrl: string) => {
    setLocalProducts(prevProducts => 
      prevProducts.map(product => 
        product.id === productId 
          ? { ...product, image: imageUrl } 
          : product
      )
    );
  };
  
  const handleProductDeleted = (productId: string) => {
    setLocalProducts(prevProducts => 
      prevProducts.filter(product => product.id !== productId)
    );
    
    if (onProductDeleted) {
      onProductDeleted(productId);
    }
  };

  // Format dimensions for better display
  const formatDimensions = (dimensions: string) => {
    if (!dimensions) return "";
    
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
    
    return "";
  };
  
  const downloadAllQRCodes = async () => {
    if (localProducts.length === 0) return;
    
    setIsGeneratingQRs(true);
    toast({
      title: "Generating QR codes",
      description: "Creating QR codes for all products. This may take a moment..."
    });
    
    try {
      const zip = new JSZip();
      const qrFolder = zip.folder("product-qr-codes");
      
      // Generate QR codes for all products
      const qrPromises = localProducts.map(async (product) => {
        try {
          const productData = `https://${window.location.host}/product/${product.id}`;
          const qrUrl = await generateQRCodeURL(productData, product.code);
          
          // Convert data URL to blob
          const response = await fetch(qrUrl);
          const blob = await response.blob();
          
          // Add to zip
          qrFolder?.file(`${product.code}-qrcode.png`, blob);
          
          return true;
        } catch (error) {
          console.error(`Error generating QR for ${product.code}:`, error);
          return false;
        }
      });
      
      // Wait for all QR codes to be generated
      await Promise.all(qrPromises);
      
      // Generate the ZIP file
      const zipBlob = await zip.generateAsync({ type: "blob" });
      
      // Save the ZIP file
      saveAs(zipBlob, "product-qr-codes.zip");
      
      toast({
        title: "QR codes downloaded",
        description: `QR codes for ${localProducts.length} products have been downloaded.`
      });
    } catch (error) {
      console.error("Error generating bulk QR codes:", error);
      toast({
        title: "Error generating QR codes",
        description: "There was a problem generating the QR codes.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingQRs(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-muted-foreground">Loading products...</p>
      </div>
    );
  }

  if (localProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Search className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">No products found</h3>
        <p className="text-muted-foreground text-center mt-2">
          Import an Excel file to see your products here
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button 
          className="flex items-center" 
          onClick={downloadAllQRCodes}
          disabled={isGeneratingQRs}
        >
          {isGeneratingQRs ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
              Generating QR codes...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download All QR Codes
            </>
          )}
        </Button>
      </div>
      
      <div className="border rounded-lg">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[80px]">Image</TableHead>
              <TableHead className="w-[120px]">Code</TableHead>
              <TableHead className="w-[180px]">Dimensions (L x W x H)</TableHead>
              <TableHead className="w-[120px]">Finish</TableHead>
              <TableHead className="w-[100px]">Price</TableHead>
              <TableHead className="w-[80px]">CBM</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  {product.image ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" className="p-0 h-auto">
                          <div className="h-12 w-12 overflow-hidden rounded border bg-muted">
                            <AspectRatio ratio={1/1} className="h-full">
                              <img
                                src={product.image}
                                alt={product.code}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder.svg";
                                }}
                              />
                            </AspectRatio>
                          </div>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>Product {product.code}</DialogTitle>
                        </DialogHeader>
                        <ProductDetail 
                          product={product} 
                          onImageUpdated={handleImageUpdated}
                          onProductDeleted={handleProductDeleted}
                        />
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <div className="h-12 w-12 flex items-center justify-center rounded border bg-muted">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-medium">{product.code}</TableCell>
                <TableCell>{formatDimensions(product.dimensions)}</TableCell>
                <TableCell>{product.finish || "N/A"}</TableCell>
                <TableCell>{typeof product.price === 'number' ? `$${product.price.toLocaleString()}` : "N/A"}</TableCell>
                <TableCell>{product.cbm || "N/A"}</TableCell>
                <TableCell className="max-w-xs truncate" title={product.description}>
                  {product.description || "N/A"}
                </TableCell>
                <TableCell className="text-right">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="mr-2">
                        Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Product {product.code}</DialogTitle>
                      </DialogHeader>
                      <ProductDetail 
                        product={product} 
                        onImageUpdated={handleImageUpdated}
                        onProductDeleted={handleProductDeleted}
                      />
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ProductList;
