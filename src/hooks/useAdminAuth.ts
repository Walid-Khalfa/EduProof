import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';

const AUTH_MESSAGE_PREFIX = 'EduProof Admin Auth:';
const MAX_AUTH_AGE_SECONDS = 4 * 60;

export function buildAdminAuthMessage(nowSeconds: number, method: string, path: string, bodyHash = ''): string {
  return `${AUTH_MESSAGE_PREFIX} ${nowSeconds}:${method}:${path}:${bodyHash}`;
}

async function sha256Hex(input: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Must match the server's computeBodyHash in server/utils/requireAdmin.ts. */
async function computeBodyHash(body?: unknown): Promise<string> {
  if (body === undefined || body === null) return '';
  const keys = Object.keys(body as object);
  if (keys.length === 0) return '';
  return sha256Hex(JSON.stringify(body));
}

interface AdminAuthState {
  key: string;
  message: string;
  signature: string;
  ts: number;
}

/**
 * Signs short-lived, request-bound messages with the connected wallet so the
 * backend can verify admin privileges (wallet must be in ADMIN_WALLETS).
 * Each signature is bound to method + path + body hash, so a signature
 * captured on one request cannot be replayed on another.
 */
export function useAdminAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync, isPending: signing } = useSignMessage();
  const [auth, setAuth] = useState<AdminAuthState | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(
    async (method: string, path: string, body?: unknown): Promise<Record<string, string>> => {
      if (!isConnected || !address) {
        setAuth(null);
        throw new Error('Wallet not connected');
      }

      const bodyHash = await computeBodyHash(body);
      const key = `${method}:${path}:${bodyHash}`;
      const now = Math.floor(Date.now() / 1000);

      // Reuse a fresh signature only when it covers the exact same request.
      if (auth && auth.key === key && now - auth.ts <= MAX_AUTH_AGE_SECONDS) {
        return {
          'x-wallet-address': address,
          'x-message': auth.message,
          'x-signature': auth.signature,
        };
      }

      const message = buildAdminAuthMessage(now, method, path, bodyHash);
      try {
        const signature = await signMessageAsync({ message });
        setAuth({ key, message, signature, ts: now });
        setAuthError(null);
        return {
          'x-wallet-address': address,
          'x-message': message,
          'x-signature': signature,
        };
      } catch (e) {
        const detail = e instanceof Error ? (e as Error & { shortMessage?: string }).shortMessage || e.message : String(e);
        setAuth(null);
        setAuthError(detail || 'Signature request rejected');
        throw e;
      }
    },
    [isConnected, address, signMessageAsync, auth]
  );

  const signIn = useCallback(async () => {
    try {
      await getAuthHeaders('GET', '/api/admin/institutions');
    } catch {
      // authError is set by getAuthHeaders
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (isConnected && address) {
      if (!auth || Math.floor(Date.now() / 1000) - auth.ts > MAX_AUTH_AGE_SECONDS) {
        signIn();
      }
    } else {
      setAuth(null);
    }
  }, [isConnected, address, auth, signIn]);

  const signed = useMemo(
    () => Boolean(auth && address && auth.signature),
    [auth, address]
  );

  return {
    getAuthHeaders,
    signed,
    signing,
    signIn,
    authError,
  };
}
