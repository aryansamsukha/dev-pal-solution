
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
          
          // First, get raw data as arrays to inspect structure
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          console.log("Raw Excel data:", rawData);
          
          // Find the header row (the one with "Item Code", "Photo", etc.)
          let headerRowIndex = -1;
          for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            if (Array.isArray(row) && row.includes("Item Code")) {
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
            // Use column indices from header row to get proper values
            const sNoIndex = headers.indexOf("S.No.");
            const photoIndex = headers.indexOf("Photo");
            const codeIndex = headers.indexOf("Item Code");
            const descIndex = headers.indexOf("Description");
            const finishIndex = headers.indexOf("Finish");
            const sizeIndex = headers.indexOf("Size");
            const lIndex1 = headers.indexOf("L");
            const wIndex1 = headers.indexOf("W");
            const hIndex1 = headers.indexOf("H");
            
            // Some files have two sets of L/W/H columns
            const lIndex2 = headers.lastIndexOf("L");
            const wIndex2 = headers.lastIndexOf("W");
            const hIndex2 = headers.lastIndexOf("H");
            
            const cbmIndex = headers.indexOf("Cbm");
            const priceIndex = headers.indexOf("Price USD");
            
            // Use first L/W/H if available, otherwise use second set
            const lValue = row[lIndex1] || row[lIndex2] || "";
            const wValue = row[wIndex1] || row[wIndex2] || "";
            const hValue = row[hIndex1] || row[hIndex2] || "";
            
            // Build dimensions string based on Size or individual L/W/H values
            let dimensions = "";
            if (sizeIndex !== -1 && row[sizeIndex]) {
              dimensions = String(row[sizeIndex]);
            } else if (lValue || wValue || hValue) {
              dimensions = `${lValue}x${wValue}x${hValue}`;
            }
            
            // Parse price safely
            const parsePrice = (value: any): number => {
              if (value === undefined || value === null) return 0;
              const numStr = String(value).replace(/[^0-9.]/g, '');
              return numStr ? parseFloat(numStr) : 0;
            };
            
            // Build the product object
            return {
              id: index.toString(),
              code: codeIndex !== -1 ? String(row[codeIndex] || "") : "",
              image: photoIndex !== -1 ? String(row[photoIndex] || "") : "",
              dimensions,
              price: priceIndex !== -1 ? parsePrice(row[priceIndex]) : 0,
              cbm: cbmIndex !== -1 ? String(row[cbmIndex] || "") : "",
              description: descIndex !== -1 ? String(row[descIndex] || "") : "",
              finish: finishIndex !== -1 ? String(row[finishIndex] || "") : ""
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
