
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProductType } from "@/types/product";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search, Image as ImageIcon } from "lucide-react";

interface ProductListProps {
  products: ProductType[];
  isLoading: boolean;
}

const ProductList = ({ products, isLoading }: ProductListProps) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-muted-foreground">Loading products...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Search className="h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">No products found</h3>
        <p className="text-muted-foreground text-center mt-2">
          Import an Excel file to see your products here
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-full">
        <TableHeader>
          <TableRow>
            <TableHead>Image</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Dimensions</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>CBM</TableHead>
            <TableHead>Description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                {product.image ? (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" className="p-0 h-auto">
                        <div className="h-12 w-12 overflow-hidden rounded border bg-muted">
                          <AspectRatio ratio={1/1} className="h-full">
                            <img
                              src={product.image}
                              alt={product.code}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg";
                              }}
                            />
                          </AspectRatio>
                        </div>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Product {product.code}</DialogTitle>
                      </DialogHeader>
                      <div className="overflow-hidden rounded-md border bg-muted">
                        <AspectRatio ratio={4/3}>
                          <img
                            src={product.image}
                            alt={product.code}
                            className="h-full w-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg";
                            }}
                          />
                        </AspectRatio>
                      </div>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div className="h-12 w-12 flex items-center justify-center rounded border bg-muted">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium">{product.code}</TableCell>
              <TableCell>{product.dimensions}</TableCell>
              <TableCell>{typeof product.price === 'number' ? `₹${product.price.toLocaleString()}` : product.price}</TableCell>
              <TableCell>{product.cbm}</TableCell>
              <TableCell className="max-w-xs truncate" title={product.description}>
                {product.description}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ProductList;
