import type { Question, QuizMode, Word, WordProgress } from './types';
import { WORDS, wordsWithPos } from './words';
import { isDue } from './srs';

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Build the multiple-choice options for a word, preferring same-part-of-speech distractors. */
export function buildChoiceOptions(answer: Word, count = 4): Word[] {
  const sameP = wordsWithPos(answer.pos).filter((w) => w.id !== answer.id);
  const pool = sameP.length >= count - 1 ? sameP : WORDS.filter((w) => w.id !== answer.id);
  const distractors = shuffle(pool).slice(0, count - 1);
  return shuffle([answer, ...distractors]);
}

export function buildQuestion(word: Word, mode: QuizMode): Question {
  if (mode === 'choice') {
    return { word, mode, options: buildChoiceOptions(word) };
  }
  return { word, mode };
}

export interface SessionOptions {
  mode: QuizMode;
  size: number;
  /** Existing progress keyed by wordId. Omit for a pure-random session. */
  progress?: Record<string, WordProgress>;
  /** When true, include ONLY words that are currently due (for a review session). */
  dueOnly?: boolean;
  now?: number;
}

/**
 * Assemble a study session. When progress is supplied, due words come first
 * (oldest due first), then brand-new words, then a random top-up. Without
 * progress it is a plain random draw. With `dueOnly`, only due words are used.
 */
export function buildSession(opts: SessionOptions): Question[] {
  const { mode, size, progress, dueOnly, now = Date.now() } = opts;

  if (dueOnly) {
    const due = WORDS.filter((w) => progress?.[w.id] && isDue(progress[w.id], now)).sort(
      (a, b) => progress![a.id].due - progress![b.id].due,
    );
    return due.slice(0, size).map((w) => buildQuestion(w, mode));
  }

  let picked: Word[];

  if (progress) {
    const due = WORDS.filter((w) => progress[w.id] && isDue(progress[w.id], now)).sort(
      (a, b) => progress[a.id].due - progress[b.id].due,
    );
    const fresh = shuffle(WORDS.filter((w) => !progress[w.id]));
    const ordered = [...due, ...fresh];
    picked = ordered.slice(0, size);
    if (picked.length < size) {
      const chosen = new Set(picked.map((w) => w.id));
      const filler = shuffle(WORDS.filter((w) => !chosen.has(w.id)));
      picked = [...picked, ...filler.slice(0, size - picked.length)];
    }
  } else {
    picked = shuffle(WORDS).slice(0, size);
  }

  return picked.map((w) => buildQuestion(w, mode));
}

/** Case- and whitespace-insensitive answer check for typed modes. */
export function checkSpelling(input: string, word: Word): boolean {
  return input.trim().toLowerCase() === word.id;
}
