import AsyncStorage from '@react-native-async-storage/async-storage';
import { newProgress, schedule, type ApiClient, type WordProgress } from '@ielts/core';

const PROGRESS_KEY = 'progress:v1';
const SYNC_KEY = 'lastSync:v1';

type ProgressMap = Record<string, WordProgress>;

let cache: ProgressMap | null = null;

export async function loadProgress(): Promise<ProgressMap> {
  if (cache) return cache;
  const raw = await AsyncStorage.getItem(PROGRESS_KEY);
  cache = raw ? (JSON.parse(raw) as ProgressMap) : {};
  return cache;
}

async function persist(): Promise<void> {
  if (cache) await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(cache));
}

export async function recordAnswer(wordId: string, correct: boolean): Promise<void> {
  const map = await loadProgress();
  const prev = map[wordId] ?? newProgress(wordId);
  map[wordId] = schedule(prev, correct);
  await persist();
}

export interface Stats {
  learned: number;
  due: number;
  mastered: number;
}

export async function getStats(now: number = Date.now()): Promise<Stats> {
  const map = await loadProgress();
  const all = Object.values(map);
  return {
    learned: all.length,
    due: all.filter((p) => p.due <= now).length,
    mastered: all.filter((p) => p.repetitions >= 3).length,
  };
}

/** Push local changes then pull remote changes, merging last-write-wins. */
export async function syncNow(client: ApiClient): Promise<{ pushed: number; pulled: number }> {
  const map = await loadProgress();
  const lastSync = Number((await AsyncStorage.getItem(SYNC_KEY)) ?? 0);

  const changes = Object.values(map).filter((p) => p.updatedAt > lastSync);
  if (changes.length) await client.push(changes);

  const { serverTime, progress } = await client.pull(lastSync);
  for (const remote of progress) {
    const local = map[remote.wordId];
    if (!local || remote.updatedAt > local.updatedAt) map[remote.wordId] = remote;
  }
  await persist();
  await AsyncStorage.setItem(SYNC_KEY, String(serverTime));

  return { pushed: changes.length, pulled: progress.length };
}

/** Wipe the local sync watermark and progress — used on sign-out to avoid cross-account bleed. */
export async function resetLocal(): Promise<void> {
  cache = {};
  await AsyncStorage.multiRemove([PROGRESS_KEY, SYNC_KEY]);
}
