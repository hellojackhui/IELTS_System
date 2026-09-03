import type { WordProgress } from '@ielts/core';
import { and, eq, gt } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from '../db/index.js';
import { progress } from '../db/schema.js';
import { authMiddleware } from '../auth.js';

export const syncRoutes = new Hono();

syncRoutes.use('*', authMiddleware);

/** Return every progress row changed since the client's last sync watermark. */
syncRoutes.get('/pull', (c) => {
  const userId = c.get('userId') as string;
  const since = Number(c.req.query('since') ?? 0);

  const rows = db
    .select()
    .from(progress)
    .where(and(eq(progress.userId, userId), gt(progress.updatedAt, since)))
    .all();

  const result: WordProgress[] = rows.map((r) => ({
    wordId: r.wordId,
    ease: r.ease,
    interval: r.interval,
    repetitions: r.repetitions,
    due: r.due,
    lastReviewed: r.lastReviewed,
    correctCount: r.correctCount,
    wrongCount: r.wrongCount,
    updatedAt: r.updatedAt,
  }));

  return c.json({ serverTime: Date.now(), progress: result });
});

/** Upsert client changes, keeping whichever version has the newer updatedAt. */
syncRoutes.post('/push', async (c) => {
  const userId = c.get('userId') as string;
  const body = await c.req.json().catch(() => ({}));
  const changes: WordProgress[] = Array.isArray(body?.changes) ? body.changes : [];

  let applied = 0;
  db.transaction((tx) => {
    for (const p of changes) {
      if (typeof p?.wordId !== 'string') continue;
      const existing = tx
        .select({ updatedAt: progress.updatedAt })
        .from(progress)
        .where(and(eq(progress.userId, userId), eq(progress.wordId, p.wordId)))
        .get();
      if (existing && existing.updatedAt >= p.updatedAt) continue;

      tx.insert(progress)
        .values({ userId, ...p })
        .onConflictDoUpdate({
          target: [progress.userId, progress.wordId],
          set: {
            ease: p.ease,
            interval: p.interval,
            repetitions: p.repetitions,
            due: p.due,
            lastReviewed: p.lastReviewed,
            correctCount: p.correctCount,
            wrongCount: p.wrongCount,
            updatedAt: p.updatedAt,
          },
        })
        .run();
      applied++;
    }
  });

  return c.json({ serverTime: Date.now(), applied });
});
