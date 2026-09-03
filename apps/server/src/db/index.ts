import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

const DB_PATH = process.env.DB_PATH ?? 'data.db';

const sqlite = new Database(DB_PATH);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

/** Create tables on first run. Idempotent — safe to call every boot. */
export function ensureSchema(): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS progress (
      user_id TEXT NOT NULL,
      word_id TEXT NOT NULL,
      ease REAL NOT NULL,
      interval INTEGER NOT NULL,
      repetitions INTEGER NOT NULL,
      due INTEGER NOT NULL,
      last_reviewed INTEGER,
      correct_count INTEGER NOT NULL,
      wrong_count INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, word_id)
    );
    CREATE INDEX IF NOT EXISTS idx_progress_sync ON progress (user_id, updated_at);
  `);
}
