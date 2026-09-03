import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { hashPassword, signToken, verifyPassword } from '../auth.js';

export const authRoutes = new Hono();

function validate(email: unknown, password: unknown): string | null {
  if (typeof email !== 'string' || !email.includes('@')) return 'Invalid email';
  if (typeof password !== 'string' || password.length < 6)
    return 'Password must be at least 6 characters';
  return null;
}

authRoutes.post('/register', async (c) => {
  const { email, password } = await c.req.json().catch(() => ({}));
  const err = validate(email, password);
  if (err) return c.json({ error: err }, 400);

  const normalized = (email as string).toLowerCase().trim();
  const existing = db.select().from(users).where(eq(users.email, normalized)).get();
  if (existing) return c.json({ error: 'Email already registered' }, 409);

  const id = randomUUID();
  const createdAt = Date.now();
  db.insert(users)
    .values({ id, email: normalized, passwordHash: await hashPassword(password), createdAt })
    .run();

  const token = await signToken(id);
  return c.json({ token, user: { id, email: normalized, createdAt } }, 201);
});

authRoutes.post('/login', async (c) => {
  const { email, password } = await c.req.json().catch(() => ({}));
  const err = validate(email, password);
  if (err) return c.json({ error: err }, 400);

  const normalized = (email as string).toLowerCase().trim();
  const user = db.select().from(users).where(eq(users.email, normalized)).get();
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return c.json({ error: 'Invalid email or password' }, 401);
  }

  const token = await signToken(user.id);
  return c.json({ token, user: { id: user.id, email: user.email, createdAt: user.createdAt } });
});
