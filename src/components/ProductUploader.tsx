
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
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          
          // Map Excel columns to our product structure based on your specific Excel format
          const products: ProductType[] = json.map((row: any, index) => ({
            id: index.toString(),
            // Map "Item Code" from Excel to code in our app
            code: row["Item Code"] || "",
            // Map "Photo" from Excel to image in our app
            image: row["Photo"] || "",
            // Combine L, W, H from Excel into dimensions in our app
            dimensions: `${row["L"] || ''}x${row["W"] || ''}x${row["H"] || ''}`,
            // Map "Price USD" from Excel to price in our app
            price: parseFloat((row["Price USD"] || "0").toString().replace(/[^0-9.]/g, '')) || 0,
            // Map "Cbm" from Excel to cbm in our app
            cbm: row["Cbm"] || "",
            // Map "Description" from Excel to description in our app
            description: row["Description"] || "",
            // Map "Finish" from Excel to finish in our app
            finish: row["Finish"] || "",
          }));
          
          resolve(products);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
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
