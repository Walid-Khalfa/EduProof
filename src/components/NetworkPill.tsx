import { AlertCircle, Check, Network } from 'lucide-react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface NetworkPillProps {
  requiredNetwork?: 'sepolia';
}

export function NetworkPill({ requiredNetwork = 'sepolia' }: NetworkPillProps) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const [showGuide, setShowGuide] = useState(false);

  if (!isConnected) return null;

  const isCorrectNetwork = chainId === sepolia.id;

  const handleSwitch = () => {
    if (switchChain) {
      try {
        switchChain({ chainId: sepolia.id });
      } catch (error) {
        console.error('Failed to switch network:', error);
        setShowGuide(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 font-medium transition-colors',
            isCorrectNetwork
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
              : 'bg-orange-50 dark:bg-orange-950/20 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300'
          )}
        >
          {isCorrectNetwork ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5" />
          )}
          <Network className="w-3.5 h-3.5" />
          <span>Sepolia</span>
        </Badge>

        {!isCorrectNetwork && (
          <Button
            onClick={handleSwitch}
            disabled={isPending}
            size="sm"
            className="h-8 bg-violet-600 hover:bg-violet-700 text-white"
          >
            {isPending ? 'Switching...' : 'Switch to Sepolia'}
          </Button>
        )}
      </div>

      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch to Sepolia Network</DialogTitle>
            <DialogDescription>
              Follow these steps to manually switch to Sepolia testnet
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-4 space-y-3">
              <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                Manual Steps:
              </h4>
              <ol className="space-y-2 text-sm text-slate-700 dark:text-slate-300 list-decimal list-inside">
                <li>Open your wallet extension (MetaMask, Rainbow, etc.)</li>
                <li>Click on the network dropdown at the top</li>
                <li>Select "Sepolia Test Network"</li>
                <li>
                  If Sepolia is not listed, enable "Show test networks" in
                  settings
                </li>
                <li>Refresh this page after switching</li>
              </ol>
            </div>

            <div className="rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 p-4">
              <h4 className="font-semibold text-sm text-violet-900 dark:text-violet-300 mb-2">
                Network Details:
              </h4>
              <dl className="space-y-1 text-xs font-mono">
                <div className="flex justify-between">
                  <dt className="text-violet-700 dark:text-violet-400">
                    Network Name:
                  </dt>
                  <dd className="text-violet-900 dark:text-violet-200">
                    Sepolia
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-violet-700 dark:text-violet-400">
                    Chain ID:
                  </dt>
                  <dd className="text-violet-900 dark:text-violet-200">
                    11155111
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-violet-700 dark:text-violet-400">RPC:</dt>
                  <dd className="text-violet-900 dark:text-violet-200 truncate">
                    https://sepolia.infura.io/v3/...
                  </dd>
                </div>
              </dl>
            </div>

            <Button
              onClick={() => setShowGuide(false)}
              className="w-full"
              variant="outline"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
