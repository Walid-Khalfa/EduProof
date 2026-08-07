import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface IPFSUploadResponse {
  success: boolean;
  ipfsHash: string;
  pinataUrl?: string;
  metadataUrl?: string;
  timestamp: string;
  cid?: string;
  url?: string;
  previewCid?: string;
  previewUrl?: string;
  mime?: string;
  pages?: number;
  sha256?: string;
}

/**
 * Upload a file to IPFS via backend API
 */
export async function uploadFileToIPFS(file: File): Promise<IPFSUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await axios.post<IPFSUploadResponse>(
      `${API_BASE_URL}/api/ipfs/upload-media`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('IPFS file upload error:', error);
    throw new Error(
      error.response?.data?.error || 'Failed to upload file to IPFS'
    );
  }
}

/**
 * Upload JSON metadata to IPFS via backend API
 */
export async function uploadJSONToIPFS(metadata: any): Promise<IPFSUploadResponse> {
  try {
    const response = await axios.post<{ ipfsHash: string; ipfsUrl: string; size: number; timestamp: string }>(
      `${API_BASE_URL}/api/ipfs/upload-metadata`,
      metadata,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      ipfsHash: response.data.ipfsHash,
      pinataUrl: response.data.ipfsUrl,
      metadataUrl: response.data.ipfsUrl,
      timestamp: response.data.timestamp,
    };
  } catch (error: any) {
    console.error('IPFS JSON upload error:', error);
    throw new Error(
      error.response?.data?.error || 'Failed to upload metadata to IPFS'
    );
  }
}

/**
 * Build NFT metadata following ERC-721 standard
 */
export function buildNFTMetadata(data: {
  name: string;
  description: string;
  imageUrl: string;
  studentName: string;
  courseName: string;
  issueDate: string;
  institutionName: string;
  grade?: string;
  credentialId?: string;
}) {
  return {
    name: data.name,
    description: data.description,
    image: data.imageUrl,
    attributes: [
      {
        trait_type: 'Student Name',
        value: data.studentName,
      },
      {
        trait_type: 'Course Name',
        value: data.courseName,
      },
      {
        trait_type: 'Issue Date',
        value: data.issueDate,
      },
      {
        trait_type: 'Institution',
        value: data.institutionName,
      },
      ...(data.grade
        ? [
            {
              trait_type: 'Grade',
              value: data.grade,
            },
          ]
        : []),
      ...(data.credentialId
        ? [
            {
              trait_type: 'Credential ID',
              value: data.credentialId,
            },
          ]
        : []),
    ],
  };
}
