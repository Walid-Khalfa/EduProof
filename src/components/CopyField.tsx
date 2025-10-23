import { Copy, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { copyToClipboard } from '@/utils/copyToClipboard';
import { useToast } from '@/hooks/use-toast';

interface CopyFieldProps {
  label: string;
  value: string;
  link?: string;
  linkLabel?: string;
  monospace?: boolean;
  shortened?: boolean;
}

export function CopyField({ 
  label, 
  value, 
  link, 
  linkLabel = 'View',
  monospace = false,
  shortened = false 
}: CopyFieldProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    const success = await copyToClipboard(value);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied!',
        description: `${label} copied to clipboard`,
      });
    } else {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const displayValue = shortened && value.length > 20
    ? `${value.slice(0, 10)}...${value.slice(-8)}`
    : value;

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label}</p>
        <p className={`text-sm font-medium text-slate-900 dark:text-slate-100 ${monospace ? 'font-mono' : ''} truncate`}>
          {displayValue}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 w-8 p-0"
          title={`Copy ${label}`}
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-600" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
        {link && (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-8 w-8 p-0"
            title={linkLabel}
          >
            <a href={link} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
