
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { ProductType } from "@/types/product";
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
      onImport(data);
      toast({
        title: "Import successful",
        description: `${data.length} products imported`,
      });
    } catch (error) {
      console.error("Error importing file:", error);
      toast({
        title: "Import failed",
        description: "There was an error importing your products",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
          
          // Convert to JSON with header: 1 option to get array of arrays first
          // This helps us debug the actual structure of the Excel file
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          console.log("Raw Excel data:", rawData);
          
          // Now convert with headers
          const json = XLSX.utils.sheet_to_json(worksheet);
          console.log("JSON data with headers:", json);
          
          // Map Excel columns to our product structure, checking multiple possible column names
          const products: ProductType[] = json.map((row: any, index) => {
            console.log("Processing row:", row);
            
            // Try to parse numeric values safely
            const parseNumeric = (value: any): number => {
              if (value === undefined || value === null) return 0;
              const numStr = String(value).replace(/[^0-9.]/g, '');
              return numStr ? parseFloat(numStr) : 0;
            };
            
            // Check multiple possible column names
            const getFieldValue = (possibleNames: string[]): string => {
              for (const name of possibleNames) {
                if (row[name] !== undefined) return String(row[name]);
              }
              return "";
            };
            
            const code = getFieldValue(["Item Code", "Code", "ITEM CODE", "code", "ItemCode"]);
            const image = getFieldValue(["Photo", "Image", "PHOTO", "photo", "URL", "ImageURL"]);
            
            // Handle dimensions - either as a single field or components L, W, H
            let dimensions = getFieldValue(["Dimensions", "DIMENSIONS", "dimensions", "Size", "SIZE"]);
            if (!dimensions) {
              const l = row["L"] || row["Length"] || "";
              const w = row["W"] || row["Width"] || "";
              const h = row["H"] || row["Height"] || "";
              if (l || w || h) {
                dimensions = `${l}x${w}x${h}`;
              }
            }
            
            // Try multiple price column names
            const priceField = getFieldValue(["Price USD", "Price", "PRICE", "price", "PriceUSD"]);
            const price = parseNumeric(priceField);
            
            const cbm = getFieldValue(["Cbm", "CBM", "cbm", "Volume", "VOLUME"]);
            const description = getFieldValue(["Description", "DESCRIPTION", "description", "Desc"]);
            const finish = getFieldValue(["Finish", "FINISH", "finish", "Material", "MATERIAL"]);
            
            return {
              id: index.toString(),
              code,
              image,
              dimensions,
              price,
              cbm,
              description,
              finish
            };
          });
          
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
