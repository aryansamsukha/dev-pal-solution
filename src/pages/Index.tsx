
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ProductUploader from "@/components/ProductUploader";
import ProductSearch from "@/components/ProductSearch";
import ProductList from "@/components/ProductList";
import { ProductType } from "@/types/product";
import { supabase } from "@/integrations/supabase/client";
import { ensureStorageBuckets } from "@/integrations/supabase/ensureBuckets";
import { toast } from "@/components/ui/use-toast";
import { v4 as uuidv4 } from 'uuid';

const Index = () => {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string>("1"); // Default to "1" if none specified
  
  useEffect(() => {
    // Load or create userId from localStorage for product isolation
    const loadUserId = () => {
      let id = localStorage.getItem('lamp_inventory_user_id');
      if (!id) {
        id = userId || "1"; // Use existing state or default to "1"
        localStorage.setItem('lamp_inventory_user_id', id);
      }
      setUserId(id);
      return id;
    };
    
    const initApp = async () => {
      // Get or create userId
      const currentUserId = loadUserId();
      
      // Make sure we have the necessary storage buckets
      try {
        await ensureStorageBuckets();
      } catch (error) {
        console.error("Error ensuring storage buckets:", error);
      }
      
      fetchProducts(currentUserId);
    };
    
    initApp();
  }, []);
  
  const fetchProducts = async (uid: string) => {
    setIsLoading(true);
    try {
      // Get all products with pagination to handle large datasets
      const allProducts: ProductType[] = [];
      let page = 0;
      const pageSize = 100;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('user_id', uid)
          .range(page * pageSize, (page + 1) * pageSize - 1)
          .order('code', { ascending: true });
          
        if (error) throw error;
        
        if (data.length === 0) {
          hasMore = false;
        } else {
          const formattedProducts = data.map(product => ({
            id: product.id || "",
            code: product.code || "",
            description: product.description || "",
            finish: product.finish || undefined,
            dimensions: product.dimensions || "",
            price: product.price || 0,
            cbm: product.cbm || "",
            image: product.image_url || "",
          }));
          
          allProducts.push(...formattedProducts);
          page++;
        }
      }
      
      setProducts(allProducts);
      setFilteredProducts(allProducts);
      
      // Show feedback about the number of products
      if (allProducts.length > 0) {
        toast({
          title: "Products loaded",
          description: `${allProducts.length} products loaded successfully.`
        });
      }
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error loading products",
        description: "There was a problem loading your products.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductsImport = (importedProducts: ProductType[]) => {
    // Refresh all products from the database after import
    fetchProducts(userId);
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
  
  const handleProductDeleted = (productId: string) => {
    // Update both products and filtered products
    const updatedProducts = products.filter(product => product.id !== productId);
    setProducts(updatedProducts);
    setFilteredProducts(prevFiltered => prevFiltered.filter(product => product.id !== productId));
    
    toast({
      title: "Product deleted",
      description: "The product has been successfully deleted."
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Lamp Inventory Manager</h1>
          <p className="text-gray-600 mt-2">Manage your wooden, iron and sustainable lamps inventory</p>
          <p className="text-sm text-muted-foreground mt-1">User ID: {userId}</p>
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
                <ProductUploader 
                  onImport={handleProductsImport} 
                  setIsLoading={setIsLoading}
                  userId={userId}
                />
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
                <ProductList 
                  products={filteredProducts} 
                  isLoading={isLoading} 
                  onProductDeleted={handleProductDeleted}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
