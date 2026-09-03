import { ApiClient } from '@ielts/core';

/**
 * Base URL of the sync server. Override per-environment with EXPO_PUBLIC_API_URL.
 * On a physical phone this must be your computer's LAN IP, e.g.
 * EXPO_PUBLIC_API_URL=http://192.168.1.20:8787
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8787';

let tokenCache: string | null = null;

export function setToken(token: string | null): void {
  tokenCache = token;
}

export function getToken(): string | null {
  return tokenCache;
}

export const api = new ApiClient({
  baseUrl: API_URL,
  getToken: () => tokenCache,
});
