import 'dotenv/config';
import { serve } from '@hono/node-server';
import { app } from './app.js';

const port = Number(process.env.PORT ?? 8787);
// Bind all interfaces by default so the container/host is reachable externally.
const hostname = process.env.HOST ?? '0.0.0.0';

serve({ fetch: app.fetch, port, hostname }, (info) => {
  console.log(`IELTS sync server listening on ${info.address}:${info.port}`);
});
