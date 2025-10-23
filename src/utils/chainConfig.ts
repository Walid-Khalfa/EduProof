/**
 * Chain Configuration for EduProof dApp
 * 
 * This file provides build-time chain selection using environment variables.
 * To build for different chains, set the VITE_CHAIN environment variable:
 * 
 * VITE_CHAIN=devnet pnpm run build    (for local development - default)
 * VITE_CHAIN=polygon_amoy pnpm run build  (for Polygon Amoy testnet)
 * VITE_CHAIN=eth_sepolia pnpm run build   (for Ethereum Sepolia testnet)
 * VITE_CHAIN=base_sepolia pnpm run build  (for Base Sepolia testnet)
 */

import metadata from '../metadata.json';

const targetChainName = import.meta.env.VITE_CHAIN || 'devnet'; // default chain

// Find the chain configuration by network name
const chainConfig = metadata.chains.find(chain => chain.network === targetChainName);

if (!chainConfig) {
  throw new Error(`Chain '${targetChainName}' not found in metadata.json. Available chains: ${metadata.chains.map(c => c.network).join(', ')}`);
}

// Get contract information
const eduProofCertificate = chainConfig.contracts.find(c => c.contractName === 'EduProofCertificate');
const institutionRegistry = chainConfig.contracts.find(c => c.contractName === 'InstitutionRegistry');

if (!eduProofCertificate || !institutionRegistry) {
  throw new Error(`Required contracts not found in metadata for chain '${targetChainName}'`);
}

export const selectedChain = chainConfig;
export const chainId = parseInt(chainConfig.chainId);
export const rpcUrl = chainConfig.rpc_url;

// Contract addresses and ABIs
export const eduProofCertificateAddress = eduProofCertificate.address as `0x${string}`;
export const eduProofCertificateABI = eduProofCertificate.abi;

export const institutionRegistryAddress = institutionRegistry.address as `0x${string}`;
export const institutionRegistryABI = institutionRegistry.abi;

// Chain metadata
export const chainName = chainConfig.network;
export const isTestnet = chainConfig.network !== 'mainnet';

// Export for Wagmi configuration
export const wagmiChain = {
  id: chainId,
  name: chainName,
  network: chainName,
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: [rpcUrl] },
    public: { http: [rpcUrl] },
  },
  testnet: isTestnet,
} as const;
