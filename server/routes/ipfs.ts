import { Router, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { buildPdfPreviewSVG } from '../utils/pdfPreviewSvg';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_UPLOAD_MB || 15) * 1024 * 1024 }
});

const ALLOWED_MEDIA_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/svg+xml',
  'application/pdf'
]);

const need = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
};

/**
 * POST /api/ipfs/upload-media
 * Upload image or PDF to IPFS via Pinata
 * For PDFs: generates PNG preview and uploads both
 * Body: multipart/form-data with 'file' field
 * Returns: { ok, cid, url, previewCid?, previewUrl?, mime, pages?, sha256, width?, height? }
 */
router.post('/api/ipfs/upload-media', upload.single('file'), async (req: Request, res: Response) => {
  try {
    console.log('=== IPFS Media Upload Started ===');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Missing file (field "file")' });
    }

    console.log('Media file:', {
      mimetype: req.file.mimetype,
      size: req.file.size,
      originalname: req.file.originalname
    });

    if (!ALLOWED_MEDIA_TYPES.has(req.file.mimetype)) {
      return res.status(415).json({ 
        error: `Unsupported media type: ${req.file.mimetype}`,
        allowed: Array.from(ALLOWED_MEDIA_TYPES)
      });
    }

    const PINATA_JWT = need('PINATA_JWT');
    const PINATA_GATEWAY = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';

    const isPdf = req.file.mimetype === 'application/pdf';
    let previewBuffer: Buffer | null = null;
    let previewMime: string | undefined;

    // Generate SVG preview for PDFs
    if (isPdf) {
      console.log('Generating SVG preview for PDF...');
      try {
        // Extract OCR fields from request body if provided
        const ocrFields = req.body ? JSON.parse(req.body.ocrFields || '{}') : {};
        
        const svgString = buildPdfPreviewSVG({
          institution: ocrFields.institution,
          student: ocrFields.student,
          course: ocrFields.course,
          issueDate: ocrFields.issueDate,
          width: 1200,
          height: 675
        });
        
        previewBuffer = Buffer.from(svgString, 'utf8');
        previewMime = 'image/svg+xml';
        console.log('SVG preview generated successfully');
      } catch (error: any) {
        console.error('SVG preview generation failed:', error);
        return res.status(422).json({ 
          error: 'Failed to generate SVG preview',
          details: error.message
        });
      }
    }

    // Compute SHA-256 hash of original file (returns 64 hex chars without 0x prefix)
    const sha256 = crypto.createHash('sha256').update(req.file.buffer).digest('hex');
    console.log('File SHA-256 (hex64):', sha256, 'length:', sha256.length);

    // Upload helper function
    async function uploadToIPFS(buffer: Buffer, filename: string, fileType: string) {
      const formData = new FormData();
      const blob = new Blob([buffer], { type: req.file!.mimetype });
      formData.append('file', blob, filename);

      const metadata = JSON.stringify({
        name: filename,
        keyvalues: {
          type: fileType,
          uploadedAt: new Date().toISOString()
        }
      });
      formData.append('pinataMetadata', metadata);

      const options = JSON.stringify({ cidVersion: 1 });
      formData.append('pinataOptions', options);

      const uploadRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${PINATA_JWT}` },
        body: formData
      });

      const uploadText = await uploadRes.text();
      if (!uploadRes.ok) {
        let errorDetails: any;
        try { errorDetails = JSON.parse(uploadText); } 
        catch { errorDetails = uploadText; }
        throw new Error(`Pinata upload failed: ${JSON.stringify(errorDetails)}`);
      }

      return JSON.parse(uploadText);
    }

    // Upload original file
    console.log('Uploading original file to Pinata...');
    const uploadData = await uploadToIPFS(
      req.file.buffer, 
      req.file.originalname, 
      isPdf ? 'certificate-pdf' : 'certificate-image'
    );
    const cid = uploadData.IpfsHash;
    const url = `https://${PINATA_GATEWAY}/ipfs/${cid}`;
    console.log('Original file uploaded:', cid);

    // Upload preview if PDF
    let previewCid: string | undefined;
    let previewUrl: string | undefined;
    if (previewBuffer) {
      console.log('Uploading SVG preview to Pinata...');
      const previewName = req.file.originalname.replace(/\.pdf$/i, '-preview.svg');
      const previewData = await uploadToIPFS(previewBuffer, previewName, 'certificate-preview');
      previewCid = previewData.IpfsHash;
      previewUrl = `https://${PINATA_GATEWAY}/ipfs/${previewCid}`;
      console.log('SVG preview uploaded:', previewCid);
    }

    console.log('=== IPFS Media Upload Completed ===');

    return res.json({
      ok: true,
      cid,
      url,
      ...(previewCid && { previewCid, previewUrl }),
      mime: req.file.mimetype,
      ...(previewMime && { previewMime }),
      sha256,
      size: uploadData.PinSize,
      timestamp: uploadData.Timestamp
    });

  } catch (error: any) {
    console.error('=== IPFS Media Upload ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('=== END ERROR ===');
    
    return res.status(500).json({ 
      ok: false,
      error: String(error?.message || error)
    });
  }
});

// Legacy endpoint for backward compatibility
router.post('/api/ipfs/upload-image', upload.single('file'), async (req: Request, res: Response) => {
  try {
    console.log('=== IPFS Image Upload (Legacy) - Redirecting to /upload-media ===');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Missing file (field "file")' });
    }

    const PINATA_JWT = need('PINATA_JWT');
    const PINATA_GATEWAY = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';

    // Create FormData for Pinata upload
    const formData = new FormData();
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    formData.append('file', blob, req.file.originalname);

    // Optional: Add metadata
    const metadata = JSON.stringify({
      name: req.file.originalname,
      keyvalues: {
        type: 'certificate-image',
        uploadedAt: new Date().toISOString()
      }
    });
    formData.append('pinataMetadata', metadata);

    const options = JSON.stringify({
      cidVersion: 1
    });
    formData.append('pinataOptions', options);

    console.log('Uploading to Pinata...');
    const uploadRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`
      },
      body: formData
    });

    const uploadText = await uploadRes.text();
    console.log('Pinata response status:', uploadRes.status);

    if (!uploadRes.ok) {
      let errorDetails: any;
      try {
        errorDetails = JSON.parse(uploadText);
      } catch {
        errorDetails = uploadText;
      }
      console.error('Pinata upload error:', errorDetails);
      return res.status(uploadRes.status).json({ 
        error: 'Pinata upload failed',
        details: errorDetails
      });
    }

    const uploadData = JSON.parse(uploadText);
    const ipfsHash = uploadData.IpfsHash;
    const ipfsUrl = `https://${PINATA_GATEWAY}/ipfs/${ipfsHash}`;

    console.log('Image uploaded successfully:', ipfsHash);
    console.log('=== IPFS Image Upload Completed ===');

    return res.json({
      ipfsHash,
      ipfsUrl,
      size: uploadData.PinSize,
      timestamp: uploadData.Timestamp
    });

  } catch (error: any) {
    console.error('=== IPFS Image Upload ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('=== END ERROR ===');
    
    return res.status(500).json({ 
      error: String(error?.message || error)
    });
  }
});

/**
 * POST /api/ipfs/upload-metadata
 * Upload JSON metadata to IPFS via Pinata
 * Body: JSON object with metadata
 * Returns: { ipfsHash: string, ipfsUrl: string }
 */
router.post('/api/ipfs/upload-metadata', async (req: Request, res: Response) => {
  try {
    console.log('=== IPFS Metadata Upload Started ===');
    
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Missing or invalid JSON body' });
    }

    console.log('Metadata keys:', Object.keys(req.body));

    const PINATA_JWT = need('PINATA_JWT');
    const PINATA_GATEWAY = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';

    // Validate ERC-721 metadata structure
    const metadata = req.body;
    if (!metadata.name || !metadata.description || !metadata.image) {
      return res.status(400).json({ 
        error: 'Invalid ERC-721 metadata: missing required fields (name, description, image)',
        received: Object.keys(metadata)
      });
    }

    // Create JSON blob
    const jsonString = JSON.stringify(metadata, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    const formData = new FormData();
    formData.append('file', blob, 'metadata.json');

    // Add Pinata metadata
    const pinataMetadata = JSON.stringify({
      name: `${metadata.name}-metadata.json`,
      keyvalues: {
        type: 'certificate-metadata',
        certificateId: metadata.attributes?.find((a: any) => a.trait_type === 'Certificate ID')?.value || 'unknown',
        uploadedAt: new Date().toISOString()
      }
    });
    formData.append('pinataMetadata', pinataMetadata);

    const options = JSON.stringify({
      cidVersion: 1
    });
    formData.append('pinataOptions', options);

    console.log('Uploading metadata to Pinata...');
    const uploadRes = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`
      },
      body: formData
    });

    const uploadText = await uploadRes.text();
    console.log('Pinata response status:', uploadRes.status);

    if (!uploadRes.ok) {
      let errorDetails: any;
      try {
        errorDetails = JSON.parse(uploadText);
      } catch {
        errorDetails = uploadText;
      }
      console.error('Pinata metadata upload error:', errorDetails);
      return res.status(uploadRes.status).json({ 
        error: 'Pinata metadata upload failed',
        details: errorDetails
      });
    }

    const uploadData = JSON.parse(uploadText);
    const ipfsHash = uploadData.IpfsHash;
    const ipfsUrl = `https://${PINATA_GATEWAY}/ipfs/${ipfsHash}`;

    console.log('Metadata uploaded successfully:', ipfsHash);
    console.log('=== IPFS Metadata Upload Completed ===');

    return res.json({
      ipfsHash,
      ipfsUrl,
      size: uploadData.PinSize,
      timestamp: uploadData.Timestamp
    });

  } catch (error: any) {
    console.error('=== IPFS Metadata Upload ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('=== END ERROR ===');
    
    return res.status(500).json({ 
      error: String(error?.message || error)
    });
  }
});

export default router;
