# Web3 Wallet Integration Guide for EduProof

## Overview

This guide covers Web3 wallet integration for the EduProof dApp using RainbowKit and Wagmi with Next.js 14, including multi-chain configuration and best practices for wallet connection UX.

---

## Table of Contents

1. [RainbowKit Setup](#rainbowkit-setup)
2. [Wagmi Configuration](#wagmi-configuration)
3. [Multi-Chain Setup](#multi-chain-setup)
4. [Wallet Connection UX](#wallet-connection-ux)
5. [Contract Interactions](#contract-interactions)
6. [Best Practices](#best-practices)

---

## RainbowKit Setup

### Installation

```bash
npm install @rainbow-me/rainbowkit wagmi viem@2.x @tanstack/react-query
```

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Contract addresses (from deployment)
NEXT_PUBLIC_INSTITUTION_REGISTRY_ADDRESS=0xd0c5FFab4A8265b83f5785629248F3bd3c5cd11d
NEXT_PUBLIC_CERTIFICATE_ADDRESS=0x0fEFa8D515BF472352d8fFDbC0846bae39faaB82

# Chain configuration
NEXT_PUBLIC_DEFAULT_CHAIN_ID=80002 # Polygon Amoy
```

### Get WalletConnect Project ID

1. Visit [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Create a new project
3. Copy the Project ID

---

## Wagmi Configuration

### Create Wagmi Config

```typescript
// lib/wagmi/config.ts
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygonAmoy, sepolia, baseSepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'EduProof',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [polygonAmoy, sepolia, baseSepolia],
  ssr: true, // Enable for Next.js SSR support
});
```

### Custom Chain Configuration

```typescript
// lib/wagmi/chains.ts
import { Chain } from 'wagmi/chains';

// Polygon Amoy Testnet
export const polygonAmoy: Chain = {
  id: 80002,
  name: 'Polygon Amoy',
  network: 'polygon-amoy',
  nativeCurrency: {
    name: 'MATIC',
    symbol: 'MATIC',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc-amoy.polygon.technology'] },
    public: { http: ['https://rpc-amoy.polygon.technology'] },
  },
  blockExplorers: {
    default: { 
      name: 'PolygonScan', 
      url: 'https://amoy.polygonscan.com' 
    },
  },
  testnet: true,
};

// Ethereum Sepolia
export const sepolia: Chain = {
  id: 11155111,
  name: 'Sepolia',
  network: 'sepolia',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc.sepolia.org'] },
    public: { http: ['https://rpc.sepolia.org'] },
  },
  blockExplorers: {
    default: { 
      name: 'Etherscan', 
      url: 'https://sepolia.etherscan.io' 
    },
  },
  testnet: true,
};

// Base Sepolia
export const baseSepolia: Chain = {
  id: 84532,
  name: 'Base Sepolia',
  network: 'base-sepolia',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://sepolia.base.org'] },
    public: { http: ['https://sepolia.base.org'] },
  },
  blockExplorers: {
    default: { 
      name: 'BaseScan', 
      url: 'https://sepolia.basescan.org' 
    },
  },
  testnet: true,
};
```

---

## Multi-Chain Setup

### Provider Setup

```typescript
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { config } from '@/lib/wagmi/config';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#7b3fe4',
            accentColorForeground: 'white',
            borderRadius: 'medium',
          })}
          showRecentTransactions={true}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### Root Layout Integration

```typescript
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Chain-Specific Contract Addresses

```typescript
// lib/contracts/addresses.ts
import { polygonAmoy, sepolia, baseSepolia } from '@/lib/wagmi/chains';

export const CONTRACT_ADDRESSES = {
  [polygonAmoy.id]: {
    institutionRegistry: '0xd0c5FFab4A8265b83f5785629248F3bd3c5cd11d',
    certificate: '0x0fEFa8D515BF472352d8fFDbC0846bae39faaB82',
  },
  [sepolia.id]: {
    institutionRegistry: '0x...', // Deploy to Sepolia
    certificate: '0x...',
  },
  [baseSepolia.id]: {
    institutionRegistry: '0x...', // Deploy to Base Sepolia
    certificate: '0x...',
  },
};

export function getContractAddress(
  chainId: number,
  contract: 'institutionRegistry' | 'certificate'
): string {
  const addresses = CONTRACT_ADDRESSES[chainId];
  if (!addresses) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return addresses[contract];
}
```

### Chain Switcher Component

```typescript
'use client';

import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { Button } from '@/components/ui/button';
import { polygonAmoy, sepolia, baseSepolia } from '@/lib/wagmi/chains';

const SUPPORTED_CHAINS = [polygonAmoy, sepolia, baseSepolia];

export function ChainSwitcher() {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { isConnected } = useAccount();

  if (!isConnected) return null;

  const currentChain = SUPPORTED_CHAINS.find(c => c.id === chainId);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm">Network:</span>
      <select
        value={chainId}
        onChange={(e) => switchChain({ chainId: Number(e.target.value) })}
        className="px-3 py-1 border rounded"
      >
        {SUPPORTED_CHAINS.map((chain) => (
          <option key={chain.id} value={chain.id}>
            {chain.name}
          </option>
        ))}
      </select>
      {currentChain?.testnet && (
        <span className="text-xs text-yellow-600">Testnet</span>
      )}
    </div>
  );
}
```

---

## Wallet Connection UX

### Connect Button

```typescript
'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export function WalletConnect() {
  return (
    <ConnectButton
      accountStatus={{
        smallScreen: 'avatar',
        largeScreen: 'full',
      }}
      chainStatus={{
        smallScreen: 'icon',
        largeScreen: 'full',
      }}
      showBalance={{
        smallScreen: false,
        largeScreen: true,
      }}
    />
  );
}
```

### Custom Connect Button

```typescript
'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Button } from '@/components/ui/button';

export function CustomConnectButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <Button onClick={openConnectModal}>
                    Connect Wallet
                  </Button>
                );
              }

              if (chain.unsupported) {
                return (
                  <Button onClick={openChainModal} variant="destructive">
                    Wrong Network
                  </Button>
                );
              }

              return (
                <div className="flex gap-2">
                  <Button
                    onClick={openChainModal}
                    variant="outline"
                  >
                    {chain.hasIcon && (
                      <div
                        style={{
                          background: chain.iconBackground,
                          width: 12,
                          height: 12,
                          borderRadius: 999,
                          overflow: 'hidden',
                          marginRight: 4,
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            style={{ width: 12, height: 12 }}
                          />
                        )}
                      </div>
                    )}
                    {chain.name}
                  </Button>

                  <Button onClick={openAccountModal}>
                    {account.displayName}
                    {account.displayBalance
                      ? ` (${account.displayBalance})`
                      : ''}
                  </Button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
```

### Connection Status Hook

```typescript
// hooks/useWalletStatus.ts
import { useAccount, useChainId } from 'wagmi';
import { polygonAmoy, sepolia, baseSepolia } from '@/lib/wagmi/chains';

const SUPPORTED_CHAIN_IDS = [polygonAmoy.id, sepolia.id, baseSepolia.id];

export function useWalletStatus() {
  const { address, isConnected, isConnecting, isDisconnected } = useAccount();
  const chainId = useChainId();

  const isSupported = SUPPORTED_CHAIN_IDS.includes(chainId);

  return {
    address,
    isConnected,
    isConnecting,
    isDisconnected,
    chainId,
    isSupported,
    needsNetworkSwitch: isConnected && !isSupported,
  };
}
```

### Protected Route Component

```typescript
'use client';

import { useWalletStatus } from '@/hooks/useWalletStatus';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { ChainSwitcher } from './ChainSwitcher';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isConnected, needsNetworkSwitch } = useWalletStatus();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <h2 className="text-2xl font-bold">Connect Your Wallet</h2>
        <p className="text-gray-600">Please connect your wallet to continue</p>
        <ConnectButton />
      </div>
    );
  }

  if (needsNetworkSwitch) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <h2 className="text-2xl font-bold">Wrong Network</h2>
        <p className="text-gray-600">Please switch to a supported network</p>
        <ChainSwitcher />
      </div>
    );
  }

  return <>{children}</>;
}
```

---

## Contract Interactions

### Contract ABIs

```typescript
// lib/contracts/abis.ts
export const INSTITUTION_REGISTRY_ABI = [
  {
    inputs: [
      { name: 'institutionAddress', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'didURI', type: 'string' },
    ],
    name: 'registerInstitution',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'institutionAddress', type: 'address' }],
    name: 'isActive',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // ... more ABI entries
] as const;

export const CERTIFICATE_ABI = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'tokenURI', type: 'string' },
      { name: 'studentHash', type: 'bytes32' },
    ],
    name: 'safeMint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'status',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  // ... more ABI entries
] as const;
```

### Read Contract Data

```typescript
'use client';

import { useReadContract, useChainId } from 'wagmi';
import { getContractAddress } from '@/lib/contracts/addresses';
import { CERTIFICATE_ABI } from '@/lib/contracts/abis';

export function CertificateStatus({ tokenId }: { tokenId: bigint }) {
  const chainId = useChainId();
  
  const { data: status, isLoading, error } = useReadContract({
    address: getContractAddress(chainId, 'certificate') as `0x${string}`,
    abi: CERTIFICATE_ABI,
    functionName: 'status',
    args: [tokenId],
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      Status: <span className={status === 'Active' ? 'text-green-600' : 'text-red-600'}>
        {status}
      </span>
    </div>
  );
}
```

### Write Contract Data

```typescript
'use client';

import { useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { getContractAddress } from '@/lib/contracts/addresses';
import { CERTIFICATE_ABI } from '@/lib/contracts/abis';
import { keccak256, toUtf8Bytes } from 'ethers';
import { Button } from '@/components/ui/button';

export function MintCertificate() {
  const chainId = useChainId();
  
  const { 
    data: hash, 
    writeContract, 
    isPending 
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleMint = async () => {
    const studentAddress = '0x...';
    const tokenURI = 'ipfs://...';
    const studentName = 'John Doe';
    const studentHash = keccak256(toUtf8Bytes(studentName));

    writeContract({
      address: getContractAddress(chainId, 'certificate') as `0x${string}`,
      abi: CERTIFICATE_ABI,
      functionName: 'safeMint',
      args: [studentAddress as `0x${string}`, tokenURI, studentHash as `0x${string}`],
    });
  };

  return (
    <div>
      <Button 
        onClick={handleMint} 
        disabled={isPending || isConfirming}
      >
        {isPending ? 'Confirming...' : isConfirming ? 'Minting...' : 'Mint Certificate'}
      </Button>
      
      {hash && (
        <div className="mt-2">
          Transaction Hash: {hash}
        </div>
      )}
      
      {isSuccess && (
        <div className="mt-2 text-green-600">
          Certificate minted successfully!
        </div>
      )}
    </div>
  );
}
```

### Custom Hook for Contract Interaction

```typescript
// hooks/useMintCertificate.ts
import { useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { getContractAddress } from '@/lib/contracts/addresses';
import { CERTIFICATE_ABI } from '@/lib/contracts/abis';
import { keccak256, toUtf8Bytes } from 'ethers';

export function useMintCertificate() {
  const chainId = useChainId();
  
  const { 
    data: hash, 
    writeContract, 
    isPending,
    error: writeError,
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess,
    error: confirmError,
  } = useWaitForTransactionReceipt({ hash });

  const mintCertificate = async (
    studentAddress: string,
    tokenURI: string,
    studentName: string
  ) => {
    const studentHash = keccak256(toUtf8Bytes(studentName));

    writeContract({
      address: getContractAddress(chainId, 'certificate') as `0x${string}`,
      abi: CERTIFICATE_ABI,
      functionName: 'safeMint',
      args: [studentAddress as `0x${string}`, tokenURI, studentHash as `0x${string}`],
    });
  };

  return {
    mintCertificate,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error: writeError || confirmError,
  };
}
```

### Using the Custom Hook

```typescript
'use client';

import { useState } from 'react';
import { useMintCertificate } from '@/hooks/useMintCertificate';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function MintForm() {
  const [studentAddress, setStudentAddress] = useState('');
  const [studentName, setStudentName] = useState('');
  const [tokenURI, setTokenURI] = useState('');

  const { 
    mintCertificate, 
    hash, 
    isPending, 
    isConfirming, 
    isSuccess, 
    error 
  } = useMintCertificate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await mintCertificate(studentAddress, tokenURI, studentName);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="Student Address"
        value={studentAddress}
        onChange={(e) => setStudentAddress(e.target.value)}
        required
      />
      
      <Input
        placeholder="Student Name"
        value={studentName}
        onChange={(e) => setStudentName(e.target.value)}
        required
      />
      
      <Input
        placeholder="Token URI (ipfs://...)"
        value={tokenURI}
        onChange={(e) => setTokenURI(e.target.value)}
        required
      />

      <Button 
        type="submit" 
        disabled={isPending || isConfirming}
      >
        {isPending ? 'Confirming...' : isConfirming ? 'Minting...' : 'Mint Certificate'}
      </Button>

      {error && (
        <div className="text-red-500">Error: {error.message}</div>
      )}

      {hash && (
        <div className="text-sm">
          Transaction: <a 
            href={`https://amoy.polygonscan.com/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            {hash.slice(0, 10)}...{hash.slice(-8)}
          </a>
        </div>
      )}

      {isSuccess && (
        <div className="text-green-600">
          ✅ Certificate minted successfully!
        </div>
      )}
    </form>
  );
}
```

---

## Best Practices

### 1. Error Handling

```typescript
// lib/errors/walletErrors.ts
export function getWalletErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('user rejected')) {
    return 'Transaction was rejected by user';
  }

  if (message.includes('insufficient funds')) {
    return 'Insufficient funds for transaction';
  }

  if (message.includes('network')) {
    return 'Network error. Please check your connection';
  }

  if (message.includes('nonce')) {
    return 'Transaction nonce error. Please try again';
  }

  return 'Transaction failed. Please try again';
}
```

### 2. Transaction Notifications

```typescript
'use client';

import { useEffect } from 'react';
import { useWaitForTransactionReceipt } from 'wagmi';
import { toast } from 'sonner';

export function TransactionToast({ hash }: { hash: `0x${string}` | undefined }) {
  const { isLoading, isSuccess, isError } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isLoading) {
      toast.loading('Transaction pending...', { id: hash });
    }
    if (isSuccess) {
      toast.success('Transaction confirmed!', { id: hash });
    }
    if (isError) {
      toast.error('Transaction failed', { id: hash });
    }
  }, [isLoading, isSuccess, isError, hash]);

  return null;
}
```

### 3. Gas Estimation

```typescript
// hooks/useGasEstimate.ts
import { useEstimateGas, useChainId } from 'wagmi';
import { getContractAddress } from '@/lib/contracts/addresses';
import { CERTIFICATE_ABI } from '@/lib/contracts/abis';

export function useGasEstimate(
  studentAddress: string,
  tokenURI: string,
  studentHash: `0x${string}`
) {
  const chainId = useChainId();

  const { data: gasEstimate } = useEstimateGas({
    address: getContractAddress(chainId, 'certificate') as `0x${string}`,
    abi: CERTIFICATE_ABI,
    functionName: 'safeMint',
    args: [studentAddress as `0x${string}`, tokenURI, studentHash],
  });

  return gasEstimate;
}
```

### 4. Account Change Handling

```typescript
'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';

export function AccountChangeHandler() {
  const { address } = useAccount();
  const router = useRouter();

  useEffect(() => {
    // Refresh page when account changes
    router.refresh();
  }, [address, router]);

  return null;
}
```

### 5. Wallet Connection Persistence

```typescript
// lib/wagmi/config.ts
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygonAmoy, sepolia, baseSepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'EduProof',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [polygonAmoy, sepolia, baseSepolia],
  ssr: true,
  // Auto-connect to previously connected wallet
  autoConnect: true,
});
```

### 6. Loading States

```typescript
'use client';

import { useAccount } from 'wagmi';
import { Skeleton } from '@/components/ui/skeleton';

export function WalletDependentContent({ children }: { children: React.ReactNode }) {
  const { isConnecting } = useAccount();

  if (isConnecting) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
```

### 7. Network-Specific UI

```typescript
'use client';

import { useChainId } from 'wagmi';
import { polygonAmoy, sepolia, baseSepolia } from '@/lib/wagmi/chains';

export function NetworkBadge() {
  const chainId = useChainId();

  const getChainInfo = () => {
    switch (chainId) {
      case polygonAmoy.id:
        return { name: 'Polygon Amoy', color: 'bg-purple-500' };
      case sepolia.id:
        return { name: 'Sepolia', color: 'bg-blue-500' };
      case baseSepolia.id:
        return { name: 'Base Sepolia', color: 'bg-blue-600' };
      default:
        return { name: 'Unknown', color: 'bg-gray-500' };
    }
  };

  const { name, color } = getChainInfo();

  return (
    <div className={`${color} text-white px-3 py-1 rounded-full text-sm`}>
      {name}
    </div>
  );
}
```

---

## Complete Example: Dashboard Page

```typescript
// app/dashboard/page.tsx
'use client';

import { ProtectedRoute } from '@/components/wallet/ProtectedRoute';
import { WalletConnect } from '@/components/wallet/WalletConnect';
import { ChainSwitcher } from '@/components/wallet/ChainSwitcher';
import { NetworkBadge } from '@/components/wallet/NetworkBadge';
import { MintForm } from '@/components/certificates/MintForm';
import { useWalletStatus } from '@/hooks/useWalletStatus';

export default function DashboardPage() {
  const { address } = useWalletStatus();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Institution Dashboard</h1>
        <div className="flex items-center gap-4">
          <NetworkBadge />
          <ChainSwitcher />
          <WalletConnect />
        </div>
      </div>

      <ProtectedRoute>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Mint Certificate</h2>
            <MintForm />
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Your Certificates</h2>
            {/* Certificate list component */}
          </div>
        </div>
      </ProtectedRoute>
    </div>
  );
}
```

---

## References

- [RainbowKit Documentation](https://www.rainbowkit.com/docs/introduction)
- [Wagmi Documentation](https://wagmi.sh/)
- [Viem Documentation](https://viem.sh/)
- [WalletConnect Cloud](https://cloud.walletconnect.com/)
- [Next.js 14 Documentation](https://nextjs.org/docs)
