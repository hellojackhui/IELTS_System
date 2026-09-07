import { describe, expect, it } from 'vitest';
import { isDue, newProgress, schedule } from './srs';

const DAY = 86_400_000;
const NOW = 1_000_000_000_000;

describe('newProgress', () => {
  it('starts due immediately with default ease', () => {
    const p = newProgress('atmosphere', NOW);
    expect(p.wordId).toBe('atmosphere');
    expect(p.repetitions).toBe(0);
    expect(p.interval).toBe(0);
    expect(p.ease).toBe(2.5);
    expect(p.due).toBe(NOW);
    expect(isDue(p, NOW)).toBe(true);
  });
});

describe('schedule — correct answers', () => {
  it('grows through the Ebbinghaus early steps then SM-2', () => {
    let p = newProgress('w', NOW);
    p = schedule(p, true, NOW);
    expect(p.repetitions).toBe(1);
    expect(p.interval).toBeCloseTo(0.25); // ~6h, same day
    expect(p.correctCount).toBe(1);

    p = schedule(p, true, NOW);
    expect(p.repetitions).toBe(2);
    expect(p.interval).toBe(1);

    p = schedule(p, true, NOW);
    expect(p.repetitions).toBe(3);
    expect(p.interval).toBe(3);

    const easeBefore = p.ease;
    p = schedule(p, true, NOW);
    expect(p.repetitions).toBe(4);
    expect(p.interval).toBe(Math.round(3 * easeBefore));
  });

  it('raises ease and sets due from interval', () => {
    const p = schedule(newProgress('w', NOW), true, NOW);
    expect(p.ease).toBeCloseTo(2.6);
    expect(p.due).toBe(NOW + p.interval * DAY);
    expect(p.lastReviewed).toBe(NOW);
  });
});

describe('schedule — wrong answers', () => {
  it('resets reps, comes back in ~10 min, lowers ease', () => {
    let p = schedule(newProgress('w', NOW), true, NOW); // ease 2.6
    p = schedule(p, false, NOW);
    expect(p.repetitions).toBe(0);
    expect(p.wrongCount).toBe(1);
    expect(p.interval).toBeCloseTo(10 / (24 * 60));
    expect(p.due).toBe(NOW + p.interval * DAY);
    expect(p.ease).toBeCloseTo(2.4);
  });

  it('never drops ease below 1.3', () => {
    let p = newProgress('w', NOW);
    for (let i = 0; i < 20; i++) p = schedule(p, false, NOW);
    expect(p.ease).toBe(1.3);
  });
});

describe('isDue', () => {
  it('is false before the due time and true after', () => {
    const p = schedule(newProgress('w', NOW), true, NOW); // due ~6h out
    expect(isDue(p, NOW)).toBe(false);
    expect(isDue(p, NOW + DAY)).toBe(true);
  });
});
