import { useCallback, useState, useEffect, useRef } from 'react';
import { Upload, Image as ImageIcon, AlertCircle, FileText, ExternalLink, Bug } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadAreaProps {
  onFile: (file: File) => void;
  value?: File | string;
  loading?: boolean;
  error?: string | null;
  previewUrl?: string;
  isPdf?: boolean;
  pdfPages?: number;
  pdfPreviewCid?: string | null;
}

const MAX_SIZE = 15 * 1024 * 1024; // 15MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'application/pdf'];

export function UploadArea({ onFile, value, loading, error, previewUrl: externalPreviewUrl, isPdf, pdfPages, pdfPreviewCid }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const lastCidRef = useRef<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Please upload a PNG, JPG, SVG, or PDF file';
    }
    if (file.size > MAX_SIZE) {
      return 'File size must be less than 15MB';
    }
    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        setValidationError(error);
        return;
      }
      setValidationError(null);
      onFile(file);
    },
    [onFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPTED_TYPES.join(',');
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFile(file);
      }
    };
    input.click();
  }, [handleFile]);

  const API_URL = import.meta.env.VITE_API_URL || '';

  // Build preview URL with cache-busting for PDF SVG proxy
  useEffect(() => {
    // CRITICAL: For PDFs, ALWAYS use proxy (never blob:)
    if (isPdf && pdfPreviewCid) {
      setPreviewState('loading');
      
      // Cache-buster: timestamp to force fresh load
      const url = `${API_URL}/api/ipfs/preview/${pdfPreviewCid}.svg?t=${Date.now()}`;
      
      console.log('[UploadArea] Building preview URL:', { isPdf, pdfPreviewCid, url });
      setPreviewUrl(url);

      // Retry logic with exponential backoff
      const attemptFetch = async (retryCount = 0): Promise<void> => {
        const maxRetries = 3;
        const backoffMs = [200, 400, 800][retryCount] || 800;

        try {
          const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
          
          if (!r.ok) {
            // Retry on transient errors (502/504/522)
            if ([502, 504, 522].includes(r.status) && retryCount < maxRetries) {
              console.log(`[UploadArea] HEAD retry #${retryCount + 1} after ${backoffMs}ms (status ${r.status})`);
              await new Promise(resolve => setTimeout(resolve, backoffMs));
              return attemptFetch(retryCount + 1);
            }
            throw new Error(`HEAD ${r.status}`);
          }
          
          const ct = r.headers.get('content-type') || '';
          if (!ct.includes('image/svg')) {
            throw new Error(`Bad Content-Type: ${ct}`);
          }
          
          console.log('[UploadArea] HEAD check OK:', { status: r.status, contentType: ct });
          setPreviewState('ok');
        } catch (err) {
          // Fallback: try GET if HEAD failed
          if (retryCount === 0) {
            console.log('[UploadArea] HEAD failed, trying GET fallback');
            try {
              const getResp = await fetch(url, { cache: 'no-store' });
              if (getResp.ok && getResp.headers.get('content-type')?.includes('image/svg')) {
                console.log('[UploadArea] GET fallback OK');
                setPreviewState('ok');
                return;
              }
            } catch (getFallbackErr) {
              console.error('[UploadArea] GET fallback failed:', getFallbackErr);
            }
          }
          
          console.error('[UploadArea] HEAD/GET check failed:', err);
          setPreviewState('error');
        }
      };

      attemptFetch();
      lastCidRef.current = pdfPreviewCid;
      return;
    }

    // Non-PDF preview (images)
    if (!isPdf) {
      const url = externalPreviewUrl || (value instanceof File ? URL.createObjectURL(value) : value);
      setPreviewUrl(url || null);
      setPreviewState(url ? 'ok' : 'idle');
      lastCidRef.current = null;
      
      // Cleanup blob URLs when component unmounts or file changes
      return () => {
        if (url && typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      };
    }
  }, [isPdf, pdfPreviewCid, externalPreviewUrl, value, API_URL]);

  // Handle tab visibility changes to recover from ERR_NETWORK_IO_SUSPENDED
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isPdf && pdfPreviewCid && lastCidRef.current === pdfPreviewCid) {
        console.log('[UploadArea] Tab visible, forcing preview refresh');
        // Force re-build URL with new timestamp
        const url = `${API_URL}/api/ipfs/preview/${pdfPreviewCid}.svg?t=${Date.now()}`;
        setPreviewUrl(url);
        setPreviewState('loading');
        
        // Re-verify
        fetch(url, { method: 'HEAD', cache: 'no-store' })
          .then(r => {
            if (!r.ok) throw new Error(`HEAD ${r.status}`);
            setPreviewState('ok');
          })
          .catch(() => setPreviewState('error'));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isPdf, pdfPreviewCid, API_URL]);

  // Debug helper (DEV only)
  const handleDebugPreview = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!pdfPreviewCid) return;

    const debugUrl = `${API_URL}/api/ipfs/preview/${pdfPreviewCid}.debug`;
    console.log('[UploadArea] Fetching debug info:', debugUrl);
    
    try {
      const response = await fetch(debugUrl);
      const data = await response.json();
      console.log('[UploadArea] Debug response:', data);
      alert(`Debug Info:\n\nCID: ${data.cid}\nStatus: ${data.status || response.status}\nGateways tried: ${data.gatewaysTried?.length || 0}\n\nSee console for full details`);
    } catch (error) {
      console.error('[UploadArea] Debug fetch error:', error);
      alert('Debug fetch failed. See console for details.');
    }
  };

  const displayError = error || validationError;

  return (
    <div className="space-y-2">
      <div
        onClick={loading ? undefined : handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden',
          'hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/20',
          isDragging && 'border-violet-500 bg-violet-50 dark:bg-violet-950/30 scale-[1.02]',
          !isDragging && !previewUrl && 'border-slate-300 dark:border-slate-700',
          loading && 'opacity-50 cursor-not-allowed',
          displayError && 'border-red-300 dark:border-red-700'
        )}
        role="button"
        tabIndex={0}
        aria-label="Upload certificate image"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {previewUrl ? (
          <div className="relative group rounded-xl border border-dashed border-black/10 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,.03),transparent_60%)] p-3">
            {isPdf && pdfPreviewCid ? (
              <div className="w-full h-[220px] rounded-md bg-white dark:bg-zinc-900 ring-1 ring-zinc-200/60 dark:ring-zinc-800/60 overflow-hidden flex items-center justify-center">
                {previewState === 'loading' && (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                    <div className="text-zinc-400 text-sm">Loading preview…</div>
                  </div>
                )}
                {previewState === 'error' && (
                  <div className="p-4 text-center space-y-3">
                    <div className="text-red-600 dark:text-red-400 font-medium text-sm">Preview unavailable</div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (previewUrl) window.open(previewUrl, '_blank');
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700 underline"
                      >
                        Open preview in new tab
                      </button>
                      <a
                        href={`${API_URL}/api/ipfs/preview/${pdfPreviewCid}.debug`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-700 underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Debug preview JSON
                      </a>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewState('loading');
                          const url = `${API_URL}/api/ipfs/preview/${pdfPreviewCid}.svg?t=${Date.now()}`;
                          setPreviewUrl(url);
                          fetch(url, { method: 'HEAD', cache: 'no-store' })
                            .then(r => r.ok ? setPreviewState('ok') : setPreviewState('error'))
                            .catch(() => setPreviewState('error'));
                        }}
                        className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                )}
                {previewState === 'ok' && previewUrl && (
                  <img
                    src={previewUrl}
                    alt="Certificate preview"
                    className="h-[220px] w-full max-h-full max-w-full object-contain block"
                    decoding="async"
                    onError={(e) => {
                      console.error('[UploadArea] IMG error:', e);
                      setPreviewState('error');
                    }}
                    onLoad={() => {
                      console.log('[UploadArea] IMG load OK');
                      setPreviewState('ok');
                    }}
                  />
                )}
              </div>
            ) : (
              <img
                src={previewUrl}
                alt="Certificate preview"
                className="w-full h-64 object-contain transition-transform duration-300 group-hover:scale-105"
              />
            )}
            {isPdf && pdfPages && (
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-violet-600 text-white px-3 py-1.5 rounded-lg shadow-lg">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs font-semibold">PDF, {pdfPages} page{pdfPages > 1 ? 's' : ''}</span>
                </div>
                {pdfPreviewCid && import.meta.env.DEV && (
                  <div className="flex gap-1">
                    <button
                      onClick={handleDebugPreview}
                      className="flex items-center gap-1 bg-blue-600 text-white px-2 py-1.5 rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
                      title="Debug preview (check console)"
                    >
                      <Bug className="w-3 h-3" />
                      <span className="text-xs font-semibold">Debug</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (previewUrl) window.open(previewUrl, '_blank');
                      }}
                      className="flex items-center gap-1 bg-green-600 text-white px-2 py-1.5 rounded-lg shadow-lg hover:bg-green-700 transition-colors"
                      title="Open preview in new tab"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-4 py-2 rounded-lg">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  Click to change
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div
              className={cn(
                'w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-all duration-300',
                isDragging
                  ? 'bg-violet-100 dark:bg-violet-900/40 scale-110'
                  : 'bg-slate-100 dark:bg-slate-800'
              )}
            >
              {loading ? (
                <div className="w-8 h-8 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
              ) : (
                <Upload
                  className={cn(
                    'w-8 h-8 transition-colors',
                    isDragging
                      ? 'text-violet-600 dark:text-violet-400'
                      : 'text-slate-400'
                  )}
                />
              )}
            </div>

            <p className="text-base font-semibold text-slate-900 dark:text-white mb-2">
              {loading ? 'Processing...' : 'Drop your certificate here'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
              We'll extract the details with AI
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
              PNG, JPG, SVG, or PDF • Max 15MB
            </p>
          </div>
        )}
      </div>

      {displayError && (
        <div
          className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900"
          role="alert"
        >
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{displayError}</p>
        </div>
      )}
    </div>
  );
}
