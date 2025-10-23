import { Layout } from '@/components/Layout';
import Seo from '@/components/Seo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, ExternalLink, Calendar, Building2, Loader2, AlertCircle } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { SkeletonCard } from '@/components/SkeletonCard';
import { CopyField } from '@/components/CopyField';
import { getEtherscanUrl } from '@/components/EtherscanLink';
import { eduProofCertificateAddress } from '@/utils/chainConfig';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Certificate {
  id: string;
  cert_id: string;
  token_id: string;
  image_cid: string;
  meta_cid: string;
  tx_hash: string;
  score: number;
  created_at: string;
  ocr_json: {
    student_name: string;
    course_name: string;
    institution: string;
    issue_date: string;
  };
  institutions: {
    name: string;
    verified: boolean;
  };
}

export default function MyCertificates() {
  return (
    <Layout>
      <Seo 
        title="My Certificates — EduProof"
        description="View and manage your blockchain-verified academic certificates."
      />
      <MyCertificatesContent />
    </Layout>
  );
}

function MyCertificatesContent() {
  const { address, isConnected } = useAccount();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && address) {
      fetchCertificates();
    }
  }, [isConnected, address]);

  const fetchCertificates = async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/certificates/owner/${address}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch certificates');
      }

      setCertificates(data.certificates || []);
    } catch (err: any) {
      console.error('Error fetching certificates:', err);
      setError(err.message || 'Failed to load certificates');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/20 dark:to-fuchsia-950/20 p-12 mb-8 border border-violet-100 dark:border-violet-900">
            <div className="relative z-10 text-center">
              <h1 className="text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">My Certificates</h1>
              <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
                View and manage your NFT certificates
              </p>
            </div>
          </div>
          <Card className="shadow-lg border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 backdrop-blur-sm">
            <CardContent className="py-16 text-center">
              <Award className="w-16 h-16 mx-auto mb-4 text-slate-400 dark:text-slate-500" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Connect Your Wallet</h2>
              <p className="text-slate-600 dark:text-slate-300 mb-4">
                Please connect your wallet to view your certificates
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/20 dark:to-fuchsia-950/20 p-12 mb-8 border border-violet-100 dark:border-violet-900">
            <div className="relative z-10 text-center">
              <h1 className="text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">My Certificates</h1>
              <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
                View and manage your NFT certificates
              </p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
      <div className="max-w-6xl mx-auto">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/20 dark:to-fuchsia-950/20 p-12 mb-8 border border-violet-100 dark:border-violet-900">
          <div className="relative z-10 text-center">
            <h1 className="text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">My Certificates</h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              View and manage your NFT certificates
            </p>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 border-red-500 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {certificates.length === 0 ? (
          <Card className="shadow-lg border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 backdrop-blur-sm">
            <CardContent className="py-16 text-center">
              <Award className="w-16 h-16 mx-auto mb-4 text-slate-400 dark:text-slate-500" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No Certificates Yet</h3>
              <p className="text-slate-600 dark:text-slate-300 mb-4">
                You haven't minted any certificates yet
              </p>
              <Link to="/">
                <Button>Mint Your First Certificate</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {certificates.map((cert) => (
              <Card key={cert.id} className="hover:shadow-lg transition-shadow shadow-md border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="default">Active</Badge>
                    <span className="text-xs text-slate-500">#{cert.token_id || 'Pending'}</span>
                  </div>
                  <CardTitle className="text-lg">{cert.ocr_json?.course_name || 'N/A'}</CardTitle>
                  <CardDescription>{cert.ocr_json?.student_name || 'N/A'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Certificate Image Preview */}
                  {cert.image_cid && (
                    <div className="aspect-video bg-slate-100 rounded-lg overflow-hidden">
                      <img
                        src={`https://gateway.pinata.cloud/ipfs/${cert.image_cid}`}
                        alt={cert.ocr_json?.course_name || 'Certificate'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Building2 className="w-4 h-4" />
                      <span>{cert.institutions.name}</span>
                      {cert.institutions.verified && (
                        <Badge variant="secondary" className="text-xs">Verified</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="w-4 h-4" />
                      <span>{cert.ocr_json?.issue_date ? new Date(cert.ocr_json.issue_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Award className="w-4 h-4" />
                      <span className="font-medium">ID: {cert.cert_id}</span>
                    </div>
                  </div>

                  {cert.score && (
                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-slate-600">Verification Score</span>
                        <span className="font-semibold text-green-600">{cert.score}/100</span>
                      </div>
                    </div>
                  )}

                  {/* On-Chain Links */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-2">
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">On-Chain</p>
                    {cert.token_id && (
                      <CopyField
                        label="Token ID"
                        value={cert.token_id}
                        link={getEtherscanUrl('token', '', cert.token_id, eduProofCertificateAddress)}
                        linkLabel="View NFT"
                        monospace
                      />
                    )}
                    {cert.tx_hash && (
                      <CopyField
                        label="Transaction"
                        value={cert.tx_hash}
                        link={getEtherscanUrl('tx', cert.tx_hash)}
                        linkLabel="View TX"
                        monospace
                        shortened
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
  );
}
