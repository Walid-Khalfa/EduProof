import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

const AUTH_MESSAGE_PREFIX = 'EduProof Admin Auth:';
const MAX_AUTH_AGE_SECONDS = 4 * 60;

export function buildAdminAuthMessage(nowSeconds = Math.floor(Date.now() / 1000)): string {
  return `${AUTH_MESSAGE_PREFIX} ${nowSeconds}`;
}

interface AdminAuthState {
  message: string;
  signature: string;
  ts: number;
}

/**
 * Signs a short-lived message with the connected wallet so the backend can
 * verify admin privileges (wallet must be in the ADMIN_WALLETS allowlist).
 */
export function useAdminAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync, isPending: signing } = useSignMessage();
  const [auth, setAuth] = useState<AdminAuthState | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const signIn = useCallback(async () => {
    if (!isConnected || !address) {
      setAuth(null);
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const message = buildAdminAuthMessage(now);
    try {
      const signature = await signMessageAsync({ message });
      setAuth({ message, signature, ts: now });
      setAuthError(null);
    } catch (e) {
      const detail = e instanceof Error ? (e as Error & { shortMessage?: string }).shortMessage || e.message : String(e);
      setAuth(null);
      setAuthError(detail || 'Signature request rejected');
    }
  }, [isConnected, address, signMessageAsync]);

  useEffect(() => {
    if (isConnected && address) {
      signIn();
    } else {
      setAuth(null);
    }
  }, [isConnected, address, signIn]);

  const headers = useMemo(() => {
    if (!auth || !address || !auth.signature) return {};
    const now = Math.floor(Date.now() / 1000);
    if (now - auth.ts > MAX_AUTH_AGE_SECONDS) {
      signIn();
      return {};
    }
    return {
      'x-wallet-address': address,
      'x-message': auth.message,
      'x-signature': auth.signature,
    };
  }, [auth, address, signIn]);

  return {
    authHeaders: headers,
    signed: Boolean(auth && address && auth.signature),
    signing,
    signIn,
    authError,
  };
}
