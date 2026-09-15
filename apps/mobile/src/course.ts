import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SyncDoc } from '@ielts/core';

const COLLECTION = 'course';

/** Per-unit local progress for the vocabulary course. */
export interface UnitProgress {
  learned?: boolean;
  /** Best mixed-test score, 0–100. */
  testBest?: number;
  updatedAt: number;
}

type CourseProgress = Record<string, UnitProgress>;

const KEY = 'course-progress:v1';
let cache: CourseProgress | null = null;

async function load(): Promise<CourseProgress> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as CourseProgress) : {};
  } catch {
    cache = {};
  }
  return cache;
}

async function save(p: CourseProgress): Promise<void> {
  cache = p;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // best-effort; per-viewer convenience state
  }
}

export async function getCourseProgress(): Promise<CourseProgress> {
  return { ...(await load()) };
}

export async function getUnitProgress(unitId: string): Promise<UnitProgress | undefined> {
  return (await load())[unitId];
}

export async function markUnitLearned(unitId: string): Promise<void> {
  const p = await load();
  p[unitId] = { ...p[unitId], learned: true, updatedAt: Date.now() };
  await save(p);
}

export async function recordUnitTest(unitId: string, scorePct: number): Promise<void> {
  const p = await load();
  const prev = p[unitId]?.testBest ?? 0;
  p[unitId] = { ...p[unitId], testBest: Math.max(prev, Math.round(scorePct)), updatedAt: Date.now() };
  await save(p);
}

/** Clear all course progress (used on sign-out). */
export async function resetCourseProgress(): Promise<void> {
  cache = {};
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/* ------------------------------ cross-device sync ------------------------------ */
// The whole progress map rides as one synced document; on apply we merge per
// unit (newest wins, and the higher test score is always kept) so progress made
// on one device never clobbers the other.

export async function collectCourseDoc(since: number): Promise<SyncDoc[]> {
  const p = await load();
  const maxUpdated = Object.values(p).reduce((m, u) => Math.max(m, u.updatedAt || 0), 0);
  if (maxUpdated <= since) return [];
  return [{ collection: COLLECTION, docId: 'progress', data: p, updatedAt: maxUpdated }];
}

export async function applyCourseDoc(doc: SyncDoc | undefined): Promise<void> {
  if (!doc) return;
  const remote = (doc.data as CourseProgress) || {};
  const local = await load();
  let changed = false;
  for (const [id, r] of Object.entries(remote)) {
    const l = local[id];
    const newer = !l || (r.updatedAt || 0) > (l.updatedAt || 0);
    const bestTest = Math.max(l?.testBest ?? 0, r.testBest ?? 0);
    if (newer) {
      local[id] = { ...l, ...r, testBest: bestTest || undefined, learned: l?.learned || r.learned };
      changed = true;
    } else if (bestTest !== (l.testBest ?? 0)) {
      local[id] = { ...l, testBest: bestTest };
      changed = true;
    }
  }
  if (changed) await save(local);
}
