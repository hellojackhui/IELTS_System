import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatMessage, SyncDoc } from '@ielts/core';

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  /** Tombstone flag for sync; deleted conversations are hidden but retained. */
  deleted?: boolean;
}

const KEY = 'conversations:v1';
const COLLECTION = 'conversations';

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

let cache: Conversation[] | null = null;

async function loadAll(): Promise<Conversation[]> {
  if (cache) return cache;
  const raw = await AsyncStorage.getItem(KEY);
  cache = raw ? (JSON.parse(raw) as Conversation[]) : [];
  return cache;
}

async function persist(): Promise<void> {
  if (cache) await AsyncStorage.setItem(KEY, JSON.stringify(cache));
}

/** Most-recently-updated first, tombstones excluded. */
export async function listConversations(): Promise<Conversation[]> {
  const all = await loadAll();
  return all.filter((c) => !c.deleted).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function newConversation(): Conversation {
  const now = Date.now();
  return { id: uid(), title: '新对话', createdAt: now, updatedAt: now, messages: [] };
}

export async function saveConversation(conv: Conversation): Promise<Conversation> {
  const all = await loadAll();
  const updated: Conversation = { ...conv, updatedAt: Date.now() };
  if (updated.title === '新对话') {
    const firstUser = updated.messages.find((m) => m.role === 'user');
    if (firstUser) updated.title = firstUser.content.trim().slice(0, 18) || '新对话';
  }
  const i = all.findIndex((c) => c.id === updated.id);
  if (i >= 0) all[i] = updated;
  else all.push(updated);
  await persist();
  return updated;
}

export async function deleteConversation(id: string): Promise<void> {
  const all = await loadAll();
  const i = all.findIndex((c) => c.id === id);
  if (i >= 0) {
    all[i] = { ...all[i], deleted: true, messages: [], updatedAt: Date.now() };
    await persist();
  }
}

export async function clearConversations(): Promise<void> {
  cache = [];
  await AsyncStorage.removeItem(KEY);
}

// --- sync ---
export async function collectConversationDocs(since: number): Promise<SyncDoc[]> {
  const all = await loadAll();
  return all
    .filter((c) => c.updatedAt > since)
    .map((c) => ({ collection: COLLECTION, docId: c.id, data: c, updatedAt: c.updatedAt, deleted: !!c.deleted }));
}

export async function applyConversationDocs(docs: SyncDoc[]): Promise<void> {
  if (!docs.length) return;
  const all = await loadAll();
  let changed = false;
  for (const d of docs) {
    const remote = d.data as Conversation;
    const i = all.findIndex((c) => c.id === d.docId);
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
