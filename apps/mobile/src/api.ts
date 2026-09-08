import { ApiClient } from '@ielts/core';
import { Platform } from 'react-native';

const SERVER_PORT = 8787;

/**
 * Base URL of the sync server.
 *
 * Priority:
 *  1. EXPO_PUBLIC_API_URL (set this for native builds and for custom domains /
 *     reverse proxies), e.g. EXPO_PUBLIC_API_URL=https://api.example.com
 *  2. On web, derive from the page's own host so visiting
 *     http://<server-ip>:8081 talks to http://<server-ip>:8787 automatically
 *     (no build-time env needed).
 *  3. localhost fallback (local dev / native simulator).
 */
function resolveApiUrl(): string {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) return env.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:${SERVER_PORT}`;
  }
  return `http://localhost:${SERVER_PORT}`;
}

export const API_URL = resolveApiUrl();

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
