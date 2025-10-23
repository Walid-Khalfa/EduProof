import { Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type MintButtonState =
  | 'idle'
  | 'ipfs'
  | 'wallet'
  | 'confirm'
  | 'indexing'
  | 'done'
  | 'error';

interface MintButtonProps {
  state: MintButtonState;
  disabled?: boolean;
  onClick?: () => void;
}

const stateConfig: Record<
  MintButtonState,
  {
    label: string;
    icon?: React.ReactNode;
    className?: string;
    useGradient?: boolean;
  }
> = {
  idle: {
    label: 'Mint Certificate',
    className: 'bg-cta-grad hover:opacity-95 active:opacity-90',
    useGradient: true,
  },
  ipfs: {
    label: 'Uploading to IPFS…',
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    className: 'opacity-90',
    useGradient: true,
  },
  wallet: {
    label: 'Waiting for wallet…',
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    className: 'opacity-90',
    useGradient: true,
  },
  confirm: {
    label: 'Confirming transaction…',
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    className: 'opacity-90',
    useGradient: true,
  },
  indexing: {
    label: 'Indexing in database…',
    icon: <Loader2 className="w-4 h-4 animate-spin" />,
    className: 'opacity-90',
    useGradient: true,
  },
  done: {
    label: 'Minted!',
    icon: <Check className="w-4 h-4" />,
    className: 'hover:opacity-90',
  },
  error: {
    label: 'Retry mint',
    icon: <AlertCircle className="w-4 h-4" />,
    className: 'hover:opacity-90',
  },
};

export function MintButton({ state, disabled, onClick }: MintButtonProps) {
  const config = stateConfig[state];
  const isProcessing = ['ipfs', 'wallet', 'confirm', 'indexing'].includes(state);
  const isDisabled = disabled || isProcessing;

  return (
    <Button
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        'w-full h-12 text-base font-semibold transition-all duration-300 text-white shadow-card',
        'focus:ring-4',
        config.className
      )}
      style={{
        backgroundColor: config.useGradient ? undefined : (state === 'done' ? 'var(--success)' : state === 'error' ? 'var(--error)' : undefined),
        backgroundImage: config.useGradient ? 'var(--cta-grad)' : undefined,
      }}
      size="lg"
    >
      {config.icon && <span className="mr-2">{config.icon}</span>}
      {config.label}
    </Button>
  );
}
