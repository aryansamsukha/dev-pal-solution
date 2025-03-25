
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ProductUploader from "@/components/ProductUploader";
import ProductSearch from "@/components/ProductSearch";
import ProductList from "@/components/ProductList";
import { ProductType } from "@/types/product";
import { supabase } from "@/integrations/supabase/client";
import { ensureStorageBuckets } from "@/integrations/supabase/ensureBuckets";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

const Index = () => {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        
        if (data.session?.user) {
          setUser(data.session.user);
          setUserId(data.session.user.id);
          localStorage.setItem('lamp_inventory_user_id', data.session.user.id);
        } else {
          // Use localStorage as fallback for development
          const localUserId = localStorage.getItem('lamp_inventory_user_id');
          if (localUserId) {
            setUserId(localUserId);
          } else {
            // For development only - set to "1" if no user ID
            setUserId("1");
            localStorage.setItem('lamp_inventory_user_id', "1");
          }
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        // Fallback to default user ID
        setUserId("1");
        localStorage.setItem('lamp_inventory_user_id', "1");
      }
    };
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser(session.user);
          setUserId(session.user.id);
          localStorage.setItem('lamp_inventory_user_id', session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          // Don't clear userId for development
        }
      }
    );
    
    const initApp = async () => {
      await checkAuth();
      
      // Make sure we have the necessary storage buckets
      try {
        await ensureStorageBuckets();
      } catch (error) {
        console.error("Error ensuring storage buckets:", error);
      }
    };
    
    initApp();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  // Fetch products when userId is set
  useEffect(() => {
    if (userId) {
      fetchProducts(userId);
    }
  }, [userId]);
  
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
    if (userId) {
      fetchProducts(userId);
    }
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been logged out successfully."
    });
    // In a real app, you'd navigate to login here
    // navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Lamp Inventory Manager</h1>
              <p className="text-gray-600 mt-2">Manage your wooden, iron and sustainable lamps inventory</p>
              <p className="text-sm text-muted-foreground mt-1">User ID: {userId}</p>
            </div>
            <div>
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{user.email}</span>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" asChild>
                  <Link to="/auth">Login / Sign Up</Link>
                </Button>
              )}
            </div>
          </div>
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
