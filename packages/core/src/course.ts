import { COURSE_CHAPTERS, COURSE_UNITS } from './data/course';
import type { CourseChapter, CourseUnit, CourseWord } from './data/course';
import { getWord } from './words';

export { COURSE_CHAPTERS, COURSE_UNITS };
export type { CourseChapter, CourseUnit, CourseWord };

export const COURSE_CHAPTER_COUNT = COURSE_CHAPTERS.length;
export const COURSE_UNIT_COUNT = COURSE_UNITS.length;
export const COURSE_WORD_COUNT = COURSE_UNITS.reduce((n, u) => n + u.words.length, 0);

const UNIT_BY_ID = new Map(COURSE_UNITS.map((u) => [u.id, u]));

export function getUnit(id: string): CourseUnit | undefined {
  return UNIT_BY_ID.get(id);
}

export function getChapter(chapter: number): CourseChapter | undefined {
  return COURSE_CHAPTERS.find((c) => c.chapter === chapter);
}

/** Units of a chapter, in order. */
export function chapterUnits(chapter: number): CourseUnit[] {
  const ch = getChapter(chapter);
  return ch ? ch.unitIds.map((id) => UNIT_BY_ID.get(id)!).filter(Boolean) : [];
}

const CJK = /[一-鿿]/;

/**
 * Best short meaning to show for a course word: the main word list's Chinese
 * meaning first (covers ~97%), else a Chinese meaning scraped from the course,
 * else the first English definition.
 */
export function courseWordMeaning(cw: CourseWord): string {
  const w = getWord(cw.word.toLowerCase().trim());
  if (w?.meanings) return w.meanings;
  const zh = cw.defs.find((d) => CJK.test(d));
  return zh ?? cw.defs[0] ?? '';
}

/** The article as plain reading text, with the {{word}} markers unwrapped. */
export function articlePlain(unit: CourseUnit): string {
  return unit.articleEn.replace(/\{\{(.*?)\}\}/g, '$1');
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type ClozePart =
  | { kind: 'text'; text: string }
  | { kind: 'blank'; answer: string; key: string };

export interface ArticleCloze {
  parts: ClozePart[];
  /** Shuffled word-bank tiles — one per unique blank. */
  bank: string[];
  /** Number of blanks (== bank.length). */
  count: number;
}

/**
 * Turn a unit's `{{word}}`-tokenised article into an ordered list of text runs
 * and blanks, plus a shuffled word bank. Each unique target (case-insensitive)
 * is blanked at its FIRST occurrence; later occurrences render as plain text,
 * so every blank has exactly one matching tile.
 */
export function buildArticleCloze(unit: CourseUnit, maxBlanks = 12): ArticleCloze {
  const seen = new Set<string>();
  const parts: ClozePart[] = [];
  const bank: string[] = [];
  const re = /\{\{(.*?)\}\}/g;
  const s = unit.articleEn;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    const before = s.slice(last, m.index);
    if (before) parts.push({ kind: 'text', text: before });
    const word = m[1];
    const key = word.toLowerCase();
    // Blank each unique target once, up to maxBlanks; everything else is text so
    // large units stay a readable, bounded exercise.
    if (seen.has(key) || bank.length >= maxBlanks) {
      parts.push({ kind: 'text', text: word });
    } else {
      seen.add(key);
      parts.push({ kind: 'blank', answer: word, key });
      bank.push(word);
    }
    last = m.index + m[0].length;
  }
  const tail = s.slice(last);
  if (tail) parts.push({ kind: 'text', text: tail });
  return { parts, bank: shuffle(bank), count: bank.length };
}

export interface UnitChoiceQuestion {
  word: string;
  /** A sentence from the article with the target word replaced by "_____". */
  prompt: string;
  /** Shuffled options (the answer + same-unit distractors). */
  options: string[];
  answer: string;
}

/** Split article text (plain, no markers) into sentences. */
function sentences(text: string): string[] {
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Build "example-sentence cloze" multiple-choice questions from a unit: for up
 * to `limit` target words, take a sentence containing the word, blank that word,
 * and offer the answer plus distractors drawn from the unit's other targets.
 */
export function buildUnitChoiceQuestions(unit: CourseUnit, limit = 8, optionCount = 4): UnitChoiceQuestion[] {
  const plain = articlePlain(unit);
  const sents = sentences(plain);
  const targets = [...new Set(unit.targets)];
  const pool = [...new Set(unit.targets.map((t) => t.trim()))].filter(Boolean);
  const out: UnitChoiceQuestion[] = [];
  for (const word of shuffle(targets)) {
    if (out.length >= limit) break;
    const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const sent = sents.find((s) => re.test(s));
    if (!sent) continue;
    const prompt = sent.replace(re, '_____');
    const distractors = shuffle(pool.filter((w) => w.toLowerCase() !== word.toLowerCase())).slice(0, optionCount - 1);
    out.push({ word, prompt, answer: word, options: shuffle([word, ...distractors]) });
  }
  return out;
}
