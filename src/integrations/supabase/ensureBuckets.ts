
import { supabase } from "./client";

export const ensureStorageBuckets = async () => {
  // Check if bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(bucket => bucket.name === 'product-images');
  
  if (!bucketExists) {
    // Create bucket if it doesn't exist
    const { error } = await supabase.storage.createBucket('product-images', {
      public: true,
      fileSizeLimit: 10485760 // 10MB limit
    });
    
    if (error) {
      console.error('Error creating product-images bucket:', error);
    } else {
      console.log('Created product-images bucket');
    }
  }
};
