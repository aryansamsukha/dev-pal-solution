
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ProductType } from "@/types/product";
import ProductDetail from "@/components/ProductDetail";
import { ChevronLeft } from "lucide-react";

const ProductPage = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    // Get userId from localStorage or auth
    const checkUserId = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        setUserId(data.session.user.id);
      } else {
        const storedUserId = localStorage.getItem('lamp_inventory_user_id');
        if (storedUserId) {
          setUserId(storedUserId);
        } else {
          setUserId("1"); // Default user ID
        }
      }
    };
    
    checkUserId().then(() => {
      if (id) {
        fetchProduct(id);
      }
    });
  }, [id]);

  const fetchProduct = async (productId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      if (!productId) {
        throw new Error("Product ID is required");
      }
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
        
      if (error) throw error;
      
      if (!data) {
        throw new Error("Product not found");
      }
      
      setProduct({
        id: data.id,
        code: data.code,
        description: data.description || "",
        finish: data.finish || "",
        dimensions: data.dimensions || "",
        price: data.price || 0,
        cbm: data.cbm || "",
        image: data.image_url || "",
      });
    } catch (error: any) {
      console.error("Error fetching product:", error);
      setError(error.message || "Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpdated = (productId: string, imageUrl: string) => {
    if (product) {
      setProduct({
        ...product,
        image: imageUrl
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error || "Failed to load product"}</p>
            <Button asChild className="mt-4">
              <Link to="/">Back to Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button variant="outline" asChild>
          <Link to="/">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </Link>
        </Button>
      </div>
      <h1 className="text-2xl font-bold mb-6">Product Details: {product.code}</h1>
      <ProductDetail 
        product={product} 
        onImageUpdated={handleImageUpdated}
        userId={userId}
      />
    </div>
  );
};

export default ProductPage;
