import { beforeAll, describe, expect, it } from 'vitest';
import type { Hono } from 'hono';

// Configure an isolated in-memory DB before the app (and its db) is imported.
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';

let app: Hono;
let token = '';

const json = (body: unknown) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const auth = (extra: Record<string, string> = {}) => ({ Authorization: `Bearer ${token}`, ...extra });

beforeAll(async () => {
  ({ app } = await import('../src/app.js'));
});

describe('auth', () => {
  it('registers a new user and returns a token', async () => {
    const res = await app.request('/auth/register', json({ email: 'a@test.com', password: 'secret123' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.user.email).toBe('a@test.com');
    expect(typeof body.token).toBe('string');
    token = body.token;
  });

  it('rejects duplicate registration', async () => {
    const res = await app.request('/auth/register', json({ email: 'a@test.com', password: 'secret123' }));
    expect(res.status).toBe(409);
  });

  it('rejects a wrong password', async () => {
    const res = await app.request('/auth/login', json({ email: 'a@test.com', password: 'wrongpass' }));
    expect(res.status).toBe(401);
  });

  it('logs in with correct credentials', async () => {
    const res = await app.request('/auth/login', json({ email: 'a@test.com', password: 'secret123' }));
    expect(res.status).toBe(200);
    expect((await res.json()).user.email).toBe('a@test.com');
  });
});

describe('progress sync (last-write-wins)', () => {
  const mk = (updatedAt: number, ease: number) => ({
    wordId: 'atmosphere',
    ease,
    interval: 1,
    repetitions: 1,
    due: 1000,
    lastReviewed: 900,
    correctCount: 1,
    wrongCount: 0,
    updatedAt,
  });

  it('rejects requests without a token', async () => {
    const res = await app.request('/sync/pull?since=0');
    expect(res.status).toBe(401);
  });

  it('pushes and pulls progress', async () => {
    const push = await app.request('/sync/push', {
      ...json({ changes: [mk(1000, 2.6)] }),
      headers: auth({ 'Content-Type': 'application/json' }),
    });
    expect((await push.json()).applied).toBe(1);

    const pull = await app.request('/sync/pull?since=0', { headers: auth() });
    const rows = (await pull.json()).progress;
    expect(rows).toHaveLength(1);
    expect(rows[0].ease).toBe(2.6);
  });

  it('ignores a stale update but applies a newer one', async () => {
    const stale = await app.request('/sync/push', {
      ...json({ changes: [mk(500, 9.9)] }),
      headers: auth({ 'Content-Type': 'application/json' }),
    });
    expect((await stale.json()).applied).toBe(0);

    const fresh = await app.request('/sync/push', {
      ...json({ changes: [mk(2000, 2.8)] }),
      headers: auth({ 'Content-Type': 'application/json' }),
    });
    expect((await fresh.json()).applied).toBe(1);

    const pull = await app.request('/sync/pull?since=0', { headers: auth() });
    expect((await pull.json()).progress[0].ease).toBe(2.8);
  });
});

describe('generic document sync', () => {
  it('syncs docs with tombstones and last-write-wins', async () => {
    const push = await app.request('/sync/docs/push', {
      ...json({
        changes: [
          { collection: 'conversations', docId: 'c1', data: { id: 'c1', title: 'hi' }, updatedAt: 1000 },
          { collection: 'wordbook', docId: 'inevitable', data: { word: 'inevitable' }, updatedAt: 1000 },
        ],
      }),
      headers: auth({ 'Content-Type': 'application/json' }),
    });
    expect((await push.json()).applied).toBe(2);

    // tombstone the wordbook entry
    const del = await app.request('/sync/docs/push', {
      ...json({
        changes: [{ collection: 'wordbook', docId: 'inevitable', data: {}, updatedAt: 2000, deleted: true }],
      }),
      headers: auth({ 'Content-Type': 'application/json' }),
    });
    expect((await del.json()).applied).toBe(1);

    const pull = await app.request('/sync/docs/pull?since=0', { headers: auth() });
    const docs = (await pull.json()).docs as { collection: string; deleted: boolean }[];
    const wb = docs.find((d) => d.collection === 'wordbook')!;
    expect(wb.deleted).toBe(true);
    const conv = docs.find((d) => d.collection === 'conversations')!;
    expect(conv.deleted).toBe(false);
  });
});
