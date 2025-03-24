
import { supabase } from "./client";

export const ensureStorageBuckets = async () => {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }
    
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
        
        // Fix the type issue - use a proper RPC call without parameters
        // or directly update bucket policy through the storage API
        try {
          // Add a policy to make the bucket contents public
          const { error: policyError } = await supabase.storage.from('product-images').createPolicy(
            'public-read',
            {
              type: 'READ',
              definition: {
                role: '*'
              }
            }
          );
          
          if (policyError) {
            console.error('Error setting bucket policy:', policyError);
          }
        } catch (policyError) {
          console.error('Error setting bucket policy:', policyError);
        }
      }
    }
  } catch (error) {
    console.error('Error in ensureStorageBuckets:', error);
  }
};
