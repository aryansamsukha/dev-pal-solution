
export interface ProductType {
  id: string;
  code: string;
  image: string;
  dimensions: string;
  price: number;
  cbm: string;
  description: string;
  finish?: string; // Keep this as optional with the question mark
}
