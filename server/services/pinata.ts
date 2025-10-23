import axios from 'axios';
import FormData from 'form-data';

const PINATA_API_URL = 'https://api.pinata.cloud';

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

/**
 * Upload a file to Pinata IPFS
 */
export async function uploadFileToPinata(file: Express.Multer.File): Promise<PinataResponse> {
  const PINATA_JWT = process.env.PINATA_JWT;
  
  console.log('🔍 [uploadFileToPinata] PINATA_JWT exists:', !!PINATA_JWT);
  console.log('🔍 [uploadFileToPinata] PINATA_JWT length:', PINATA_JWT?.length || 0);
  
  if (!PINATA_JWT) {
    throw new Error('Pinata JWT not configured');
  }

  const formData = new FormData();
  formData.append('file', file.buffer, {
    filename: file.originalname,
    contentType: file.mimetype,
  });

  // Optional: Add metadata
  const metadata = JSON.stringify({
    name: file.originalname,
    keyvalues: {
      uploadedAt: new Date().toISOString(),
      type: 'certificate-image'
    }
  });
  formData.append('pinataMetadata', metadata);

  // Optional: Pin options
  const options = JSON.stringify({
    cidVersion: 1,
  });
  formData.append('pinataOptions', options);

  try {
    const response = await axios.post(
      `${PINATA_API_URL}/pinning/pinFileToIPFS`,
      formData,
      {
        headers: {
          'Authorization': `Bearer ${PINATA_JWT}`,
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Pinata file upload error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || 'Failed to upload file to IPFS');
  }
}

/**
 * Upload JSON metadata to Pinata IPFS
 */
export async function uploadJSONToPinata(metadata: any): Promise<PinataResponse> {
  const PINATA_JWT = process.env.PINATA_JWT;
  
  console.log('🔍 [uploadJSONToPinata] PINATA_JWT exists:', !!PINATA_JWT);
  console.log('🔍 [uploadJSONToPinata] PINATA_JWT length:', PINATA_JWT?.length || 0);
  
  if (!PINATA_JWT) {
    throw new Error('Pinata JWT not configured');
  }

  const pinataMetadata = {
    name: `${metadata.name}-metadata.json`,
    keyvalues: {
      uploadedAt: new Date().toISOString(),
      type: 'certificate-metadata'
    }
  };

  const pinataOptions = {
    cidVersion: 1,
  };

  try {
    const response = await axios.post(
      `${PINATA_API_URL}/pinning/pinJSONToIPFS`,
      {
        pinataContent: metadata,
        pinataMetadata,
        pinataOptions
      },
      {
        headers: {
          'Authorization': `Bearer ${PINATA_JWT}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Pinata JSON upload error:', error.response?.data || error.message);
    throw new Error(error.response?.data?.error || 'Failed to upload JSON to IPFS');
  }
}

/**
 * Test Pinata authentication
 */
export async function testPinataAuth(): Promise<boolean> {
  if (!PINATA_JWT) {
    return false;
  }

  try {
    const response = await axios.get(
      `${PINATA_API_URL}/data/testAuthentication`,
      {
        headers: {
          'Authorization': `Bearer ${PINATA_JWT}`,
        },
      }
    );

    return response.data.message === 'Congratulations! You are communicating with the Pinata API!';
  } catch (error) {
    console.error('Pinata auth test failed:', error);
    return false;
  }
}
