import { describe, expect, it } from 'vitest';
import { buildChoiceOptions, buildQuestion, buildSession, checkSpelling } from './quiz';
import { newProgress } from './srs';
import { WORDS, getWord } from './words';
import type { WordProgress } from './types';

describe('checkSpelling', () => {
  const w = WORDS[0];
  it('is case- and whitespace-insensitive', () => {
    expect(checkSpelling(`  ${w.word.toUpperCase()} `, w)).toBe(true);
  });
  it('rejects wrong input', () => {
    expect(checkSpelling('definitelynotthisword', w)).toBe(false);
  });
});

describe('buildChoiceOptions', () => {
  const answer = WORDS.find((w) => w.pos === 'n.')!;
  it('returns the requested count including the answer', () => {
    const opts = buildChoiceOptions(answer, 4);
    expect(opts).toHaveLength(4);
    expect(opts.some((o) => o.id === answer.id)).toBe(true);
  });
  it('has no duplicate options', () => {
    const opts = buildChoiceOptions(answer, 4);
    expect(new Set(opts.map((o) => o.id)).size).toBe(opts.length);
  });
  it('prefers same-part-of-speech distractors', () => {
    const opts = buildChoiceOptions(answer, 4);
    expect(opts.every((o) => o.pos === answer.pos)).toBe(true);
  });
});

describe('buildQuestion', () => {
  it('attaches options only for choice mode', () => {
    expect(buildQuestion(WORDS[0], 'spelling').options).toBeUndefined();
    expect(buildQuestion(WORDS[0], 'choice').options).toHaveLength(4);
  });
});

describe('buildSession', () => {
  it('returns the requested size of distinct words', () => {
    const s = buildSession({ mode: 'spelling', size: 15 });
    expect(s).toHaveLength(15);
    expect(new Set(s.map((q) => q.word.id)).size).toBe(15);
  });

  it('dueOnly returns only currently-due words', () => {
    const now = 2_000_000_000_000;
    const dueWord = WORDS[5];
    const freshWord = WORDS[6];
    const progress: Record<string, WordProgress> = {
      [dueWord.id]: { ...newProgress(dueWord.id, now - 10_000), due: now - 1 },
      [freshWord.id]: { ...newProgress(freshWord.id, now), due: now + 999_999 },
    };
    const s = buildSession({ mode: 'spelling', size: 20, progress, dueOnly: true, now });
    expect(s).toHaveLength(1);
    expect(s[0].word.id).toBe(dueWord.id);
  });

  it('dueOnly with nothing due yields an empty session', () => {
    const now = 2_000_000_000_000;
    const w = WORDS[7];
    const progress = { [w.id]: { ...newProgress(w.id, now), due: now + 999_999 } };
    expect(buildSession({ mode: 'choice', size: 20, progress, dueOnly: true, now })).toHaveLength(0);
  });
});

describe('word data', () => {
  it('parses pos and meanings, and is retrievable by id', () => {
    const w = getWord('atmosphere');
    expect(w).toBeDefined();
    expect(w!.pos).toBe('n.');
    expect(w!.meanings.length).toBeGreaterThan(0);
  });
});
