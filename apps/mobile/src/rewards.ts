import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Rewards {
  /** Last active local date, YYYY-MM-DD. */
  lastActive: string;
  /** Consecutive active days ending at lastActive. */
  streak: number;
  /** Best streak ever. */
  best: number;
  /** Accumulated points. */
  points: number;
  /** Total distinct active days. */
  days: number;
}

const KEY = 'rewards:v1';
const EMPTY: Rewards = { lastActive: '', streak: 0, best: 0, points: 0, days: 0 };

function dateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

let cache: Rewards | null = null;

export async function getRewards(): Promise<Rewards> {
  if (cache) return cache;
  let r: Rewards;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    r = raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Rewards>) } : { ...EMPTY };
  } catch {
    r = { ...EMPTY };
  }
  cache = r;
  return r;
}

/**
 * Record study activity: auto check-in for today (updating the streak once per
 * day) and add points. Call once per answered question.
 */
export async function recordActivity(pointsEarned: number): Promise<Rewards> {
  const r = await getRewards();
  const now = new Date();
  const today = dateStr(now);

  if (r.lastActive !== today) {
    const yesterday = dateStr(new Date(now.getTime() - 86_400_000));
    r.streak = r.lastActive === yesterday ? r.streak + 1 : 1;
    r.best = Math.max(r.best, r.streak);
    r.days += 1;
    r.lastActive = today;
  }
  r.points += pointsEarned;

  cache = r;
  await AsyncStorage.setItem(KEY, JSON.stringify(r)).catch(() => {});
  return r;
}

export interface Badge {
  id: string;
  label: string;
  icon: string; // Ionicons name
  unlocked: boolean;
}

/** Milestone badges derived from rewards + learned-word count. */
export function computeBadges(r: Rewards, learned: number, mastered: number): Badge[] {
  return [
    { id: 'streak3', label: '连续 3 天', icon: 'flame-outline', unlocked: r.best >= 3 },
    { id: 'streak7', label: '连续 7 天', icon: 'flame', unlocked: r.best >= 7 },
    { id: 'streak30', label: '连续 30 天', icon: 'bonfire', unlocked: r.best >= 30 },
    { id: 'learn50', label: '学过 50 词', icon: 'leaf-outline', unlocked: learned >= 50 },
    { id: 'learn300', label: '学过 300 词', icon: 'school-outline', unlocked: learned >= 300 },
    { id: 'master100', label: '掌握 100 词', icon: 'ribbon-outline', unlocked: mastered >= 100 },
    { id: 'pts500', label: '500 积分', icon: 'star-outline', unlocked: r.points >= 500 },
    { id: 'pts2000', label: '2000 积分', icon: 'star', unlocked: r.points >= 2000 },
  ];
}
