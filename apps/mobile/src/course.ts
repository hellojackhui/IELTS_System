import AsyncStorage from '@react-native-async-storage/async-storage';

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
