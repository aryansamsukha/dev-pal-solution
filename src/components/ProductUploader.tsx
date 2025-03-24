
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileUp, ImageDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ProductType } from "@/types/product";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { ensureStorageBuckets } from "@/integrations/supabase/ensureBuckets";
import { saveAs } from "file-saver";

interface ProductUploaderProps {
  onImport: (products: ProductType[]) => void;
  setIsLoading: (loading: boolean) => void;
}

const ProductUploader = ({ onImport, setIsLoading }: ProductUploaderProps) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [imagesZip, setImagesZip] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleImageZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImagesZip(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select an Excel file to import",
        variant: "destructive",
      });
      return;
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({
        title: "Invalid file format",
        description: "Please upload an Excel file (.xlsx or .xls)",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      setIsLoading(true);
      
      // Ensure storage bucket exists
      await ensureStorageBuckets();
      
      const data = await readExcelFile(file);
      console.log("Imported data:", data); // Debug to see what was imported
      
      // Filter out duplicates by code
      const uniqueProducts = removeDuplicates(data, 'code');
      
      if (uniqueProducts.length < data.length) {
        toast({
          title: "Duplicate products found",
          description: `${data.length - uniqueProducts.length} duplicate product(s) were skipped.`,
          variant: "default",
        });
      }
      
      // Upload images from zip if provided
      if (imagesZip) {
        await processImageZip(imagesZip, uniqueProducts);
      }
      
      // Save to Supabase
      await saveProductsToSupabase(uniqueProducts);
      
      onImport(uniqueProducts);
      toast({
        title: "Import successful",
        description: `${uniqueProducts.length} products imported`,
      });
    } catch (error) {
      console.error("Error importing file:", error);
      toast({
        title: "Import failed",
        description: typeof error === 'object' && error !== null && 'message' in error 
          ? String(error.message) 
          : "An error occurred while importing your products",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setIsLoading(false);
    }
  };
  
  const removeDuplicates = <T extends Record<string, any>>(array: T[], key: keyof T): T[] => {
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (value && !seen.has(value)) {
        seen.add(value);
        return true;
      }
      return false;
    });
  };

  const processImageZip = async (zipFile: File, products: ProductType[]) => {
    try {
      const zip = new JSZip();
      const zipContents = await zip.loadAsync(zipFile);
      const productCodeMap = new Map(products.map(p => [p.code.toLowerCase(), p]));
      
      toast({
        title: "Processing images",
        description: "Starting to extract and upload images from ZIP file"
      });
      
      let uploadedCount = 0;
      let skippedCount = 0;
      const productCodes = Array.from(productCodeMap.keys());
      
      // Process files in the zip
      const promises: Promise<void>[] = [];
      
      zipContents.forEach(async (relativePath, zipEntry) => {
        if (zipEntry.dir) return;
        
        const fileName = relativePath.split('/').pop() || '';
        if (!fileName.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return;
        
        // Try to match the filename to a product code
        const codeMatch = productCodes.find(code => 
          fileName.toLowerCase().includes(code) ||
          code.toLowerCase().includes(fileName.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '').toLowerCase())
        );
        
        if (codeMatch) {
          const product = productCodeMap.get(codeMatch);
          if (product) {
            const promise = zipEntry.async('blob').then(async (blob) => {
              try {
                // Create a file from the blob
                const file = new File([blob], `${product.code}.${fileName.split('.').pop()}`, { type: `image/${fileName.split('.').pop()}` });
                
                // Upload the file
                const filePath = `${product.code}.${fileName.split('.').pop()}`;
                
                const { data, error } = await supabase.storage
                  .from('product-images')
                  .upload(filePath, file, { 
                    upsert: true,
                    contentType: file.type 
                  });
                
                if (error) throw error;
                
                // Get public URL and update product
                const { data: { publicUrl } } = supabase.storage
                  .from('product-images')
                  .getPublicUrl(filePath);
                
                // Update the product
                product.image = publicUrl;
                
                // Update in Supabase
                await supabase
                  .from('products')
                  .update({ image_url: publicUrl })
                  .eq('code', product.code);
                
                uploadedCount++;
              } catch (error) {
                console.error(`Error uploading image for ${product.code}:`, error);
                skippedCount++;
              }
            }).catch(error => {
              console.error(`Error processing image for ${product.code}:`, error);
              skippedCount++;
            });
            
            promises.push(promise);
          } else {
            skippedCount++;
          }
        } else {
          skippedCount++;
        }
      });
      
      await Promise.all(promises);
      
      toast({
        title: "Images processed",
        description: `${uploadedCount} images uploaded and linked to products. ${skippedCount} images skipped.`
      });
      
      return true;
    } catch (error) {
      console.error("Error processing zip file:", error);
      toast({
        title: "Image processing failed",
        description: typeof error === 'object' && error !== null && 'message' in error 
          ? String(error.message) 
          : "An error occurred while processing images",
        variant: "destructive",
      });
      return false;
    }
  };

  const saveProductsToSupabase = async (products: ProductType[]) => {
    // Process products in batches to avoid Supabase error
    const batchSize = 20;
    const batches = [];
    
    for (let i = 0; i < products.length; i += batchSize) {
      batches.push(products.slice(i, i + batchSize));
    }
    
    let failedCount = 0;
    
    for (const batch of batches) {
      try {
        // Use upsert instead of insert to handle existing products
        const { error } = await supabase
          .from('products')
          .upsert(
            batch.map(product => ({
              code: product.code,
              description: product.description,
              finish: product.finish ?? null,
              dimensions: product.dimensions,
              price: product.price,
              cbm: product.cbm,
              image_url: product.image
            })),
            { onConflict: 'code' }
          );

        if (error) {
          console.error('Error saving products to Supabase:', error);
          failedCount += batch.length;
        }
      } catch (error) {
        console.error('Exception saving products to Supabase:', error);
        failedCount += batch.length;
      }
    }
    
    if (failedCount > 0) {
      toast({
        title: "Warning",
        description: `${failedCount} products could not be saved to the database.`,
        variant: "destructive",
      });
    }
  };

  const readExcelFile = (file: File): Promise<ProductType[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // First, get raw data as arrays to inspect structure
          const rawData = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1 });
          console.log("Raw Excel data:", rawData);
          
          // Find the header row (the one with "S.No.", "Item Code", etc.)
          let headerRowIndex = -1;
          for (let i = 0; i < Math.min(10, rawData.length); i++) {
            const row = rawData[i];
            if (Array.isArray(row) && row.some(cell => 
              typeof cell === 'string' && (
                cell.includes("Item Code") || 
                cell.includes("Code") ||
                cell.includes("Product Code")
              )
            )) {
              headerRowIndex = i;
              break;
            }
          }
          
          if (headerRowIndex === -1) {
            throw new Error("Could not find header row with 'Item Code' or 'Code' column");
          }
          
          console.log("Header row found at index:", headerRowIndex);
          
          // Extract header names from the header row
          const headers = rawData[headerRowIndex];
          
          // Get all data rows after the header
          const dataRows = rawData.slice(headerRowIndex + 1);
          
          // Filter out empty rows
          const nonEmptyRows = dataRows.filter(row => 
            Array.isArray(row) && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== "")
          );
          
          console.log("Headers:", headers);
          console.log("Data rows:", nonEmptyRows);
          
          // Map data rows to products
          const products = nonEmptyRows.map((row, index) => {
            if (!Array.isArray(headers)) {
              throw new Error("Headers are not in expected format");
            }
            
            // Find column indices
            const codeIndex = headers.findIndex(h => typeof h === 'string' && (
              h.includes("Item Code") || h.includes("Code") || h.includes("Product Code")
            ));
            const descIndex = headers.findIndex(h => typeof h === 'string' && h.includes("Description"));
            const finishIndex = headers.findIndex(h => typeof h === 'string' && (
              h.includes("Finish") || h.includes("Material") || h.includes("Type")
            ));
            
            // Look for dimension columns - either combined or separate L, W, H
            const dimensionsIndex = headers.findIndex(h => typeof h === 'string' && (
              h.includes("Dimensions") || h.includes("Size") || h.includes("Measurement")
            ));
            const lIndex = headers.findIndex(h => typeof h === 'string' && (
              h === "L" || h.toLowerCase().includes("length")
            ));
            const wIndex = headers.findIndex(h => typeof h === 'string' && (
              h === "W" || h.toLowerCase().includes("width")
            ));
            const hIndex = headers.findIndex(h => typeof h === 'string' && (
              h === "H" || h.toLowerCase().includes("height")
            ));
            
            const cbmIndex = headers.findIndex(h => typeof h === 'string' && (
              h.includes("Cbm") || h.includes("CBM") || h.includes("Volume")
            ));
            const priceIndex = headers.findIndex(h => typeof h === 'string' && (
              h.includes("Price") || h.includes("Cost") || h.includes("Rate")
            ));
            
            // Create dimensions string from combined dimension field or L, W, H values if available
            let dimensions = "";
            if (dimensionsIndex !== -1 && row[dimensionsIndex]) {
              // If we have a combined dimensions field
              dimensions = String(row[dimensionsIndex]);
              
              // If the dimensions don't already contain 'x', format it
              if (!dimensions.includes("x") && !dimensions.includes("X")) {
                // Try to parse it based on common formats
                const dims = dimensions.split(/[x×*]/);
                if (dims.length === 3) {
                  dimensions = `${dims[0].trim()} x ${dims[1].trim()} x ${dims[2].trim()}`;
                }
              }
            } else if (lIndex !== -1 && wIndex !== -1 && hIndex !== -1) {
              // If we have separate L, W, H columns
              const l = row[lIndex];
              const w = row[wIndex];
              const h = row[hIndex];
              if (l && w && h) {
                dimensions = `${l} x ${w} x ${h}`;
              }
            }
            
            // Parse price safely
            const parsePrice = (value: any): number => {
              if (value === undefined || value === null) return 0;
              if (typeof value === 'string') {
                // Remove currency symbols and commas
                const numStr = value.replace(/[$,]/g, '');
                return numStr ? parseFloat(numStr) : 0;
              }
              return typeof value === 'number' ? value : 0;
            };
            
            const code = codeIndex !== -1 && row[codeIndex] ? String(row[codeIndex]).trim() : "";
            
            if (!code) {
              console.warn(`Skipping row ${index + headerRowIndex + 1} due to missing product code`);
              return null;
            }
            
            // Build the product object
            const product: ProductType = {
              id: String(index), // Use index as fallback id
              code,
              image: "", // Will be populated through the image uploader
              dimensions: dimensions || "",
              price: priceIndex !== -1 ? parsePrice(row[priceIndex]) : 0,
              cbm: cbmIndex !== -1 && row[cbmIndex] ? String(row[cbmIndex]) : "",
              description: descIndex !== -1 && row[descIndex] ? String(row[descIndex]) : "",
              finish: finishIndex !== -1 && row[finishIndex] ? String(row[finishIndex]) : undefined
            };
            
            return product;
          }).filter((product): product is ProductType => product !== null);
          
          console.log("Mapped products:", products);
          resolve(products);
        } catch (error) {
          console.error("Error parsing Excel:", error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Input
          id="excel-file"
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="cursor-pointer"
        />
        <p className="text-xs text-muted-foreground">Upload Excel file with product details</p>
      </div>
      
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Input
          id="images-zip"
          type="file"
          accept=".zip"
          onChange={handleImageZipChange}
          className="cursor-pointer"
        />
        <p className="text-xs text-muted-foreground">Optional: Upload ZIP file with product images (filenames should match product codes)</p>
      </div>
      
      <Button 
        onClick={handleUpload} 
        className="w-full"
        disabled={!file || uploading}
      >
        {uploading ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
            Importing...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Import Products
          </>
        )}
      </Button>
      
      {file && (
        <div className="text-sm flex items-center gap-2 text-muted-foreground">
          <FileUp className="h-4 w-4" />
          <span className="truncate">{file.name}</span>
        </div>
      )}
      
      {imagesZip && (
        <div className="text-sm flex items-center gap-2 text-muted-foreground">
          <ImageDown className="h-4 w-4" />
          <span className="truncate">{imagesZip.name}</span>
        </div>
      )}
    </div>
  );
};

export default ProductUploader;
