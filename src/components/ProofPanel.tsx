import { ExternalLink, Copy, Check, FileJson, Share2, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { buildProofMarkdown, fetchMetadataJSON, openAllLinks, buildProxyPreviewUrl, ipfsToGateway, checkProxyPreview } from '@/utils/share';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboard } from '@/utils/copyToClipboard';

interface ProofPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewUrl: string;
  metadataUrl: string;
  etherscanUrl: string;
  verificationUrl?: string | null;
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
    <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
          {label}
        </h4>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-8 px-2"
            aria-label={`Copy ${label} URL`}
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-8 px-2"
          >
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${label} in new tab`}
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {description}
      </p>
      <p className="text-xs font-mono text-slate-600 dark:text-slate-300 break-all">
        {url}
      </p>
    </div>
  );
}

export function ProofPanel({
  open,
  onOpenChange,
  previewUrl,
  metadataUrl,
  etherscanUrl,
  verificationUrl,
  certSummary,
  isPdf,
  pdfPreviewCid,
}: ProofPanelProps) {
  const { toast } = useToast();
  const [copyingLinks, setCopyingLinks] = useState(false);
  const [copyingJSON, setCopyingJSON] = useState(false);
  const [previewState, setPreviewState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [finalPreviewUrl, setFinalPreviewUrl] = useState<string>(previewUrl);

  // Build proxy preview URL for PDFs
  useEffect(() => {
    if (isPdf && pdfPreviewCid) {
      const proxyUrl = buildProxyPreviewUrl(pdfPreviewCid);
      setFinalPreviewUrl(proxyUrl);
      
      // Check if proxy is available
      checkProxyPreview(pdfPreviewCid)
        .then((ok) => setPreviewState(ok ? 'ok' : 'error'))
        .catch(() => setPreviewState('error'));
    } else {
      setFinalPreviewUrl(previewUrl);
      setPreviewState('ok');
    }
  }, [isPdf, pdfPreviewCid, previewUrl]);

  const handleCopyProofLinks = async () => {
    setCopyingLinks(true);
    try {
      const markdown = buildProofMarkdown({
        previewUrl: finalPreviewUrl,
        metadataUrl: ipfsToGateway(metadataUrl),
        etherscanUrl: etherscanUrl,
        verificationUrl: verificationUrl || undefined,
        isPdf,
        pdfPreviewCid,
      });
      
      const success = await copyToClipboard(markdown);
      if (!success) throw new Error('Clipboard operation failed');
      
      toast({
        title: 'Proof links copied',
        description: 'Markdown with all proof links copied to clipboard',
      });
    } catch (err: any) {
      toast({
        title: 'Copy failed',
        description: err?.message ?? 'Failed to copy proof links',
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => setCopyingLinks(false), 2000);
    }
  };

  const handleCopyJSON = async () => {
    setCopyingJSON(true);
    try {
      const json = await fetchMetadataJSON(metadataUrl);
      const success = await copyToClipboard(JSON.stringify(json, null, 2));
      if (!success) throw new Error('Clipboard operation failed');
      
      toast({
        title: 'Metadata JSON copied',
        description: 'Pretty-printed JSON copied to clipboard',
      });
    } catch (err: any) {
      toast({
        title: 'Copy failed',
        description: err?.message ?? 'Failed to fetch or copy metadata JSON',
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => setCopyingJSON(false), 2000);
    }
  };

  const handleOpenAll = () => {
    const opened = openAllLinks({
      previewUrl: finalPreviewUrl,
      metadataUrl: ipfsToGateway(metadataUrl),
      etherscanUrl,
      verificationUrl,
      isPdf,
      pdfPreviewCid,
    });
    
    const totalLinks = 3 + (verificationUrl ? 1 : 0);
    
    if (opened === totalLinks) {
      toast({
        title: 'Links opened',
        description: `Opened ${opened} tabs`,
      });
    } else if (opened > 0) {
      toast({
        title: 'Partial success',
        description: `Opened ${opened}/${totalLinks} tabs (popup blocker may have blocked some)`,
      });
    } else {
      toast({
        title: 'Blocked',
        description: 'Popup blocker prevented opening tabs',
        variant: 'destructive',
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-lg overflow-y-auto"
        aria-label="Minted certificate proof"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-lg">
            Certificate Minted Successfully ✅
          </SheetTitle>
          <SheetDescription className="text-base">
            Your certificate has been minted as an NFT and indexed. Share the proof below.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Preview */}
          <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
            {previewState === 'loading' && (
              <div className="w-full h-48 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            )}
            {previewState === 'ok' && (
              <img
                src={finalPreviewUrl}
                alt="Certificate preview"
                className="w-full h-48 object-contain"
                onLoad={() => setPreviewState('ok')}
                onError={() => setPreviewState('error')}
                decoding="async"
                loading="lazy"
              />
            )}
            {previewState === 'error' && (
              <div className="w-full h-48 flex flex-col items-center justify-center gap-2 text-slate-500">
                <ExternalLink className="w-6 h-6" />
                <p className="text-sm">Preview unavailable</p>
                <a
                  href={finalPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Open in new tab
                </a>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
              Certificate Details
            </h3>
            <dl className="grid grid-cols-2 gap-3 text-sm bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
              <div className="col-span-2">
                <dt className="text-slate-500 dark:text-slate-400 text-xs">Student</dt>
                <dd className="font-medium text-slate-900 dark:text-white mt-1">
                  {certSummary.student}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-500 dark:text-slate-400 text-xs">Course</dt>
                <dd className="font-medium text-slate-900 dark:text-white mt-1">
                  {certSummary.course}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-slate-500 dark:text-slate-400 text-xs">Institution</dt>
                <dd className="font-medium text-slate-900 dark:text-white mt-1">
                  {certSummary.institution}
                </dd>
              </div>
              {certSummary.issueDate && (
                <div className="col-span-2">
                  <dt className="text-slate-500 dark:text-slate-400 text-xs">Issue Date</dt>
                  <dd className="font-medium text-slate-900 dark:text-white mt-1">
                    {certSummary.issueDate}
                  </dd>
                </div>
              )}
              {verificationUrl && (
                <div className="col-span-2">
                  <dt className="text-slate-500 dark:text-slate-400 text-xs">Verification URL</dt>
                  <dd className="font-medium text-slate-900 dark:text-white mt-1">
                    <a 
                      href={verificationUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-sky-600 hover:underline flex items-center gap-1 text-sm"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open verification page
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Share Actions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
              Share Proof
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyProofLinks}
                disabled={copyingLinks}
                className="justify-start"
              >
                {copyingLinks ? (
                  <Check className="w-4 h-4 mr-2 text-emerald-500" />
                ) : (
                  <Share2 className="w-4 h-4 mr-2" />
                )}
                {copyingLinks ? 'Copied!' : 'Copy Proof Links'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyJSON}
                disabled={copyingJSON}
                className="justify-start"
              >
                {copyingJSON ? (
                  <Check className="w-4 h-4 mr-2 text-emerald-500" />
                ) : (
                  <FileJson className="w-4 h-4 mr-2" />
                )}
                {copyingJSON ? 'Copied!' : 'Copy JSON Metadata'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenAll}
                className="justify-start"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open All Links
              </Button>
            </div>
          </div>

          {/* Proof Links */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
              Proof Links
            </h3>
            <div className="space-y-3">
              <LinkItem
                label="IPFS Image"
                url={previewUrl}
                description="Decentralized storage of certificate image"
              />
              <LinkItem
                label="IPFS Metadata"
                url={metadataUrl}
                description="ERC-721 compliant metadata JSON"
              />
              <LinkItem
                label="Etherscan Transaction"
                url={etherscanUrl}
                description="On-chain verification on Sepolia testnet"
              />
              {verificationUrl && (
                <LinkItem
                  label="Verification URL"
                  url={verificationUrl}
                  description="Original certificate verification page"
                />
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
