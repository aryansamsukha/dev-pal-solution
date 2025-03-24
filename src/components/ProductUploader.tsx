
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ProductType } from "@/types/product";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

interface ProductUploaderProps {
  onImport: (products: ProductType[]) => void;
  setIsLoading: (loading: boolean) => void;
}

const ProductUploader = ({ onImport, setIsLoading }: ProductUploaderProps) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
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
      setIsLoading(true);
      const data = await readExcelFile(file);
      console.log("Imported data:", data); // Debug to see what was imported
      
      // Save to Supabase
      await saveProductsToSupabase(data);
      
      onImport(data);
      toast({
        title: "Import successful",
        description: `${data.length} products imported`,
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
      setIsLoading(false);
    }
  };

  const saveProductsToSupabase = async (products: ProductType[]) => {
    const { error } = await supabase
      .from('products')
      .upsert(
        products.map(product => ({
          code: product.code,
          description: product.description,
          finish: product.finish,
          dimensions: product.dimensions,
          price: product.price,
          cbm: product.cbm,
          image_url: product.image
        })),
        { onConflict: 'code' }
      );

    if (error) {
      console.error('Error saving products to Supabase:', error);
      throw new Error(`Failed to save products: ${error.message}`);
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
          for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            if (Array.isArray(row) && row.some(cell => 
              typeof cell === 'string' && cell.includes("Item Code"))) {
              headerRowIndex = i;
              break;
            }
          }
          
          if (headerRowIndex === -1) {
            throw new Error("Could not find header row with 'Item Code' column");
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
          const products: ProductType[] = nonEmptyRows.map((row, index) => {
            if (!Array.isArray(headers)) {
              throw new Error("Headers are not in expected format");
            }
            
            // Find column indices
            const codeIndex = headers.findIndex(h => typeof h === 'string' && h.includes("Item Code"));
            const descIndex = headers.findIndex(h => typeof h === 'string' && h.includes("Description"));
            const finishIndex = headers.findIndex(h => typeof h === 'string' && h.includes("Finish"));
            const lIndex = headers.findIndex(h => typeof h === 'string' && h === "L");
            const wIndex = headers.findIndex(h => typeof h === 'string' && h === "W");
            const hIndex = headers.findIndex(h => typeof h === 'string' && h === "H");
            const cbmIndex = headers.findIndex(h => typeof h === 'string' && h.includes("Cbm"));
            const priceIndex = headers.findIndex(h => typeof h === 'string' && h.includes("Price"));
            
            // Create dimensions string from L, W, H values if available
            let dimensions = "";
            if (lIndex !== -1 && wIndex !== -1 && hIndex !== -1) {
              const l = row[lIndex];
              const w = row[wIndex];
              const h = row[hIndex];
              if (l && w && h) {
                dimensions = `${l}x${w}x${h}`;
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
            return {
              id: String(index), // Use index as fallback id
              code,
              image: "", // Will be populated through the image uploader
              dimensions: dimensions || "",
              price: priceIndex !== -1 ? parsePrice(row[priceIndex]) : 0,
              cbm: cbmIndex !== -1 && row[cbmIndex] ? String(row[cbmIndex]) : "",
              description: descIndex !== -1 && row[descIndex] ? String(row[descIndex]) : "",
              finish: finishIndex !== -1 && row[finishIndex] ? String(row[finishIndex]) : ""
            };
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
      </div>
      
      <Button 
        onClick={handleUpload} 
        className="w-full"
        disabled={!file}
      >
        <Upload className="mr-2 h-4 w-4" />
        Import Products
      </Button>
      
      {file && (
        <div className="text-sm flex items-center gap-2 text-muted-foreground">
          <FileUp className="h-4 w-4" />
          <span className="truncate">{file.name}</span>
        </div>
      )}
    </div>
  );
};

export default ProductUploader;
