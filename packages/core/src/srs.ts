import type { WordProgress } from './types';

const DAY = 86_400_000;
const MIN_EASE = 1.3;

/** Fresh progress for a word the learner has never seen. Due immediately. */
export function newProgress(wordId: string, now: number = Date.now()): WordProgress {
  return {
    wordId,
    ease: 2.5,
    interval: 0,
    repetitions: 0,
    due: now,
    lastReviewed: null,
    correctCount: 0,
    wrongCount: 0,
    updatedAt: now,
  };
}

const TEN_MIN = 10 / (24 * 60); // in days
const SIX_HOURS = 6 / 24; // in days

/**
 * Advance a word's schedule after a review, using SM-2 with Ebbinghaus-style
 * intra-day early steps: a wrong answer brings the word back in ~10 minutes,
 * the first correct in ~6 hours (same day), then 1 → 3 days, then SM-2 growth.
 */
export function schedule(
  prev: WordProgress,
  correct: boolean,
  now: number = Date.now(),
): WordProgress {
  let { ease, interval, repetitions } = prev;

  if (correct) {
    repetitions += 1;
    if (repetitions === 1) interval = SIX_HOURS; // same day
    else if (repetitions === 2) interval = 1;
    else if (repetitions === 3) interval = 3;
    else interval = Math.round(interval * ease);
    ease = ease + 0.1;
  } else {
    repetitions = 0;
    interval = TEN_MIN; // comes back this session / today
    ease = ease - 0.2;
  }

  ease = Math.max(MIN_EASE, ease);

  return {
    ...prev,
    ease,
    interval,
    repetitions,
    due: now + interval * DAY,
    lastReviewed: now,
    correctCount: prev.correctCount + (correct ? 1 : 0),
    wrongCount: prev.wrongCount + (correct ? 0 : 1),
    updatedAt: now,
  };
}

export function isDue(p: WordProgress, now: number = Date.now()): boolean {
  return p.due <= now;
}
