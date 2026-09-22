import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SyncDoc } from '@ielts/core';

const COLLECTION = 'challenge';

/** Per-level local progress for the 闯关 (challenge) system. */
export interface LevelProgress {
  cleared?: boolean;
  /** Best star rating earned, 0–3. */
  bestStars?: number;
  /** Best mixed-test score, 0–100. */
  bestScore?: number;
  updatedAt: number;
}

type ChallengeProgress = Record<string, LevelProgress>;

const KEY = 'challenge-progress:v1';
let cache: ChallengeProgress | null = null;

async function load(): Promise<ChallengeProgress> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as ChallengeProgress) : {};
  } catch {
    cache = {};
  }
  return cache;
}

async function save(p: ChallengeProgress): Promise<void> {
  cache = p;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // best-effort; per-viewer convenience state
  }
}

export async function getChallengeProgress(): Promise<ChallengeProgress> {
  return { ...(await load()) };
}

export async function getLevelProgress(levelId: string): Promise<LevelProgress | undefined> {
  return (await load())[levelId];
}

/** Record a level clear; keeps the best stars/score ever achieved. */
export async function markLevelCleared(
  levelId: string,
  stars: number,
  scorePct: number,
): Promise<LevelProgress> {
  const p = await load();
  const prev = p[levelId];
  const bestStars = Math.max(prev?.bestStars ?? 0, stars);
  const bestScore = Math.max(prev?.bestScore ?? 0, Math.round(scorePct));
  p[levelId] = { ...prev, cleared: true, bestStars, bestScore, updatedAt: Date.now() };
  await save(p);
  return p[levelId];
}

/** Clear all challenge progress (used on sign-out). */
export async function resetChallengeProgress(): Promise<void> {
  cache = {};
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/* ------------------------------ cross-device sync ------------------------------ */

export async function collectChallengeDoc(since: number): Promise<SyncDoc[]> {
  const p = await load();
  const maxUpdated = Object.values(p).reduce((m, u) => Math.max(m, u.updatedAt || 0), 0);
  if (maxUpdated <= since) return [];
  return [{ collection: COLLECTION, docId: 'progress', data: p, updatedAt: maxUpdated }];
}

export async function applyChallengeDoc(doc: SyncDoc | undefined): Promise<void> {
  if (!doc) return;
  const remote = (doc.data as ChallengeProgress) || {};
  const local = await load();
  let changed = false;
  for (const [id, r] of Object.entries(remote)) {
    const l = local[id];
    const newer = !l || (r.updatedAt || 0) > (l.updatedAt || 0);
    const bestStars = Math.max(l?.bestStars ?? 0, r.bestStars ?? 0);
    const bestScore = Math.max(l?.bestScore ?? 0, r.bestScore ?? 0);
    if (newer || bestStars !== (l?.bestStars ?? 0) || bestScore !== (l?.bestScore ?? 0)) {
      local[id] = { ...l, ...r, cleared: l?.cleared || r.cleared, bestStars, bestScore };
      changed = true;
    }
  }
  if (changed) await save(local);
}
