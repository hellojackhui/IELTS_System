import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Word } from '@ielts/core';
import { API_URL, getToken } from './api';

export interface Cloze {
  /** English sentence with the target word replaced by "____". */
  en: string;
  /** Chinese translation of the full sentence. */
  zh: string;
}

/**
 * Fetch a context cloze for a word. Cached per-word in AsyncStorage after the
 * first generation, so each word costs one AI call ever. Returns null when
 * unavailable (not logged in, offline, or generation failed) — callers fall
 * back to the plain meaning prompt.
 */
export async function getCloze(word: Word): Promise<Cloze | null> {
  const key = `cloze:v1:${word.id}`;
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) return JSON.parse(cached) as Cloze;
  } catch {
    // ignore cache read errors
  }

  const token = getToken();
  if (!token) return null;

  try {
    const resp = await fetch(`${API_URL}/ai/cloze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ word: word.word, meaning: word.meanings }),
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as { en?: string; zh?: string };
    if (!data?.en) return null;
    const cloze: Cloze = { en: data.en, zh: data.zh ?? '' };
    AsyncStorage.setItem(key, JSON.stringify(cloze)).catch(() => {});
    return cloze;
  } catch {
    return null;
  }
}
