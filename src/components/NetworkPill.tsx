import { AlertCircle, Check, Network } from 'lucide-react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
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
import { chainId, chainName } from '@/utils/chainConfig';

export function NetworkPill() {
  const { isConnected } = useAccount();
  const currentChainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const [showGuide, setShowGuide] = useState(false);

  if (!isConnected) return null;

  const isCorrectNetwork = currentChainId === chainId;

  const handleSwitch = () => {
    if (switchChain) {
      try {
        switchChain({ chainId });
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
          <span>{chainName}</span>
        </Badge>

        {!isCorrectNetwork && (
          <Button
            onClick={handleSwitch}
            disabled={isPending}
            size="sm"
            className="h-8 bg-violet-600 hover:bg-violet-700 text-white"
          >
            {isPending ? 'Switching...' : `Switch to ${chainName}`}
          </Button>
        )}
      </div>

      <Dialog open={showGuide} onOpenChange={setShowGuide}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch to {chainName} Network</DialogTitle>
            <DialogDescription>
              Follow these steps to manually switch to {chainName} network
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
                <li>Select "{chainName}" network or add it as a custom network</li>
                <li>
                  If {chainName} is not listed, add it as a custom RPC network
                  using the details below
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
                    {chainName}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-violet-700 dark:text-violet-400">
                    Chain ID:
                  </dt>
                  <dd className="text-violet-900 dark:text-violet-200">
                    {chainId}
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
