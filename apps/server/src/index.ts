import 'dotenv/config';
import { serve } from '@hono/node-server';
import { WORD_COUNT } from '@ielts/core';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ensureSchema } from './db/index.js';
import { aiRoutes } from './routes/ai.js';
import { authRoutes } from './routes/auth.js';
import { syncRoutes } from './routes/sync.js';

ensureSchema();

const app = new Hono();

app.use('*', cors());

app.get('/health', (c) => c.json({ ok: true, words: WORD_COUNT, time: Date.now() }));

app.route('/auth', authRoutes);
app.route('/sync', syncRoutes);
app.route('/ai', aiRoutes);

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`IELTS sync server listening on http://localhost:${info.port}`);
});
