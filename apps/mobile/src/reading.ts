import { API_URL, getToken } from './api';

export type Genre = 'news' | 'magazine' | 'person' | 'science' | 'opinion';

export const GENRES: { key: Genre | 'random'; label: string; icon: string }[] = [
  { key: 'random', label: '随机', icon: 'shuffle' },
  { key: 'news', label: '新闻', icon: 'newspaper-outline' },
  { key: 'magazine', label: '杂志', icon: 'book-outline' },
  { key: 'person', label: '人物', icon: 'person-outline' },
  { key: 'science', label: '科普', icon: 'flask-outline' },
  { key: 'opinion', label: '观点', icon: 'chatbox-ellipses-outline' },
];

export interface ReadingQuestion {
  type: 'tfng' | 'mcq';
  q: string;
  options?: string[];
  /** tfng: "True" | "False" | "Not Given"; mcq: 0-based option index. */
  answer: string | number;
  explain?: string;
}

export interface Reading {
  title: string;
  passage: string;
  genre: string;
  genreLabel: string;
  questions: ReadingQuestion[];
}

export const TFNG_OPTIONS = ['True', 'False', 'Not Given'];

export async function fetchReading(genre?: string): Promise<Reading> {
  const token = getToken();
  if (!token) throw new Error('请先在「我的」登录后使用');
  const resp = await fetch(`${API_URL}/ai/reading`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ genre: genre === 'random' ? undefined : genre }),
  });
  const data = (await resp.json().catch(() => ({}))) as Reading & { error?: string };
  if (!resp.ok || data.error) throw new Error(data.error || `生成失败（${resp.status}）`);
  return data;
}
