import { API_URL, getToken } from './api';

export interface WritingPrompt {
  id: string;
  task: 2;
  type: string;
  text: string;
  minWords: number;
  minutes: number;
}

/**
 * Original, IELTS-style Task 2 questions (written for this app — not reproduced
 * from any real exam paper). Standard essay formats across common IELTS themes.
 */
export const TASK2_PROMPTS: WritingPrompt[] = [
  {
    id: 't2-education',
    task: 2,
    type: '讨论双方观点',
    text: 'Some people believe that universities should mainly prepare students for employment, while others think their real purpose is to pursue knowledge for its own sake. Discuss both views and give your own opinion.',
    minWords: 250,
    minutes: 40,
  },
  {
    id: 't2-environment',
    task: 2,
    type: '同意与否',
    text: 'Protecting the environment is the responsibility of individuals rather than governments. To what extent do you agree or disagree?',
    minWords: 250,
    minutes: 40,
  },
  {
    id: 't2-remotework',
    task: 2,
    type: '利弊分析',
    text: 'More and more people are working from home instead of in a traditional office. Do the advantages of this trend outweigh the disadvantages?',
    minWords: 250,
    minutes: 40,
  },
  {
    id: 't2-health',
    task: 2,
    type: '同意与否',
    text: 'Governments should impose higher taxes on unhealthy food and drinks to improve public health. To what extent do you agree or disagree?',
    minWords: 250,
    minutes: 40,
  },
  {
    id: 't2-urbanisation',
    task: 2,
    type: '问题与解决',
    text: 'As cities grow rapidly, many face serious problems such as overcrowding and pollution. What problems does rapid urban growth cause, and what measures could address them?',
    minWords: 250,
    minutes: 40,
  },
  {
    id: 't2-globalisation',
    task: 2,
    type: '讨论双方观点',
    text: 'Some argue that globalisation weakens local cultures and traditions, while others believe it enriches them. Discuss both views and give your own opinion.',
    minWords: 250,
    minutes: 40,
  },
  {
    id: 't2-screentime',
    task: 2,
    type: '两部分问题',
    text: 'Children today spend a large amount of their free time using screens. Why has this happened, and is it a positive or negative development?',
    minWords: 250,
    minutes: 40,
  },
  {
    id: 't2-publictransport',
    task: 2,
    type: '同意与否',
    text: 'Investing in public transport is a better way to reduce traffic congestion than building more roads. To what extent do you agree or disagree?',
    minWords: 250,
    minutes: 40,
  },
];

export function randomPrompt(exclude?: string): WritingPrompt {
  const pool = exclude ? TASK2_PROMPTS.filter((p) => p.id !== exclude) : TASK2_PROMPTS;
  return pool[Math.floor(Math.random() * pool.length)];
}

export interface Criterion {
  band: number;
  comment: string;
}

export interface WritingScore {
  overall: number;
  tr: Criterion;
  cc: Criterion;
  lr: Criterion;
  gra: Criterion;
  summary: string;
  suggestions: string[];
}

export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Send an essay to the server for band scoring against the IELTS descriptors. */
export async function gradeWriting(task: number, prompt: string, essay: string): Promise<WritingScore> {
  const token = getToken();
  if (!token) throw new Error('请先在「我的」登录后使用');

  const resp = await fetch(`${API_URL}/ai/writing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ task, prompt, essay }),
  });
  const data = (await resp.json().catch(() => ({}))) as WritingScore & { error?: string };
  if (!resp.ok || data.error) throw new Error(data.error || `评分失败（${resp.status}）`);
  return data;
}
