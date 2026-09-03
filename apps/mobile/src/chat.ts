import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChatMessage } from '@ielts/core';

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

const KEY = 'conversations:v1';

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

/** Most-recently-updated first. */
export async function listConversations(): Promise<Conversation[]> {
  const all = await loadAll();
  return [...all].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function newConversation(): Conversation {
  const now = Date.now();
  return { id: uid(), title: '新对话', createdAt: now, updatedAt: now, messages: [] };
}

/** Insert or update; auto-titles from the first user message. */
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
    all.splice(i, 1);
    await persist();
  }
}
