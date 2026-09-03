import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Context, Next } from 'hono';
import { sign, verify } from 'hono/jwt';

const SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me-in-production';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

const scryptAsync = promisify(scrypt);
const KEYLEN = 64;

/** Hash a password with scrypt. Stored as "salt:hash" (both hex). */
export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(pw, salt, KEYLEN)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const derived = (await scryptAsync(pw, salt, KEYLEN)) as Buffer;
  const keyBuf = Buffer.from(key, 'hex');
  return keyBuf.length === derived.length && timingSafeEqual(keyBuf, derived);
}

export function signToken(userId: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign({ sub: userId, iat: now, exp: now + TOKEN_TTL_SECONDS }, SECRET);
}

/** Reads and verifies the Bearer token, storing `userId` on the context. */
export async function authMiddleware(c: Context, next: Next) {
  const header = c.req.header('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return c.json({ error: 'Missing token' }, 401);
  try {
    const payload = await verify(token, SECRET, 'HS256');
    c.set('userId', payload.sub as string);
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
}
