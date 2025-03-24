
import QRCode from 'qrcode';

export const generateQRCodeURL = async (data: string, label?: string): Promise<string> => {
  try {
    const options: QRCode.QRCodeToDataURLOptions = {
      margin: 1,
      width: 200,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };
    
    let qrCodeDataUrl = await QRCode.toDataURL(data, options);
    
    // If a label is provided, add it to the QR code
    if (label) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      // Create a promise to resolve when the image is loaded
      const imageLoadPromise = new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = qrCodeDataUrl;
      });
      
      await imageLoadPromise;
      
      // Set canvas dimensions to accommodate image and label
      canvas.width = img.width;
      canvas.height = img.height + 30; // Add space for the label
      
      if (ctx) {
        // Draw white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the QR code image
        ctx.drawImage(img, 0, 0);
        
        // Add the label
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(label, canvas.width / 2, img.height + 20);
        
        // Convert canvas to data URL
        qrCodeDataUrl = canvas.toDataURL('image/png');
      }
    }
    
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
};
