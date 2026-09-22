// Challenge (闯关) levels + question generation. Levels are assembled from the
// scenario phrasebook and the Red Alert sentence bank. Pure logic (no React),
// so the mobile UI and tests can both use it.

import type { Scenario } from './data/scenarios';
import { SCENARIOS as GEN_SCENARIOS } from './data/scenarios';
import { EXTRA_SCENARIOS } from './data/scenarios-extra';
import { raSentencesByUnit } from './data/redalert-sentences';

export interface ChallengeSentence {
  en: string;
  zh: string;
}

export interface ChallengeLevel {
  /** Stable id: `sc:<scenarioId>` or `ra:<game>:<unit>`. */
  id: string;
  title: string;
  kind: 'scenario' | 'ra';
  /** Ionicons name for the level card. */
  icon: string;
  sentences: ChallengeSentence[];
}

/** All challenge levels: every scenario (auto-gen + hand-authored extras) first,
 *  then every Red Alert unit that has translated lines. */
export function buildChallengeLevels(): ChallengeLevel[] {
  const allScenarios = [...GEN_SCENARIOS, ...(EXTRA_SCENARIOS as Scenario[])];
  const scenarioLevels: ChallengeLevel[] = allScenarios.map((s: Scenario) => ({
    id: `sc:${s.id}`,
    title: s.title,
    kind: 'scenario',
    icon: s.icon,
    sentences: s.sentences.map((x) => ({ en: x.en, zh: x.zh })),
  }));

  const raLevels: ChallengeLevel[] = raSentencesByUnit().map((u) => ({
    id: `ra:${u.id}`,
    title: `${u.unit} · ${u.game}`,
    kind: 'ra',
    icon: 'game-controller-outline',
    sentences: u.sentences.map((x) => ({ en: x.en, zh: x.zh })),
  }));

  return [...scenarioLevels, ...raLevels];
}

export type ChallengeQuestionType = 'listen' | 'read';

export interface ChallengeQuestion {
  type: ChallengeQuestionType;
  /** `listen`: the English line to speak. `read`: the Chinese prompt. */
  prompt: string;
  /** Correct answer text (zh for `listen`, en for `read`). */
  answer: string;
  /** 4 options including the answer. */
  options: string[];
}

// Fallbacks keep options well-formed even for levels with very few sentences.
const ZH_FALLBACK = ['你好。', '谢谢。', '我不知道。', '再见。', '没问题。'];
const EN_FALLBACK = ['Yes, sir.', 'Thank you.', "I don't know.", "Let's go.", 'Of course.'];

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickOptions(answer: string, pool: string[], fallback: string[], count = 3): string[] {
  const others = shuffle(pool.filter((x) => x && x !== answer));
  const distractors: string[] = [];
  for (const o of others) {
    if (distractors.length >= count) break;
    if (!distractors.includes(o)) distractors.push(o);
  }
  let fi = 0;
  while (distractors.length < count && fi < fallback.length) {
    const f = fallback[fi++];
    if (f !== answer && !distractors.includes(f)) distractors.push(f);
  }
  return shuffle([answer, ...distractors]).slice(0, count + 1);
}

/**
 * Build a mixed question set for a level: `perType` "listen" questions
 * (hear English, pick Chinese) interleaved with `perType` "read" questions
 * (see Chinese, pick English). Total = perType * 2.
 */
export function buildChallengeQuestions(level: ChallengeLevel, perType = 4): ChallengeQuestion[] {
  const pool = level.sentences;
  if (pool.length === 0) return [];
  const n = Math.min(perType, pool.length);
  const chosen = shuffle(pool).slice(0, n);
  const zhPool = pool.map((s) => s.zh);
  const enPool = pool.map((s) => s.en);

  const listen: ChallengeQuestion[] = chosen.map((s) => ({
    type: 'listen',
    prompt: s.en,
    answer: s.zh,
    options: pickOptions(s.zh, zhPool, ZH_FALLBACK, 3),
  }));
  const read: ChallengeQuestion[] = chosen.map((s) => ({
    type: 'read',
    prompt: s.zh,
    answer: s.en,
    options: pickOptions(s.en, enPool, EN_FALLBACK, 3),
  }));

  const out: ChallengeQuestion[] = [];
  for (let i = 0; i < n; i++) out.push(listen[i], read[i]);
  return out;
}

/** Stars (0–3) from the accuracy of a finished attempt. */
export function starsForScore(correct: number, total: number): number {
  if (total === 0) return 0;
  const pct = correct / total;
  if (pct >= 0.8) return 3;
  if (pct >= 0.6) return 2;
  if (pct >= 0.4) return 1;
  return 0;
}
