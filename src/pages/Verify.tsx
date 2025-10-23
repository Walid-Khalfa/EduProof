import { Layout } from '@/components/Layout';
import Seo from '@/components/Seo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Search, Calendar, Building2, Award, ExternalLink, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { eduProofCertificateAddress, eduProofCertificateABI } from '@/utils/chainConfig';
import { useToast } from '@/hooks/use-toast';
import { SkeletonCard } from '@/components/SkeletonCard';
import { CopyField } from '@/components/CopyField';
import { getEtherscanUrl } from '@/components/EtherscanLink';
import { useSearchParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Certificate {
  cert_id: string;
  institution_id: string;
  student_name: string;
  course_name: string;
  issue_date: string;
  token_id: string;
  ipfs_image_hash: string;
  ipfs_metadata_hash: string;
  tx_hash: string;
  minter_address: string;
  verification_score: number;
  created_at: string;
  institutions: {
    name: string;
    verified: boolean;
  };
}

export default function Verify() {
  return (
    <Layout>
      <Seo 
        title="Verify Certificate — EduProof"
        description="Verify the authenticity of blockchain-backed academic certificates on-chain."
      />
      <VerifyPageContent />
    </Layout>
  );
}

function VerifyPageContent() {
  const [searchParams] = useSearchParams();
  const [searchType, setSearchType] = useState<'tokenId' | 'certId'>('certId');
  const [tokenId, setTokenId] = useState('');
  const [certId, setCertId] = useState('');
  const [institution, setInstitution] = useState('');
  const [verificationResult, setVerificationResult] = useState<Certificate | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const { toast } = useToast();

  // Auto-fill from URL params
  useEffect(() => {
    const urlTokenId = searchParams.get('tokenId');
    if (urlTokenId) {
      setTokenId(urlTokenId);
      setSearchType('tokenId');
    }
  }, [searchParams]);

  const handleVerify = async () => {
    setVerificationResult(null);
    setNotFound(false);

    if (searchType === 'certId') {
      if (!certId || !institution) {
        toast({
          title: 'Missing Information',
          description: 'Please enter both Certificate ID and Institution name',
          variant: 'destructive',
        });
        return;
      }
    } else {
      if (!tokenId) {
        toast({
          title: 'Missing Information',
          description: 'Please enter a Token ID',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsVerifying(true);

    try {
      // Search in database first
      let url = `${API_URL}/api/certificates/verify?`;
      if (searchType === 'certId') {
        url += `certId=${encodeURIComponent(certId)}&institution=${encodeURIComponent(institution)}`;
      } else {
        // Search by tokenId - backend will query by contract + token_id
        url += `contract=${encodeURIComponent(eduProofCertificateAddress)}&tokenId=${encodeURIComponent(tokenId)}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed');
      }

      if (data.found && data.certificate) {
        setVerificationResult(data.certificate);
        toast({
          title: 'Certificate Found',
          description: 'Certificate verified successfully',
        });
      } else {
        setNotFound(true);
        toast({
          title: 'Not Found',
          description: 'Certificate not found in database. It may not have been minted yet.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      toast({
        title: 'Verification Error',
        description: error.message || 'Failed to verify certificate',
        variant: 'destructive',
      });
      setNotFound(true);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
      <div className="max-w-4xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/20 dark:to-fuchsia-950/20 p-12 mb-8 border border-violet-100 dark:border-violet-900">
          <div className="relative z-10 text-center">
            <h1 className="text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">Verify Certificate</h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Check the authenticity and status of any certificate on the blockchain
            </p>
          </div>
        </div>

        <Card className="mb-8 shadow-lg border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Enter Certificate Details</CardTitle>
            <CardDescription className="text-base">
              Search by Certificate ID or Token ID to verify authenticity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Type Selector */}
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <button
                onClick={() => setSearchType('certId')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  searchType === 'certId'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Certificate ID
              </button>
              <button
                onClick={() => setSearchType('tokenId')}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  searchType === 'tokenId'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Token ID
              </button>
            </div>

            {/* Certificate ID Search */}
            {searchType === 'certId' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="certId">Certificate ID</Label>
                  <Input
                    id="certId"
                    value={certId}
                    onChange={(e) => setCertId(e.target.value)}
                    placeholder="e.g., CERT-2024-001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="institution">Institution Name</Label>
                  <Input
                    id="institution"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="e.g., Coursera"
                  />
                </div>
              </div>
            )}

            {/* Token ID Search */}
            {searchType === 'tokenId' && (
              <div className="space-y-2">
                <Label htmlFor="tokenId">Token ID</Label>
                <Input
                  id="tokenId"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  placeholder="Enter token ID (e.g., 1, 2, 3...)"
                  type="number"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Find your Token ID in the success modal after minting, or in My Certificates page
                </p>
              </div>
            )}

            <Button onClick={handleVerify} disabled={isVerifying} className="w-full">
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Verify Certificate
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Not Found Alert */}
        {notFound && (
          <Alert className="mb-8 border-red-500 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Certificate not found. Please check your search criteria and try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Loading Skeleton */}
        {isVerifying && (
          <SkeletonCard />
        )}

        {/* Verification Result */}
        {verificationResult && !isVerifying && (
          <Card className="shadow-lg border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Verification Result</CardTitle>
                <Badge variant="default" className="text-base px-4 py-1">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Verified
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status Alert */}
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  This certificate is valid and has been verified on the blockchain.
                </AlertDescription>
              </Alert>

              {/* Certificate Details */}
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-500 dark:text-slate-400">Certificate ID</Label>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{verificationResult.cert_id}</p>
                  </div>
                  {verificationResult.token_id && (
                    <div>
                      <Label className="text-slate-500 dark:text-slate-400">Token ID</Label>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">#{verificationResult.token_id}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-slate-500">Student Name</Label>
                    <p className="font-semibold text-slate-900">{verificationResult.student_name}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Course Name</Label>
                    <p className="font-semibold text-slate-900">{verificationResult.course_name}</p>
                  </div>
                  <div>
                    <Label className="text-slate-500">Institution</Label>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <p className="font-semibold text-slate-900">{verificationResult.institutions.name}</p>
                      {verificationResult.institutions.verified && (
                        <Badge variant="default" className="text-xs">Verified</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-500">Issue Date</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      <p className="font-semibold text-slate-900">
                        {new Date(verificationResult.issue_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {verificationResult.verification_score && (
                    <div>
                      <Label className="text-slate-500">Verification Score</Label>
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-green-600" />
                        <p className="font-semibold text-green-600">{verificationResult.verification_score}/100</p>
                      </div>
                    </div>
                  )}
                  <div>
                    <Label className="text-slate-500">Minted By</Label>
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded block truncate">
                      {verificationResult.minter_address}
                    </code>
                  </div>
                </div>

                {/* On-Chain Data */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">On-Chain Data</h3>
                  <div className="space-y-2">
                    {verificationResult.token_id && (
                      <CopyField
                        label="Token ID"
                        value={verificationResult.token_id}
                        link={getEtherscanUrl('token', '', verificationResult.token_id, eduProofCertificateAddress)}
                        linkLabel="View NFT"
                        monospace
                      />
                    )}
                    {verificationResult.tx_hash && (
                      <CopyField
                        label="Transaction Hash"
                        value={verificationResult.tx_hash}
                        link={getEtherscanUrl('tx', verificationResult.tx_hash)}
                        linkLabel="View TX"
                        monospace
                        shortened
                      />
                    )}
                    {verificationResult.ipfs_metadata_hash && (
                      <CopyField
                        label="Metadata IPFS"
                        value={verificationResult.ipfs_metadata_hash}
                        link={`https://gateway.pinata.cloud/ipfs/${verificationResult.ipfs_metadata_hash}`}
                        linkLabel="View JSON"
                        monospace
                        shortened
                      />
                    )}
                    {verificationResult.ipfs_image_hash && (
                      <CopyField
                        label="Image IPFS"
                        value={verificationResult.ipfs_image_hash}
                        link={`https://gateway.pinata.cloud/ipfs/${verificationResult.ipfs_image_hash}`}
                        linkLabel="View Image"
                        monospace
                        shortened
                      />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        {!verificationResult && !isVerifying && (
          <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <CheckCircle2 className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">How Verification Works</h3>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Search by Certificate ID + Institution or Token ID</li>
                    <li>• We check our database and blockchain for authenticity</li>
                    <li>• View complete certificate details and metadata</li>
                    <li>• Access IPFS-stored certificate images and data</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
  );
}
