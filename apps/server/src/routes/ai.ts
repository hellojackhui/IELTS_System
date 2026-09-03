import type { ChatMessage } from '@ielts/core';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { authMiddleware } from '../auth.js';

export const aiRoutes = new Hono();

const BASE_URL = process.env.AI_BASE_URL ?? 'https://aiberm.com/v1';
const API_KEY = process.env.AI_API_KEY ?? '';
const MODEL = process.env.AI_MODEL ?? 'glm-5.3';

/**
 * The assistant's persona. Kept here (server-side) so it can evolve without an
 * app release. When tool-calling / agents come later, this is where the
 * instructions and tool list grow.
 */
const SYSTEM_PROMPT = `你是一个专为中国雅思考生设计的英语学习助手。你的任务：
- 陪用户练习英语对话（可从日常与雅思口语场景出发）
- 纠正语法与用词，指出更地道的表达
- 按需给出例句、搭配、同义替换
风格：友好、简洁、鼓励。默认用中文解释、用英文示范；用户用英文时优先用英文回复。回复不要过长。`;

/** Pull the first {...} object out of a model reply (tolerates fences / stray prose). */
function extractJson(s: string): string {
  const cleaned = s
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/, '')
    .trim();
  const a = cleaned.indexOf('{');
  const b = cleaned.lastIndexOf('}');
  return a >= 0 && b > a ? cleaned.slice(a, b + 1) : cleaned;
}

/**
 * Non-streaming completion that expects a JSON object back. Retries once on a
 * network error, non-2xx, or unparseable body — LLM replies are occasionally
 * truncated or malformed, so one retry makes these endpoints far more reliable.
 */
async function completeJson<T>(prompt: string, temperature: number): Promise<T> {
  let lastErr = '未知错误';
  for (let attempt = 0; attempt < 2; attempt++) {
    let upstream: Response;
    try {
      upstream = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          temperature,
        }),
      });
    } catch (e) {
      lastErr = `连接上游失败：${String((e as Error).message)}`;
      continue;
    }
    if (!upstream.ok) {
      lastErr = `上游错误 ${upstream.status}`;
      continue;
    }
    const data = (await upstream.json().catch(() => null)) as
      | { choices?: { message?: { content?: string } }[] }
      | null;
    const content = data?.choices?.[0]?.message?.content ?? '';
    try {
      return JSON.parse(extractJson(content)) as T;
    } catch {
      lastErr = '解析失败';
    }
  }
  throw new Error(lastErr);
}

aiRoutes.use('*', authMiddleware);

/** Generate a single cloze (fill-in-the-blank) example sentence for a word. */
aiRoutes.post('/cloze', async (c) => {
  if (!API_KEY) return c.json({ error: 'AI 未配置（缺少 AI_API_KEY）' }, 503);
  const { word, meaning } = await c.req.json().catch(() => ({}));
  if (typeof word !== 'string' || !word) return c.json({ error: 'bad request' }, 400);

  const prompt =
    `为英语单词 "${word}"（释义：${meaning ?? ''}）写一个**雅思风格**的自然英文例句，最多 20 个单词。` +
    `话题请贴近雅思常见领域（教育、环境、科技、健康、城市化、就业、文化、媒体等），语域正式、地道，能清楚体现该词用法。` +
    `把句中的目标词（用正确的词形）替换成 "____"（四个下划线）。` +
    `只返回 JSON，不要 markdown：{"en":"<含 ____ 的句子>","zh":"<整句的中文翻译>"}`;

  let parsed: { en?: string; zh?: string };
  try {
    parsed = await completeJson<{ en?: string; zh?: string }>(prompt, 0.7);
  } catch (e) {
    return c.json({ error: String((e as Error).message) }, 502);
  }

  let en = String(parsed.en ?? '').trim();
  const zh = String(parsed.zh ?? '').trim();
  if (en && !en.includes('____')) {
    const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    if (re.test(en)) en = en.replace(re, '____');
  }
  if (!en) return c.json({ error: '生成为空' }, 502);
  return c.json({ en, zh });
});

/** Grade an IELTS Writing essay against the official band descriptors. */
aiRoutes.post('/writing', async (c) => {
  if (!API_KEY) return c.json({ error: 'AI 未配置（缺少 AI_API_KEY）' }, 503);
  const { task, prompt, essay } = await c.req.json().catch(() => ({}));
  if (typeof essay !== 'string' || essay.trim().length < 20) {
    return c.json({ error: '作文内容太短，无法评分' }, 400);
  }
  const taskLabel = task === 1 ? 'Academic Writing Task 1' : 'Writing Task 2';

  const grader =
    `You are a certified IELTS examiner. Grade the following IELTS ${taskLabel} essay strictly against the official band descriptors. ` +
    `Score each criterion 0-9 (0.5 steps): Task Response/Achievement (TR), Coherence & Cohesion (CC), Lexical Resource (LR), Grammatical Range & Accuracy (GRA). ` +
    `overall = average of the four rounded to the nearest 0.5. ` +
    `Write each comment and all suggestions in Chinese, concise and concrete. ` +
    `Return ONLY JSON, no markdown: ` +
    `{"overall":x.x,"tr":{"band":x.x,"comment":"..."},"cc":{"band":x.x,"comment":"..."},"lr":{"band":x.x,"comment":"..."},"gra":{"band":x.x,"comment":"..."},"summary":"...","suggestions":["...","...","..."]}\n\n` +
    `Question:\n${prompt ?? '(未提供题目)'}\n\nEssay:\n${essay}`;

  try {
    return c.json(await completeJson(grader, 0.2));
  } catch (e) {
    return c.json({ error: String((e as Error).message) }, 502);
  }
});

aiRoutes.post('/chat', async (c) => {
  if (!API_KEY) return c.json({ error: 'AI 未配置（缺少 AI_API_KEY）' }, 503);

  const body = await c.req.json().catch(() => ({}));
  const history: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history
      .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: m.content })),
  ];

  const upstream = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, messages, stream: true }),
  });

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => '');
    return c.json({ error: `上游错误 ${upstream.status}`, detail: detail.slice(0, 300) }, 502);
  }

  return streamSSE(c, async (stream) => {
    const reader = upstream.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]') {
            await stream.writeSSE({ data: '[DONE]' });
            return;
          }
          try {
            const json = JSON.parse(payload);
            const token = json?.choices?.[0]?.delta?.content;
            if (token) await stream.writeSSE({ data: JSON.stringify({ t: token }) });
          } catch {
            // ignore keep-alive / non-JSON lines
          }
        }
      }
      await stream.writeSSE({ data: '[DONE]' });
    } catch (e) {
      await stream.writeSSE({ data: JSON.stringify({ error: String((e as Error).message) }) });
      await stream.writeSSE({ data: '[DONE]' });
    }
  });
});
