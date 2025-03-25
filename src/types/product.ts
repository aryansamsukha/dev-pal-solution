
export interface ProductType {
  id: string;
  code: string;
  image: string;
  dimensions: string;
  price: number;
  cbm: string;
  description: string;
  finish?: string; // Keep this as optional with the question mark
  user_id?: string; // Add user_id as optional for compatibility with existing code
}
