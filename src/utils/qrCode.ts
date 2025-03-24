
import QRCode from 'qrcode';

export const generateQRCodeURL = async (data: string): Promise<string> => {
  try {
    return await QRCode.toDataURL(data);
  } catch (error) {
    console.error('Error generating QR code:', error);
    return '';
  }
};
