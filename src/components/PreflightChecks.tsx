import { Check, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface PreflightChecksProps {
  imageOk: boolean;
  walletOk: boolean;
  institutionOk: boolean;
  scoreOk: boolean;
  networkOk?: boolean;
}

const checks = [
  {
    key: 'imageOk',
    label: 'Certificate image uploaded',
    tooltip: 'Upload a valid PNG, JPG, or SVG file (max 15MB)',
  },
  {
    key: 'walletOk',
    label: 'Wallet connected',
    tooltip: 'Connect your wallet to mint the NFT certificate',
  },
  {
    key: 'institutionOk',
    label: 'Institution name provided',
    tooltip: 'Institution name is required for certificate validation',
  },
  {
    key: 'scoreOk',
    label: 'OCR confidence ≥ 70%',
    tooltip: 'AI extraction confidence must be at least 70% for reliable data',
  },
  {
    key: 'networkOk',
    label: 'Connected to Sepolia',
    tooltip: 'Switch to Sepolia testnet to mint certificates',
    optional: true,
  },
];

export function PreflightChecks(props: PreflightChecksProps) {
  const allRequired = checks
    .filter((c) => !c.optional)
    .every((c) => props[c.key as keyof PreflightChecksProps]);

  return (
    <TooltipProvider>
      <div className="rounded-2xl border backdrop-blur p-6 space-y-4 shadow-card" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
            Pre-flight Checks
          </h3>
          {allRequired && (
            <Badge className="text-white" style={{ backgroundColor: 'var(--success)' }}>
              Ready to mint
            </Badge>
          )}
        </div>

        <ul className="space-y-3" role="list">
          {checks.map((check) => {
            const isOk = props[check.key as keyof PreflightChecksProps];
            const showCheck = check.optional ? isOk !== undefined : true;

            if (!showCheck) return null;

            return (
              <li key={check.key} className="flex items-start gap-3">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    backgroundColor: isOk ? 'var(--success)' : 'var(--surface-2)',
                    color: isOk ? '#FFFFFF' : 'var(--text-muted)'
                  }}
                >
                  {isOk ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-medium"
                      style={{ color: isOk ? 'var(--text)' : 'var(--text-muted)' }}
                    >
                      {check.label}
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          aria-label={`Info about ${check.label}`}
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs max-w-xs">{check.tooltip}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </TooltipProvider>
  );
}
