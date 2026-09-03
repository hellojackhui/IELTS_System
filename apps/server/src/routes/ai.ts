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

aiRoutes.use('*', authMiddleware);

/** Generate a single cloze (fill-in-the-blank) example sentence for a word. */
aiRoutes.post('/cloze', async (c) => {
  if (!API_KEY) return c.json({ error: 'AI 未配置（缺少 AI_API_KEY）' }, 503);
  const { word, meaning } = await c.req.json().catch(() => ({}));
  if (typeof word !== 'string' || !word) return c.json({ error: 'bad request' }, 400);

  const prompt =
    `为英语单词 "${word}"（释义：${meaning ?? ''}）写一个雅思难度、自然地道的英文例句，最多 18 个单词，能清楚体现该词的用法。` +
    `把句中的目标词（用正确的词形）替换成 "____"（四个下划线）。` +
    `只返回 JSON，不要 markdown：{"en":"<含 ____ 的句子>","zh":"<整句的中文翻译>"}`;

  let upstream: Response;
  try {
    upstream = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
        temperature: 0.7,
      }),
    });
  } catch (e) {
    return c.json({ error: `连接上游失败：${String((e as Error).message)}` }, 502);
  }
  if (!upstream.ok) return c.json({ error: `上游错误 ${upstream.status}` }, 502);

  const data = (await upstream.json().catch(() => null)) as
    | { choices?: { message?: { content?: string } }[] }
    | null;
  let content = data?.choices?.[0]?.message?.content ?? '';
  content = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/, '')
    .trim();

  let parsed: { en?: string; zh?: string };
  try {
    parsed = JSON.parse(content);
  } catch {
    return c.json({ error: '解析失败', raw: content.slice(0, 200) }, 502);
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
