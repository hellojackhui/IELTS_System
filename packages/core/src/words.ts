import { RAW_WORDS } from './data/words';
import type { Word } from './types';

const POS_RE = /^((?:n|v|adj|adv|prep|conj|pron|det|num|int|abbr|aux|vi|vt)\.)/;

function parse([word, raw]: [string, string]): Word {
  const id = word.toLowerCase().trim();
  let pos = '';
  let meanings = raw;
  const m = raw.match(POS_RE);
  if (m) {
    pos = m[1];
    meanings = raw.slice(m[1].length).trim();
  }
  return { id, word: word.trim(), pos, meanings, raw };
}

/** The full, parsed word list. Index order is stable (append-only). */
export const WORDS: Word[] = RAW_WORDS.map(parse);

export const WORD_COUNT = WORDS.length;

const BY_ID = new Map<string, Word>(WORDS.map((w) => [w.id, w]));

export function getWord(id: string): Word | undefined {
  return BY_ID.get(id);
}

/** Words grouped by part of speech, used to build plausible distractors. */
const BY_POS = new Map<string, Word[]>();
for (const w of WORDS) {
  const list = BY_POS.get(w.pos) ?? [];
  list.push(w);
  BY_POS.set(w.pos, list);
}

export function wordsWithPos(pos: string): Word[] {
  return BY_POS.get(pos) ?? [];
}
