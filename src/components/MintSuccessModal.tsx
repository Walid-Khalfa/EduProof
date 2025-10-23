import { ExternalLink, Copy, Check, FileJson, Share2, Loader2, X, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { buildProofMarkdown, fetchMetadataJSON, openAllLinks, buildProxyPreviewUrl, ipfsToGateway, checkProxyPreview } from '@/utils/share';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard } from '@/utils/copyToClipboard';
import { CopyField } from '@/components/CopyField';
import { getEtherscanUrl } from '@/components/EtherscanLink';
import { eduProofCertificateAddress } from '@/utils/chainConfig';

interface MintSuccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewUrl: string;
  metadataUrl: string;
  etherscanUrl: string;
  txHash: string;
  tokenId?: string;
  verificationUrl?: string | null | undefined;
  certSummary: {
    id: string;
    student: string;
    course: string;
    institution: string;
    issueDate?: string;
  };
  isPdf?: boolean;
  pdfPreviewCid?: string | null;
}

interface LinkItemProps {
  label: string;
  url: string;
  description: string;
}

function LinkItem({ label, url, description }: LinkItemProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy link',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100/50 dark:hover:bg-slate-800/80 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-slate-900 dark:text-slate-100">{label}</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{description}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline break-all flex items-center gap-1"
        >
          <ExternalLink className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{url}</span>
        </a>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="flex-shrink-0 h-8 w-8 p-0"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-600" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </Button>
    </div>
  );
}

export function MintSuccessModal({
  open,
  onOpenChange,
  previewUrl,
  metadataUrl,
  etherscanUrl,
  txHash,
  tokenId: propTokenId,
  verificationUrl,
  certSummary,
  isPdf = false,
  pdfPreviewCid = null,
}: MintSuccessModalProps) {
  const { toast } = useToast();
  const [metadata, setMetadata] = useState<any>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [copyingProofLinks, setCopyingProofLinks] = useState(false);
  const [copyingJSON, setCopyingJSON] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState(false);
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [fetchingTokenId, setFetchingTokenId] = useState(false);

  // Load preview image
  useEffect(() => {
    if (!open) return;

    const loadPreview = async () => {
      setPreviewLoading(true);
      setPreviewError(false);

      try {
        // For PDFs, use the preview CID if available
        if (isPdf && pdfPreviewCid) {
          const pdfPreviewUrl = ipfsToGateway(`ipfs://${pdfPreviewCid}`);
          setPreviewImageUrl(pdfPreviewUrl);
        } else {
          // For images, use the preview URL directly
          setPreviewImageUrl(previewUrl);
        }
      } catch (err) {
        console.error('Preview load error:', err);
        setPreviewError(true);
      } finally {
        setPreviewLoading(false);
      }
    };

    loadPreview();
  }, [open, previewUrl, isPdf, pdfPreviewCid]);

  // Fetch tokenId from backend if not provided via props
  useEffect(() => {
    if (!open || !txHash) return;
    
    // If tokenId is already provided via props, use it
    if (propTokenId) {
      setTokenId(propTokenId);
      return;
    }

    const fetchTokenId = async () => {
      setFetchingTokenId(true);
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const response = await fetch(`${API_URL}/api/certificates/verify?txHash=${txHash}`);
        const data = await response.json();
        
        if (data.found && data.certificate?.token_id) {
          setTokenId(data.certificate.token_id);
        }
      } catch (err) {
        console.error('Failed to fetch tokenId:', err);
      } finally {
        setFetchingTokenId(false);
      }
    };

    fetchTokenId();
  }, [open, txHash, propTokenId]);

  const handleCopyProofLinks = async () => {
    setCopyingProofLinks(true);
    try {
      const markdown = buildProofMarkdown({
        previewUrl,
        metadataUrl,
        etherscanUrl,
        verificationUrl,
        isPdf,
        pdfPreviewCid,
      });
      const success = await copyToClipboard(markdown);
      if (!success) throw new Error('Clipboard operation failed');
      toast({
        title: 'Copied!',
        description: 'Proof links copied to clipboard in Markdown format',
      });
    } catch (err: any) {
      toast({
        title: 'Copy failed',
        description: err?.message ?? 'Failed to copy proof links',
        variant: 'destructive',
      });
    } finally {
      setCopyingProofLinks(false);
    }
  };

  const handleCopyJSON = async () => {
    setCopyingJSON(true);
    try {
      let json = metadata;
      if (!json) {
        setLoadingMetadata(true);
        json = await fetchMetadataJSON(metadataUrl);
        setMetadata(json);
        setLoadingMetadata(false);
      }
      const success = await copyToClipboard(JSON.stringify(json, null, 2));
      if (!success) throw new Error('Clipboard operation failed');
      toast({
        title: 'Copied!',
        description: 'JSON metadata copied to clipboard',
      });
    } catch (err: any) {
      toast({
        title: 'Copy failed',
        description: err?.message ?? 'Failed to copy JSON',
        variant: 'destructive',
      });
      setLoadingMetadata(false);
    } finally {
      setCopyingJSON(false);
    }
  };

  const handleOpenAll = () => {
    const urls = [previewUrl, metadataUrl, etherscanUrl];
    if (verificationUrl) urls.push(verificationUrl);
    
    let opened = 0;
    urls.forEach((url) => {
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (win) opened++;
    });
    
    if (opened < urls.length) {
      toast({
        title: 'Popup blocked',
        description: 'Your browser blocked some popups. Please allow popups for this site and try again.',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Opening links',
        description: `${opened} proof links opened in new tabs`,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Check className="w-6 h-6 text-green-600" />
            Certificate Minted Successfully
          </DialogTitle>
          <DialogDescription>
            Your certificate has been successfully minted on the blockchain
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Certificate Preview */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Certificate Preview</h3>
            <div className="relative w-full aspect-[4/3] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden">
              {previewLoading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : previewError || !previewImageUrl ? (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                    <p className="text-sm">Preview unavailable</p>
                  </div>
                </div>
              ) : (
                <img
                  src={previewImageUrl}
                  alt="Certificate preview"
                  className="w-full h-full object-contain"
                  onError={() => setPreviewError(true)}
                />
              )}
            </div>
          </div>

          {/* Certificate Details */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Certificate Details</h3>
            <div className="grid grid-cols-2 gap-3 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Student</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{certSummary.student}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Course</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{certSummary.course}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Institution</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{certSummary.institution}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Issue Date</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{certSummary.issueDate || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* On-Chain Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">On-Chain Information</h3>
            <div className="space-y-2">
              {fetchingTokenId ? (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">Fetching Token ID...</span>
                </div>
              ) : tokenId ? (
                <CopyField
                  label="Token ID"
                  value={tokenId}
                  link={getEtherscanUrl('token', '', tokenId, eduProofCertificateAddress)}
                  linkLabel="View on Explorer"
                  monospace
                />
              ) : null}
              <CopyField
                label="Contract Address"
                value={eduProofCertificateAddress}
                link={getEtherscanUrl('address', eduProofCertificateAddress)}
                linkLabel="View on Explorer"
                monospace
                shortened
              />
            </div>
          </div>

          {/* Share Proof Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Share Proof</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyProofLinks}
                disabled={copyingProofLinks}
                className="flex items-center gap-2"
              >
                {copyingProofLinks ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                Copy Proof Links
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyJSON}
                disabled={copyingJSON || loadingMetadata}
                className="flex items-center gap-2"
              >
                {copyingJSON || loadingMetadata ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileJson className="w-4 h-4" />
                )}
                Copy JSON Metadata
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenAll}
                className="flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Open All Links
              </Button>
            </div>
          </div>

          {/* Proof Links */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">Proof Links</h3>
            <div className="space-y-2">
              <LinkItem
                label={isPdf ? 'IPFS PDF Preview' : 'IPFS Image'}
                url={previewUrl}
                description={isPdf ? 'SVG preview of your PDF certificate' : 'Your certificate image stored on IPFS'}
              />
              <LinkItem
                label="IPFS Metadata"
                url={metadataUrl}
                description="NFT metadata (JSON) stored on IPFS"
              />
              <LinkItem
                label="Etherscan Transaction"
                url={etherscanUrl}
                description="View your minting transaction on Etherscan"
              />
              {verificationUrl != null && (
                <LinkItem
                  label="Verification URL"
                  url={verificationUrl}
                  description="Public verification page for this certificate"
                />
              )}
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button onClick={() => onOpenChange(false)} className="min-w-[120px]">
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
