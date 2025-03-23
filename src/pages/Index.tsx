
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ProductUploader from "@/components/ProductUploader";
import ProductSearch from "@/components/ProductSearch";
import ProductList from "@/components/ProductList";
import { ProductType } from "@/types/product";

const Index = () => {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleProductsImport = (importedProducts: ProductType[]) => {
    setProducts(importedProducts);
    setFilteredProducts(importedProducts);
  };

  const handleSearch = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products);
      return;
    }
    
    const filtered = products.filter((product) => 
      product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.finish && product.finish.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    setFilteredProducts(filtered);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Lamp Inventory Manager</h1>
          <p className="text-gray-600 mt-2">Manage your wooden, iron and sustainable lamps inventory</p>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Import Products</CardTitle>
                <CardDescription>Upload Excel file with product details</CardDescription>
              </CardHeader>
              <CardContent>
                <ProductUploader onImport={handleProductsImport} setIsLoading={setIsLoading} />
              </CardContent>
            </Card>

            <Card className="mt-8">
              <CardHeader>
                <CardTitle>Search Products</CardTitle>
                <CardDescription>Find products by code or description</CardDescription>
              </CardHeader>
              <CardContent>
                <ProductSearch onSearch={handleSearch} />
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Product Inventory</CardTitle>
                <CardDescription>
                  {filteredProducts.length} products found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProductList products={filteredProducts} isLoading={isLoading} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
