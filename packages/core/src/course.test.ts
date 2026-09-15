import { describe, expect, it } from 'vitest';
import {
  COURSE_CHAPTERS,
  COURSE_UNITS,
  buildArticleCloze,
  buildUnitChoiceQuestions,
  chapterUnits,
  courseWordMeaning,
  getUnit,
} from './course';

describe('course data', () => {
  it('has 11 chapters and non-empty units', () => {
    expect(COURSE_CHAPTERS).toHaveLength(11);
    expect(COURSE_UNITS.length).toBeGreaterThan(40);
    for (const u of COURSE_UNITS) {
      expect(u.words.length).toBeGreaterThan(0);
      expect(u.targets.length).toBeGreaterThan(0);
      expect(u.articleEn).toContain('{{');
    }
  });

  it('every chapter unitId resolves to a unit', () => {
    for (const ch of COURSE_CHAPTERS) {
      expect(chapterUnits(ch.chapter).length).toBe(ch.unitIds.length);
      for (const id of ch.unitIds) expect(getUnit(id)).toBeDefined();
    }
  });
});

describe('courseWordMeaning', () => {
  it('resolves a Chinese meaning for a common word', () => {
    const u = getUnit('c1p1')!;
    const atmosphere = u.words.find((w) => w.word === 'atmosphere')!;
    expect(courseWordMeaning(atmosphere)).toMatch(/大气/);
  });

  it('always returns a non-empty string', () => {
    for (const u of COURSE_UNITS) {
      for (const w of u.words) expect(courseWordMeaning(w).length).toBeGreaterThan(0);
    }
  });
});

describe('buildArticleCloze', () => {
  it('caps blanks and keeps bank in sync with blanks', () => {
    const u = getUnit('c3p1') ?? COURSE_UNITS[0];
    const cz = buildArticleCloze(u, 12);
    const blanks = cz.parts.filter((p) => p.kind === 'blank');
    expect(blanks.length).toBeLessThanOrEqual(12);
    expect(cz.bank.length).toBe(blanks.length);
    expect(cz.count).toBe(blanks.length);
    // every blank's answer is present in the bank (case-insensitive)
    const bank = new Set(cz.bank.map((b) => b.toLowerCase()));
    for (const b of blanks) expect(bank.has((b as { answer: string }).answer.toLowerCase())).toBe(true);
  });

  it('blanks each unique target at most once', () => {
    const cz = buildArticleCloze(getUnit('c1p1')!, 99);
    const keys = cz.parts.filter((p) => p.kind === 'blank').map((p) => (p as { key: string }).key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('buildUnitChoiceQuestions', () => {
  it('produces questions whose answer is among the options and prompt has a blank', () => {
    const qs = buildUnitChoiceQuestions(getUnit('c1p1')!, 5);
    expect(qs.length).toBeGreaterThan(0);
    for (const q of qs) {
      expect(q.options).toContain(q.answer);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.prompt).toContain('_____');
    }
  });
});
