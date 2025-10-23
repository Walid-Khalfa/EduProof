import { ExternalLink } from 'lucide-react';
import { selectedChain } from '@/utils/chainConfig';

interface EtherscanLinkProps {
  type: 'tx' | 'address' | 'token';
  value: string;
  tokenId?: string;
  contractAddress?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Get Etherscan-compatible explorer URL for the current chain
 */
function getExplorerUrl(type: 'tx' | 'address' | 'token', value: string, tokenId?: string, contractAddress?: string): string {
  const network = selectedChain.network;
  
  // Map network to explorer base URL
  const explorerMap: Record<string, string> = {
    'mainnet': 'https://etherscan.io',
    'eth_sepolia': 'https://sepolia.etherscan.io',
    'polygon': 'https://polygonscan.com',
    'polygon_amoy': 'https://amoy.polygonscan.com',
    'base': 'https://basescan.org',
    'base_sepolia': 'https://sepolia.basescan.org',
    'arbitrum': 'https://arbiscan.io',
    'arbitrum_sepolia': 'https://sepolia.arbiscan.io',
    'optimism': 'https://optimistic.etherscan.io',
    'optimism_sepolia': 'https://sepolia-optimistic.etherscan.io',
    'devnet': 'https://dev-explorer.codenut.dev',
  };

  const baseUrl = explorerMap[network] || 'https://etherscan.io';

  switch (type) {
    case 'tx':
      return `${baseUrl}/tx/${value}`;
    case 'address':
      return `${baseUrl}/address/${value}`;
    case 'token':
      if (!contractAddress || !tokenId) {
        throw new Error('Token type requires contractAddress and tokenId');
      }
      return `${baseUrl}/nft/${contractAddress}/${tokenId}`;
    default:
      return baseUrl;
  }
}

export function EtherscanLink({ 
  type, 
  value, 
  tokenId, 
  contractAddress, 
  children, 
  className = '' 
}: EtherscanLinkProps) {
  const url = getExplorerUrl(type, value, tokenId, contractAddress);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline ${className}`}
    >
      {children || (
        <>
          <ExternalLink className="w-3 h-3" />
          <span>View on Explorer</span>
        </>
      )}
    </a>
  );
}

/**
 * Get explorer URL without rendering a link
 */
export function getEtherscanUrl(type: 'tx' | 'address' | 'token', value: string, tokenId?: string, contractAddress?: string): string {
  return getExplorerUrl(type, value, tokenId, contractAddress);
}
