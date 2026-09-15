import { COURSE_CHAPTERS as DANKYING_CHAPTERS, COURSE_UNITS as DANKYING_UNITS } from './data/course';
import { COURSE_EXTRA_CHAPTERS, COURSE_EXTRA_UNITS } from './data/course-extra';
import { COURSE_EXAMPLES } from './data/course-examples';
import type { CourseChapter, CourseUnit, CourseWord } from './data/course';
import { getWord } from './words';

export { COURSE_EXAMPLES };

/** A natural example sentence for a course word (from the mundi-xu book), if any. */
export function courseWordExample(word: string): string | undefined {
  return COURSE_EXAMPLES[word.toLowerCase().trim()];
}

/** Chapters 1–11 come from the dankying book (real articles); 12–22 are sliced
 *  from the main word list at theme boundaries with AI-generated articles. */
export const COURSE_CHAPTERS: CourseChapter[] = [...DANKYING_CHAPTERS, ...COURSE_EXTRA_CHAPTERS];
export const COURSE_UNITS: CourseUnit[] = [...DANKYING_UNITS, ...COURSE_EXTRA_UNITS];
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
 * to `limit` of the unit's words, take that word's own example sentence, blank
 * the word out, and offer the answer plus distractors drawn from the unit's
 * other words. Falls back to a sentence from the article when a word has no
 * example.
 */
export function buildUnitChoiceQuestions(unit: CourseUnit, limit = 6, optionCount = 4): UnitChoiceQuestion[] {
  const pool = [...new Set(unit.words.map((w) => w.word.trim()))].filter(Boolean);
  const articleSents = sentences(articlePlain(unit));
  const out: UnitChoiceQuestion[] = [];
  for (const w of shuffle(unit.words)) {
    if (out.length >= limit) break;
    const word = w.word.trim();
    const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${esc}\\b`, 'i');
    let sent = courseWordExample(word);
    if (!sent || !re.test(sent)) sent = articleSents.find((s) => re.test(s));
    if (!sent) continue;
    const prompt = sent.replace(re, '_____');
    if (!prompt.includes('_____')) continue;
    const distractors = shuffle(pool.filter((x) => x.toLowerCase() !== word.toLowerCase())).slice(0, optionCount - 1);
    out.push({ word, prompt, answer: word, options: shuffle([word, ...distractors]) });
  }
  return out;
}
