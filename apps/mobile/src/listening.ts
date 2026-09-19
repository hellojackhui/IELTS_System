import { API_URL, getToken } from './api';

export interface ListeningLine {
  speaker: string;
  text: string;
}

export interface ListeningQuestion {
  /** A note/sentence with a single "_____" blank. */
  q: string;
  /** The expected fill (word or short phrase; matched case-insensitively). */
  answer: string;
  explain?: string;
}

export interface Listening {
  title: string;
  scenario: string;
  lines: ListeningLine[];
  questions: ListeningQuestion[];
}

export async function fetchListening(): Promise<Listening> {
  const token = getToken();
  if (!token) throw new Error('请先在「我的」登录后使用');
  const resp = await fetch(`${API_URL}/ai/listening`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  });
  const data = (await resp.json().catch(() => ({}))) as Listening & { error?: string };
  if (!resp.ok || data.error) throw new Error(data.error || `生成失败（${resp.status}）`);
  return data;
}

/** Case/space-insensitive answer check for a listening blank. */
export function checkListening(input: string, answer: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.,!?;:]+$/, '');
  return norm(input) === norm(answer);
}
