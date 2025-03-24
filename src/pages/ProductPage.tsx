
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ProductType } from "@/types/product";
import ProductDetail from "@/components/ProductDetail";

const ProductPage = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<ProductType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (!id) {
          throw new Error("Product ID is required");
        }
        
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', id)
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
    
    fetchProduct();
  }, [id]);

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
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Product Details: {product.code}</h1>
      <ProductDetail 
        product={product} 
        onImageUpdated={handleImageUpdated}
      />
    </div>
  );
};

export default ProductPage;
