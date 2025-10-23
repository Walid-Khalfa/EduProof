import { Layout } from '@/components/Layout';
import Seo from '@/components/Seo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, AlertCircle, CheckCircle2, Loader2, X, Info, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useChainId, usePublicClient } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { useOCR, type OcrResult } from '@/hooks/useOCR';
import { useToast } from '@/hooks/use-toast';
import { eduProofCertificateAddress, eduProofCertificateABI, chainId } from '@/utils/chainConfig';
import { keccak256, toBytes, encodeAbiParameters, parseAbiParameters } from 'viem';
import { validateBytes32Fields, hexToBytes32, assertBytes32 } from '@/utils/bytes32';
import axios from 'axios';
import { Stepper } from '@/components/Stepper';
import { PreflightChecks } from '@/components/PreflightChecks';
import { UploadArea } from '@/components/UploadArea';
import { MintButton, type MintButtonState } from '@/components/MintButton';
import { MintSuccessModal } from '@/components/MintSuccessModal';
import { useMintFlowStore } from '@/stores/useMintFlowStore';
import { useNavigate } from 'react-router-dom';
import { copyToClipboard } from '@/utils/copyToClipboard';

export default function Index() {
  const { address, isConnected } = useAccount();
  
  // SEO for Mint page
  const seoProps = {
    title: 'Mint Certificate — EduProof',
    description: 'Create blockchain-verified academic certificates with AI-powered OCR extraction and IPFS storage.',
  };
  
  return (
    <Layout>
      <Seo {...seoProps} />
      <MintPageContent address={address} isConnected={isConnected} />
    </Layout>
  );
}

function MintPageContent({ address, isConnected }: { address: string | undefined; isConnected: boolean }) {
  const chainId = useChainId();
  const { toast } = useToast();
  const navigate = useNavigate();
  const runOCR = useOCR();
  
  // Zustand store
  const {
    file,
    fields,
    checks,
    steps,
    verificationScore,
    verificationUrl,
    ocrResult,
    fieldsConfirmed,
    isPdf,
    pdfPages,
    pdfPreviewCid,
    setFile,
    setField,
    setCheck,
    setStep,
    setOcrResult,
    setFieldsConfirmed,
    setPdfMetadata,
    resetFlow,
  } = useMintFlowStore();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [mintedData, setMintedData] = useState<{
    previewUrl: string;
    metadataUrl: string;
    etherscanUrl: string;
    txHash: string;
    tokenId?: string;
    verificationUrl: string | null;
    certSummary: { id: string; student: string; course: string; institution: string; issueDate: string };
    isPdf: boolean;
    pdfPreviewCid: string | null;
  } | null>(null);
  const [isMintingInProgress, setIsMintingInProgress] = useState(false);
  
  const ocrProvider = import.meta.env.VITE_OCR_PROVIDER ?? 'puter';

  // Sync checks with external state
  useEffect(() => {
    setCheck('walletConnected', isConnected);
  }, [isConnected, setCheck]);

  useEffect(() => {
    setCheck('onSepolia', chainId === sepolia.id);
  }, [chainId, setCheck]);

  useEffect(() => {
    setCheck('hasImage', !!file);
  }, [file, setCheck]);

  useEffect(() => {
    setCheck('institutionOk', !!fields.institution.trim());
  }, [fields.institution, setCheck]);

  useEffect(() => {
    setCheck('ocrConfidence', verificationScore !== null && verificationScore >= 70);
  }, [verificationScore, setCheck]);

  const validateForm = () => {
    const errors: string[] = [];
    
    if (!fields.studentName.trim()) {
      errors.push('Student name is required');
    } else if (fields.studentName.trim().length < 2) {
      errors.push('Student name must be at least 2 characters');
    }
    
    if (!fields.courseName.trim()) {
      errors.push('Course name is required');
    } else if (fields.courseName.trim().length < 3) {
      errors.push('Course name must be at least 3 characters');
    }
    
    if (!fields.institution.trim()) {
      errors.push('Institution name is required');
    } else if (fields.institution.trim().length < 3) {
      errors.push('Institution name must be at least 3 characters');
    }
    
    if (!fields.issueDate) {
      errors.push('Issue date is required');
    } else {
      const issueDate = new Date(fields.issueDate);
      const today = new Date();
      if (issueDate > today) {
        errors.push('Issue date cannot be in the future');
      }
    }
    
    return errors;
  };

  const handleFileChange = async (file: File) => {
    setFile(file);
    setFieldsConfirmed(false);
    
    // Check if PDF
    const isPdfFile = file.type === 'application/pdf';
    setPdfMetadata(isPdfFile);
    
    setStep('ocr', { status: 'active' });
    await performOCR(file);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setOcrResult(null, 0);
    setFieldsConfirmed(false);
    setPdfMetadata(false);
    setFileInputKey(Date.now());
    
    // Reset all steps
    setStep('ocr', { status: 'idle' });
    setStep('validation', { status: 'idle' });
    setStep('ipfs', { status: 'idle' });
    setStep('mint', { status: 'idle' });
    setStep('index', { status: 'idle' });
  };

  const performOCR = async (file: File) => {
    setIsProcessing(true);
    
    try {
      const result = await runOCR(file);
      setOcrResult(result, result.verification_score);
      
      // Auto-fill form fields
      setField('studentName', result.student_name || '');
      setField('courseName', result.course_name || '');
      setField('institution', result.institution || '');
      setField('issueDate', result.issue_date || '');

      setStep('ocr', { status: 'done' });
      setStep('validation', { status: 'active' });

      toast({
        title: '✓ OCR Complete',
        description: `Verification score: ${result.verification_score}/100. ${result.verification_score >= 70 ? 'Certificate verified successfully!' : 'Please review and confirm the extracted data.'}`,
        variant: result.verification_score >= 70 ? 'default' : 'destructive',
      });
    } catch (error: any) {
      console.error('OCR error:', error);
      const errorMessage = error.message || 'Failed to extract certificate data. Please try again.';
      
      setStep('ocr', { status: 'error', meta: errorMessage });
      
      toast({
        title: '✗ OCR Failed',
        description: errorMessage,
        variant: 'destructive',
      });
      
      setOcrResult({
        student_name: '',
        course_name: '',
        institution: '',
        issue_date: '',
        fields_confidence: {
          student_name: 0,
          course_name: 0,
          institution: 0,
          issue_date: 0,
        },
        verification_score: 0,
        verification_notes: errorMessage,
      }, 0);
    } finally {
      setIsProcessing(false);
    }
  };

  const { writeContract, data: hash, isPending: isMinting } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed, data: receipt } = useWaitForTransactionReceipt({ hash });
  const publicClient = usePublicClient();

  // Handle transaction confirmation and get tokenId from contract
  useEffect(() => {
    if (isConfirmed && receipt && publicClient && (window as any).__pendingMintTxHash) {
      const txHash = (window as any).__pendingMintTxHash;
      const pendingData = (window as any).__pendingMintData;
      
      // Clear pending data
      delete (window as any).__pendingMintTxHash;
      delete (window as any).__pendingMintData;
      
      // Pour la démo: skip tokenId extraction (devnet logs vides)
      const getTokenId = async (): Promise<string | null> => {
        console.log('[mint] ⚠️ Skipping tokenId extraction (devnet limitation - empty logs)');
        return null;
      };
      
      // 4. Index certificate in Supabase
      const indexCertificate = async () => {
        const tokenId = await getTokenId();
        
        setStep('index', { status: 'active' });
        toast({
          title: '💾 Step 4/4: Indexing certificate',
          description: 'Saving to database...',
        });
        try {
          const indexPayload = {
            institution: fields.institution,
            certId: `${fields.institution}-${Date.now()}`,
            owner: address,
            contract: eduProofCertificateAddress,
            chainId: chainId,
            imageCid: pendingData.imageCid,
            metaCid: pendingData.metaCid,
            txHash,
            tokenId: tokenId || undefined,
            tokenUri: pendingData.tokenURI,
            score: pendingData.verificationScore,
            ocrJson: {
              student_name: fields.studentName,
              course_name: fields.courseName,
              institution: fields.institution,
              issue_date: fields.issueDate,
            },
          };
          
          console.log('[mint] Indexing payload:', indexPayload);
          
          await axios.post(
            `${import.meta.env.VITE_API_URL}/api/certificates/index`,
            indexPayload,
            {
              headers: {
                'x-idempotency-key': pendingData.idempotencyKey,
              },
            }
          );
          
          // Success!
          await onMintSuccess({ 
            hash: txHash, 
            tokenUri: pendingData.tokenURI, 
            imageCid: pendingData.imageCid, 
            metaCid: pendingData.metaCid,
            tokenId: tokenId || undefined
          });
        } catch (indexError: any) {
          console.error('Indexing error:', indexError);
          
          // Check if it's a duplicate certificate error
          if (indexError?.response?.status === 409) {
            // Transaction succeeded on-chain but DB rejected duplicate
            setStep('index', { status: 'done' });
            setIsProcessing(false);
            setIsMintingInProgress(false);
            
            toast({
              title: '⚠️ Duplicate Detected',
              description: 'This certificate was already minted. The blockchain transaction succeeded but the certificate already exists in the database.',
              variant: 'default',
            });
            
            // Reset to initial state after showing message
            setTimeout(() => {
              resetFlow();
              setFileInputKey(Date.now());
            }, 3000);
            
            return;
          }
          
          // For other errors, still call success (indexing is non-critical)
          console.warn('Non-critical indexing error, proceeding with success');
          await onMintSuccess({ 
            hash: txHash, 
            tokenUri: pendingData.tokenURI, 
            imageCid: pendingData.imageCid, 
            metaCid: pendingData.metaCid,
            tokenId: tokenId || undefined
          });
        }
      };
      
      indexCertificate();
    }
  }, [isConfirmed, receipt, address, fields, toast, setStep]);

  // Check if certificate already exists
  const { data: certificateExists } = useReadContract({
    address: eduProofCertificateAddress,
    abi: eduProofCertificateABI,
    functionName: 'certificateExists',
    args: [
      fields.studentName,
      fields.courseName,
      fields.institution,
      fields.issueDate,
    ],
    query: {
      enabled: !!(fields.studentName && fields.courseName && fields.institution && fields.issueDate),
    },
  }) as { data: boolean | undefined };

  const ipfsToGateway = (uri: string) => {
    if (uri.startsWith('ipfs://')) {
      return `https://gateway.pinata.cloud/ipfs/${uri.replace('ipfs://', '')}`;
    }
    return uri;
  };

  const onMintSuccess = async (data: { hash: string; tokenUri: string; imageCid: string; metaCid: string; tokenId?: string }) => {
    const { hash, tokenUri, imageCid, metaCid, tokenId } = data;
    
    // Mark all steps as done
    setStep('mint', { status: 'done' });
    setStep('index', { status: 'done' });
    
    // Show success toast with links
    const etherscanUrl = `https://sepolia.etherscan.io/tx/${hash}`;
    
    toast({
      title: '🎉 Certificate Minted Successfully',
      description: (
        <div className="space-y-2 mt-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">Transaction:</span>
            <a 
              href={etherscanUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="text-blue-600 hover:text-blue-700 underline flex items-center gap-1"
            >
              View on Etherscan <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          {tokenUri && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Metadata:</span>
              <a 
                href={ipfsToGateway(tokenUri)} 
                target="_blank" 
                rel="noreferrer" 
                className="text-blue-600 hover:text-blue-700 underline flex items-center gap-1"
              >
                Open IPFS <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
          {imageCid && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Image:</span>
              <a 
                href={ipfsToGateway(`ipfs://${imageCid}`)} 
                target="_blank" 
                rel="noreferrer" 
                className="text-blue-600 hover:text-blue-700 underline flex items-center gap-1"
              >
                Open IPFS <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      ),
      duration: 8000,
    });
    
    // Prepare proof panel data
    setMintedData({
      previewUrl: ipfsToGateway(`ipfs://${imageCid}`),
      metadataUrl: tokenUri,
      etherscanUrl,
      txHash: hash,
      tokenId,
      verificationUrl: verificationUrl || null,
      certSummary: {
        id: `${fields.institution}-${Date.now()}`,
        student: fields.studentName,
        course: fields.courseName,
        institution: fields.institution,
        issueDate: fields.issueDate,
      },
      isPdf,
      pdfPreviewCid,
    });
    
    // Open success modal and hide processing state
    setIsProcessing(false);
    setSuccessModalOpen(true);
    
    // Re-enable minting
    setIsMintingInProgress(false);
  };

  const handleSuccessModalClose = (open: boolean) => {
    setSuccessModalOpen(open);
    
    // Reset flow when modal is closed
    if (!open) {
      resetFlow();
      setFileInputKey(Date.now());
      setIsProcessing(false);
      setMintedData(null);
      setIsMintingInProgress(false); // Re-enable minting after modal close
    }
  };

  const handleMint = async () => {
    // Prevent double-mint
    if (isMintingInProgress) {
      console.warn('[Mint] Already minting, ignoring duplicate request');
      toast({
        title: 'Minting in progress',
        description: 'Please wait for the current mint to complete',
        variant: 'destructive',
      });
      return;
    }

    if (!isConnected) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet first',
        variant: 'destructive',
      });
      return;
    }
    if (!file) {
      toast({
        title: 'No certificate',
        description: 'Please upload a certificate image',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate form fields
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      toast({
        title: 'Form validation failed',
        description: validationErrors[0],
        variant: 'destructive',
      });
      return;
    }
    
    if (verificationScore !== null && verificationScore < 70 && !fieldsConfirmed) {
      toast({
        title: 'Low verification score',
        description: 'Please confirm the fields are correct before minting',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicate certificate on-chain
    if (certificateExists) {
      toast({
        title: 'Certificate already exists on blockchain',
        description: 'A certificate with these exact details has already been minted on-chain',
        variant: 'destructive',
      });
      return;
    }

    // Check for duplicate certificate in database
    try {
      const dbCheckResponse = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/certificates/check-duplicate`,
        {
          owner: address,
          ocrJson: {
            student_name: fields.studentName,
            course_name: fields.courseName,
            institution: fields.institution,
            issue_date: fields.issueDate,
          },
        }
      );
      
      if (dbCheckResponse.data.exists) {
        toast({
          title: 'Certificate already exists in database',
          description: 'This certificate has already been indexed. Check "My Certificates" page.',
          variant: 'destructive',
        });
        return;
      }
    } catch (dbCheckError: any) {
      console.error('DB duplicate check error:', dbCheckError);
      // Continue with minting if DB check fails (non-critical)
    }

    // Set minting in progress
    setIsMintingInProgress(true);
    setIsProcessing(true);
    setStep('validation', { status: 'done' });
    setStep('ipfs', { status: 'active' });
    
    try {
      // 1. Upload media (image or PDF) to IPFS
      toast({
        title: `📤 Step 1/4: Uploading ${isPdf ? 'PDF' : 'image'} to IPFS`,
        description: isPdf ? 'Generating preview...' : 'Please wait...',
      });
      
      const mediaFormData = new FormData();
      mediaFormData.append('file', file);
      
      const mediaUploadResponse = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/ipfs/upload-media`,
        mediaFormData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      const uploadData = mediaUploadResponse.data;
      const imageCid = uploadData.cid;
      const imageUrl = uploadData.url;
      const previewCid = uploadData.previewCid;
      const previewUrl = uploadData.previewUrl;
      const mediaMime = uploadData.mime;
      const mediaPages = uploadData.pages;
      const fileSha256 = uploadData.sha256;
      
      // Update PDF metadata in store if applicable
      if (isPdf && mediaPages) {
        setPdfMetadata(true, mediaPages, previewCid);
      }

      // Generate idempotency key from file hash + owner + timestamp
      // Convert SHA-256 hex string to proper bytes32 format
      const fileSha256Bytes32 = hexToBytes32(fileSha256);
      
      // Validate bytes32 format
      assertBytes32(fileSha256Bytes32);
      
      const idempotencyData = encodeAbiParameters(
        parseAbiParameters('bytes32, address, uint256'),
        [fileSha256Bytes32, address as `0x${string}`, BigInt(Date.now())]
      );
      const idempotencyKey = keccak256(idempotencyData);
      
      // Debug logs (dev only)
      if (import.meta.env.DEV) {
        console.log('[mint] File hash validation:', {
          originalSha256: fileSha256,
          bytes32Format: fileSha256Bytes32,
          length: fileSha256Bytes32.length,
          isValid: fileSha256Bytes32.length === 66
        });
      }
      
      // 2. Create and upload metadata to IPFS
      toast({
        title: '📝 Step 2/4: Creating metadata',
        description: 'Uploading to IPFS...',
      });
      
      const metadata = {
        name: `${fields.courseName} Certificate`,
        description: `Certificate awarded to ${fields.studentName} by ${fields.institution}`,
        image: previewUrl || imageUrl, // Use preview for PDFs, original for images
        attributes: [
          { trait_type: 'Student Name', value: fields.studentName },
          { trait_type: 'Course Name', value: fields.courseName },
          { trait_type: 'Institution', value: fields.institution },
          { trait_type: 'Issue Date', value: fields.issueDate },
          { trait_type: 'Verification Score', value: verificationScore?.toString() || '0' },
          ...(isPdf ? [{ trait_type: 'Media Type', value: 'PDF' }] : []),
          ...(mediaPages ? [{ trait_type: 'Pages', value: mediaPages.toString() }] : []),
        ],
      };
      
      const metadataUploadResponse = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/ipfs/upload-metadata`,
        metadata
      );
      
      const tokenURI = metadataUploadResponse.data.ipfsUrl;
      const metaCid = metadataUploadResponse.data.ipfsHash;
      
      setStep('ipfs', { status: 'done' });
      setStep('mint', { status: 'active' });
      
      // 3. Mint NFT on blockchain
      toast({
        title: '⛓️ Step 3/4: Minting NFT',
        description: 'Please confirm the transaction in your wallet...',
      });
      
      // Validate and truncate fields to fit bytes32 (31 bytes max)
      const safeFields = validateBytes32Fields({
        studentName: fields.studentName,
        courseName: fields.courseName,
        institution: fields.institution,
        issueDate: fields.issueDate,
      });
      
      const studentHash = keccak256(toBytes(safeFields.studentName));
      
      // Validate studentHash is bytes32
      assertBytes32(studentHash);
      
      // Debug logs (dev only)
      if (import.meta.env.DEV) {
        console.log('[mint] Contract arguments:', {
          to: address,
          tokenURI: tokenURI.substring(0, 50) + '...',
          studentHash,
          studentHashLength: studentHash.length,
          safeFields,
          allFieldsValid: Object.values(safeFields).every(f => f.length <= 31)
        });
      }
      
      writeContract(
        {
          address: eduProofCertificateAddress,
          abi: eduProofCertificateABI,
          functionName: 'safeMint',
          args: [
            address,
            tokenURI,
            studentHash,
            safeFields.studentName,
            safeFields.courseName,
            safeFields.institution,
            safeFields.issueDate,
          ],
        },
        {
          onSuccess: async (txHash) => {
            console.log('Transaction hash:', txHash);
            
            // Wait for confirmation
            toast({
              title: '⏳ Waiting for confirmation...',
              description: 'Transaction submitted, waiting for blockchain confirmation',
            });
            
            // Store txHash for later use in useEffect
            (window as any).__pendingMintTxHash = txHash;
            (window as any).__pendingMintData = {
              tokenURI,
              imageCid,
              metaCid,
              idempotencyKey,
              verificationScore,
              mediaMime,
              mediaPages,
              previewCid,
            };
          },
          onError: (error) => {
            console.error('Minting error:', error);
            
            setStep('mint', { status: 'error', meta: error.message });
            
            let errorTitle = 'Minting Failed';
            let errorDescription = 'An unexpected error occurred';
            
            const errorMessage = error?.message || '';
            
            if (errorMessage.includes('User rejected') || errorMessage.includes('User denied')) {
              errorTitle = 'Transaction Rejected';
              errorDescription = 'You rejected the transaction in your wallet';
            } else if (errorMessage.includes('certificate already exists')) {
              errorTitle = 'Certificate Already Registered';
              errorDescription = 'This certificate has already been registered on the blockchain';
            } else {
              errorDescription = errorMessage;
            }
            
            toast({
              title: errorTitle,
              description: errorDescription,
              variant: 'destructive',
            });
            
            setIsProcessing(false);
            setIsMintingInProgress(false);
          },
        }
      );
    } catch (error: any) {
      console.error('Minting error:', error);
      
      setStep('ipfs', { status: 'error', meta: error.message });
      
      let errorTitle = 'Minting Failed';
      let errorDescription = 'An unexpected error occurred';
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 500) {
          errorTitle = 'Server Error';
          errorDescription = data?.error || data?.message || 'The server encountered an error. Please try again.';
        } else if (status === 400) {
          errorTitle = 'Invalid Request';
          errorDescription = data?.error || data?.message || 'Please check your certificate details and try again.';
        } else if (status === 401 || status === 403) {
          errorTitle = 'Authentication Error';
          errorDescription = 'Service authentication failed. Please contact support.';
        } else {
          errorDescription = data?.error || data?.message || `Server returned error ${status}`;
        }
      } else if (error.request) {
        errorTitle = 'Network Error';
        errorDescription = 'Unable to reach the server. Please check your connection and try again.';
      } else if (error.message) {
        errorDescription = error.message;
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: 'destructive',
      });
      
      setIsProcessing(false);
      setIsMintingInProgress(false);
    }
  };

  // Calculate stepper current step based on store
  const getCurrentStep = (): 1 | 2 | 3 | 4 | 5 => {
    if (steps.index.status === 'done') return 5;
    if (steps.mint.status === 'active' || steps.mint.status === 'done') return 4;
    if (steps.ipfs.status === 'active' || steps.ipfs.status === 'done') return 3;
    if (steps.validation.status === 'active' || steps.validation.status === 'done') return 2;
    if (steps.ocr.status === 'active' || steps.ocr.status === 'done') return 1;
    return 1;
  };

  // Calculate mint button state
  const getMintButtonState = (): MintButtonState => {
    if (steps.ipfs.status === 'active') return 'ipfs';
    if (steps.mint.status === 'active' || isMinting) return 'wallet';
    if (isConfirming) return 'confirm';
    if (steps.index.status === 'active') return 'indexing';
    if (steps.index.status === 'done') return 'done';
    return 'idle';
  };

  return (
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/20 dark:to-fuchsia-950/20 p-12 mb-8 border border-violet-100 dark:border-violet-900">
          <div className="relative z-10 text-center">
            <h1 className="text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">Mint Your Certificate</h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Transform your educational achievements into verified blockchain certificates with AI-powered validation
            </p>
          </div>
        </div>

        {/* Stepper */}
        {file && (
          <div className="mb-8">
            <Stepper current={getCurrentStep()} />
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="md:col-span-2">
            <Card className="shadow-lg border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 backdrop-blur-sm">
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl">Certificate Details</CardTitle>
                <CardDescription className="text-base">
                  Upload your certificate and fill in the required information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* File Upload */}
                <div className="space-y-2">
                  <Label htmlFor="certificate">Certificate {isPdf ? 'PDF' : 'Image'} *</Label>
                  <UploadArea
                    key={fileInputKey}
                    onFile={handleFileChange}
                    value={file || undefined}
                    loading={isProcessing}
                    isPdf={isPdf}
                    pdfPages={pdfPages || undefined}
                    pdfPreviewCid={pdfPreviewCid}
                  />
                  {file && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveFile}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={isProcessing}
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove file
                    </Button>
                  )}
                </div>

                {/* OCR Provider Badge */}
                {file && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      OCR Provider: {ocrProvider === 'puter' ? 'Puter (Demo)' : 'Server (HF)'}
                    </Badge>
                  </div>
                )}

                {/* AI Processing Indicator */}
                {isProcessing && steps.ocr.status === 'active' && (
                  <Alert className="border-blue-200 bg-blue-50/50">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <div className="space-y-1">
                        <p className="font-medium">Processing certificate with AI-OCR...</p>
                        <p className="text-xs text-blue-600">This may take 10-30 seconds. Please wait.</p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Verification Score */}
                {verificationScore !== null && (
                  <div className="space-y-3">
                    <Alert className={verificationScore >= 70 ? 'border-green-500 bg-green-50/50' : 'border-amber-500 bg-amber-50/50'}>
                      {verificationScore >= 70 ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                      )}
                      <AlertDescription className={verificationScore >= 70 ? 'text-green-800 font-medium' : 'text-amber-800 font-medium'}>
                        <div className="space-y-2">
                          <p>
                            Verification Score: {verificationScore}/100
                            {verificationScore >= 70 ? ' - Certificate verified successfully' : ' - Please review and confirm fields'}
                          </p>
                          {verificationUrl && (
                            <div className="flex items-center gap-2 text-sm pt-1">
                              <a 
                                href={verificationUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-sky-600 hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Open verification page
                              </a>
                              <button
                                type="button"
                                onClick={async () => {
                                  const success = await copyToClipboard(verificationUrl);
                                  if (success) {
                                    toast({ title: 'URL copied', description: 'Verification URL copied to clipboard' });
                                  } else {
                                    toast({ 
                                      title: 'Copy failed', 
                                      description: 'Failed to copy URL',
                                      variant: 'destructive'
                                    });
                                  }
                                }}
                                className="text-xs px-2 py-1 rounded border border-sky-300 hover:bg-sky-50 transition-colors"
                              >
                                Copy URL
                              </button>
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                    
                    {verificationScore < 70 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFieldsConfirmed(true)}
                        className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                      >
                        {fieldsConfirmed ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Fields Confirmed
                          </>
                        ) : (
                          'Confirm Fields Are Correct'
                        )}
                      </Button>
                    )}

                    {ocrResult?.verification_notes && (
                      <p className="text-xs text-slate-600 italic">
                        Note: {ocrResult.verification_notes}
                      </p>
                    )}
                  </div>
                )}

                {/* Form Fields */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="studentName">Student Name *</Label>
                      {ocrResult?.student_name && (
                        <Badge variant="secondary" className="bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-xs">
                          AI-extracted
                        </Badge>
                      )}
                    </div>
                    <Input
                      id="studentName"
                      value={fields.studentName}
                      onChange={(e) => setField('studentName', e.target.value)}
                      placeholder="Enter student name"
                      required
                      className={!fields.studentName.trim() && file ? 'border-red-300' : ''}
                    />
                    {!fields.studentName.trim() && file && (
                      <p className="text-xs text-red-600">Student name is required</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="courseName">Course Name *</Label>
                      {ocrResult?.course_name && (
                        <Badge variant="secondary" className="bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-xs">
                          AI-extracted
                        </Badge>
                      )}
                    </div>
                    <Input
                      id="courseName"
                      value={fields.courseName}
                      onChange={(e) => setField('courseName', e.target.value)}
                      placeholder="Enter course name"
                      required
                      className={!fields.courseName.trim() && file ? 'border-red-300' : ''}
                    />
                    {!fields.courseName.trim() && file && (
                      <p className="text-xs text-red-600">Course name is required</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="institution">Issuing Institution *</Label>
                      {ocrResult?.institution && (
                        <Badge variant="secondary" className="bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-xs">
                          AI-extracted
                        </Badge>
                      )}
                    </div>
                    <Input
                      id="institution"
                      value={fields.institution}
                      onChange={(e) => setField('institution', e.target.value)}
                      placeholder="Enter institution name"
                      required
                      className={!fields.institution.trim() && file ? 'border-red-300' : ''}
                    />
                    {!fields.institution.trim() && file && (
                      <p className="text-xs text-red-600">Institution name is required</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="issueDate">Issue Date *</Label>
                      {ocrResult?.issue_date && (
                        <Badge variant="secondary" className="bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-xs">
                          AI-extracted
                        </Badge>
                      )}
                    </div>
                    <Input
                      id="issueDate"
                      type="date"
                      value={fields.issueDate}
                      onChange={(e) => setField('issueDate', e.target.value)}
                      required
                      max={new Date().toISOString().split('T')[0]}
                      className={!fields.issueDate && file ? 'border-red-300' : ''}
                    />
                    {!fields.issueDate && file && (
                      <p className="text-xs text-red-600">Issue date is required</p>
                    )}
                  </div>
                </div>

                {/* Duplicate Warning */}
                {certificateExists && fields.studentName && fields.courseName && fields.institution && fields.issueDate && (
                  <Alert className="border-red-500 bg-red-50/50">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <AlertDescription className="text-red-800 font-medium">
                      This certificate already exists on the blockchain. Duplicate certificates cannot be minted.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Mint Button */}
                <MintButton
                  state={getMintButtonState()}
                  disabled={
                    !isConnected || 
                    isProcessing || 
                    isMintingInProgress ||
                    !file || 
                    certificateExists === true ||
                    (verificationScore !== null && verificationScore < 70 && !fieldsConfirmed)
                  }
                  onClick={handleMint}
                />
              </CardContent>
            </Card>
          </div>

          {/* Pre-flight Checks */}
          <div className="md:col-span-1">
            <PreflightChecks
              imageOk={checks.hasImage}
              walletOk={checks.walletConnected}
              institutionOk={checks.institutionOk}
              scoreOk={checks.ocrConfidence}
              networkOk={checks.onSepolia}
            />
          </div>
        </div>

        {/* Success Modal */}
        {mintedData && (
          <MintSuccessModal
            open={successModalOpen}
            onOpenChange={handleSuccessModalClose}
            previewUrl={mintedData.previewUrl}
            metadataUrl={mintedData.metadataUrl}
            etherscanUrl={mintedData.etherscanUrl}
            txHash={mintedData.txHash}
            tokenId={mintedData.tokenId}
            verificationUrl={mintedData.verificationUrl}
            certSummary={mintedData.certSummary}
            isPdf={mintedData.isPdf}
            pdfPreviewCid={mintedData.pdfPreviewCid}
          />
        )}
      </div>
  );
}
