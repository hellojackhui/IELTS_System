/** A single vocabulary entry. `id` is the lowercased English word (guaranteed unique). */
export interface Word {
  id: string;
  word: string;
  /** Part of speech, e.g. "n.", "adj.". Empty string if none was parseable. */
  pos: string;
  /** Chinese meanings with the part-of-speech prefix stripped. */
  meanings: string;
  /** Original untouched translation string. */
  raw: string;
}

export type QuizMode = 'spelling' | 'dictation' | 'choice';

/** A single chat turn in the AI assistant. */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Question {
  word: Word;
  mode: QuizMode;
  /** Present only for `choice` mode: the shuffled options including the answer. */
  options?: Word[];
}

/** Per-word learning state. Synced across devices; last-write-wins on `updatedAt`. */
export interface WordProgress {
  wordId: string;
  /** SM-2 ease factor (>= 1.3). */
  ease: number;
  /** Current interval in days. */
  interval: number;
  /** Consecutive correct reviews. */
  repetitions: number;
  /** Epoch ms when this word is next due. */
  due: number;
  /** Epoch ms of the last review, or null if never reviewed. */
  lastReviewed: number | null;
  correctCount: number;
  wrongCount: number;
  /** Epoch ms of the last local mutation. Drives sync conflict resolution. */
  updatedAt: number;
}

export interface User {
  id: string;
  email: string;
  createdAt: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SyncPullResponse {
  serverTime: number;
  progress: WordProgress[];
}

export interface SyncPushResponse {
  serverTime: number;
  applied: number;
}
