import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SyncDoc } from '@ielts/core';
import { API_URL, getToken } from './api';

export interface WordbookEntry {
  /** Lowercased surface form — the unique key. */
  word: string;
  /** The sentence/context the word was marked in. */
  context?: string;
  /** Where it came from, e.g. a reading title. */
  source?: string;
  /** AI definition (Chinese) + example, filled on demand. */
  definition?: string;
  example?: string;
  addedAt: number;
  updatedAt: number;
  deleted?: boolean;
}

const KEY = 'wordbook:v1';
const COLLECTION = 'wordbook';

let cache: WordbookEntry[] | null = null;

async function loadAll(): Promise<WordbookEntry[]> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as WordbookEntry[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

async function persist(): Promise<void> {
  if (cache) await AsyncStorage.setItem(KEY, JSON.stringify(cache));
}

/** Live entries (tombstones excluded), newest first. */
export async function loadWordbook(): Promise<WordbookEntry[]> {
  const all = await loadAll();
  return all.filter((e) => !e.deleted).sort((a, b) => b.addedAt - a.addedAt);
}

export async function addWord(word: string, context?: string, source?: string): Promise<void> {
  const key = word.toLowerCase().trim();
  if (!key) return;
  const all = await loadAll();
  const now = Date.now();
  const existing = all.find((e) => e.word === key);
  if (existing) {
    if (existing.deleted) {
      existing.deleted = false;
      existing.addedAt = now;
      existing.updatedAt = now;
      await persist();
    }
    return;
  }
  all.unshift({ word: key, context, source, addedAt: now, updatedAt: now });
  await persist();
}

export async function setDefinition(word: string, definition: string, example: string): Promise<void> {
  const all = await loadAll();
  const e = all.find((x) => x.word === word.toLowerCase().trim());
  if (e) {
    e.definition = definition;
    e.example = example;
    e.updatedAt = Date.now();
    await persist();
  }
}

export async function removeWord(word: string): Promise<void> {
  const key = word.toLowerCase().trim();
  const all = await loadAll();
  const e = all.find((x) => x.word === key);
  if (e && !e.deleted) {
    e.deleted = true;
    e.updatedAt = Date.now();
    await persist();
  }
}

export async function wordbookCount(): Promise<number> {
  return (await loadWordbook()).length;
}

/** Fetch and cache an AI definition for a word if it doesn't have one yet. */
export async function ensureDefinition(word: string): Promise<WordbookEntry | null> {
  const key = word.toLowerCase().trim();
  const all = await loadAll();
  const e = all.find((x) => x.word === key && !x.deleted);
  if (!e) return null;
  if (e.definition) return e;
  const token = getToken();
  if (!token) return e;
  try {
    const resp = await fetch(`${API_URL}/ai/define`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ word: e.word, context: e.context }),
    });
    if (!resp.ok) return e;
    const data = (await resp.json()) as { definition?: string; example?: string };
    if (data.definition) {
      e.definition = data.definition;
      e.example = data.example ?? '';
      e.updatedAt = Date.now();
      await persist();
    }
    return e;
  } catch {
    return e;
  }
}

export async function clearWordbook(): Promise<void> {
  cache = [];
  await AsyncStorage.removeItem(KEY);
}

// --- sync ---
export async function collectWordbookDocs(since: number): Promise<SyncDoc[]> {
  const all = await loadAll();
  return all
    .filter((e) => e.updatedAt > since)
    .map((e) => ({ collection: COLLECTION, docId: e.word, data: e, updatedAt: e.updatedAt, deleted: !!e.deleted }));
}

export async function applyWordbookDocs(docs: SyncDoc[]): Promise<void> {
  if (!docs.length) return;
  const all = await loadAll();
  let changed = false;
  for (const d of docs) {
    const remote = d.data as WordbookEntry;
    const i = all.findIndex((e) => e.word === d.docId);
    if (i < 0) {
      all.push({ ...remote, deleted: d.deleted });
      changed = true;
    } else if (d.updatedAt > all[i].updatedAt) {
      all[i] = { ...remote, deleted: d.deleted };
      changed = true;
    }
  }
  if (changed) await persist();
}
