
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface ProductSearchProps {
  onSearch: (searchTerm: string) => void;
}

const ProductSearch = ({ onSearch }: ProductSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (!value.trim()) {
      onSearch("");
    }
  };

  return (
    <form onSubmit={handleSearch} className="space-y-4">
      <div className="flex w-full items-center space-x-2">
        <Input
          type="text"
          placeholder="Search by product code"
          value={searchTerm}
          onChange={handleChange}
          className="flex-1"
        />
        <Button type="submit">
          <Search className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
};

export default ProductSearch;
