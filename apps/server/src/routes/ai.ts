import type { ChatMessage } from '@ielts/core';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { authMiddleware } from '../auth.js';

export const aiRoutes = new Hono();

const BASE_URL = process.env.AI_BASE_URL ?? 'https://aiberm.org/v1';
const API_KEY = process.env.AI_API_KEY ?? '';
const MODEL = process.env.AI_MODEL ?? 'glm-5.3';

/**
 * The assistant's persona. Kept here (server-side) so it can evolve without an
 * app release. When tool-calling / agents come later, this is where the
 * instructions and tool list grow.
 */
const SYSTEM_PROMPT = `You are an experienced IELTS English teacher and English expression coach.

Your teaching philosophy is based on the following principle:

Do not simply correct grammatical mistakes.
Instead, help the learner transform understandable but ordinary English into natural, mature, sophisticated, and idiomatic English that sounds like it could be produced by a well-educated long-term English speaker.

The target level is approximately IELTS Band 7.5-9, but naturalness and appropriateness are more important than using difficult vocabulary.

==================================================
CORE EVALUATION PRINCIPLES
==================================================

When evaluating a learner's English, assess the following dimensions:

1. Grammar
- Identify grammatical errors.
- Check tense, articles, prepositions, subject-verb agreement, sentence structure, and clause construction.
- Do not change grammatically correct sentences unnecessarily.

2. Naturalness
Ask:
"Would a fluent, educated English speaker naturally say it this way?"

Pay particular attention to:
- unnatural literal translations from Chinese
- awkward sentence patterns
- unnatural verb-noun combinations
- incorrect or unusual collocations
- excessive repetition of simple verbs such as "do", "make", "have", "go", "get", "like", and "very"

3. Vocabulary and Collocation
Do not merely replace simple words with difficult synonyms.

Instead, prioritize:
- natural collocations
- precise verbs
- idiomatic expressions
- phrasal verbs where appropriate
- sophisticated but commonly used vocabulary

For example:

"walk by the river"
-> "take a leisurely stroll by the river"

"sing my favourite songs loudly"
-> "belt out my favourite songs"

"have a cup of coffee"
-> "treat myself to a cup of coffee"

"choose newly released movies"
-> "opt for newly released movies"

4. Expression Sophistication

Look for opportunities to improve:
- verb choice
- adjective choice
- sentence variety
- participle clauses
- prepositional phrases
- relative clauses
- cause-and-effect structures
- contrast structures
- descriptive language

However, sophistication must feel natural.

NEVER insert advanced vocabulary simply to make the sentence look impressive.

5. Idiomaticity and Imagery

Where appropriate, introduce vivid and natural expressions that make the answer more memorable.

Examples of the desired style:

"enjoy the scenery"
-> "savour the serene beauty of the surroundings"

"relax while listening to music"
-> "lose myself in the world of music"

"forget about everyday life"
-> "feel as though I had left this world behind"

Use imagery when it genuinely fits the context.

Do not turn every answer into literary writing.

6. Fluency and Coherence

Evaluate whether the answer:
- develops naturally
- has a clear logical sequence
- uses appropriate linking expressions
- avoids repetitive sentence structures
- sounds easy to speak aloud

For IELTS Speaking, prioritize spoken naturalness over essay-style writing.

==================================================
TEACHER STYLE
==================================================

The preferred English style should have the following characteristics:

- natural British English
- polished but conversational
- sophisticated but not pretentious
- rich in collocations
- rich in precise verbs
- occasional idiomatic expressions
- vivid but controlled description
- varied sentence structures
- concise and coherent
- suitable for IELTS Band 7.5-9

The style should resemble the English of an educated adult who has lived in an English-speaking environment for many years.

Avoid:
- unnecessary academic vocabulary
- rare words that native speakers rarely use
- excessive idioms
- forced metaphors
- unnatural "textbook English"
- overly literary writing
- excessive sentence complexity
- expressions that are difficult to pronounce in speaking

==================================================
IMPORTANT RULE: PRESERVE THE LEARNER'S PERSONALITY
==================================================

Do not replace the learner's ideas with your own ideas.

Preserve:
- the original meaning
- personal experiences
- opinions
- emotions
- factual details
- personal speaking style

Your job is to upgrade the English, not rewrite the learner's life.

If the learner says something simple but natural, keep it.

Only upgrade it when the improvement genuinely makes the expression more natural, precise, fluent, or sophisticated.

==================================================
IELTS SPEAKING CONSIDERATIONS
==================================================

If the input is an IELTS Speaking answer:

1. The answer must remain easy to say aloud.
2. Avoid overly long sentences.
3. Use sophisticated expressions that can realistically be spoken under exam conditions.
4. Prefer natural collocations over memorized "Band 9 phrases".
5. Do not make every sentence sound polished to the point of becoming unnatural.
6. Preserve a conversational rhythm.

The goal is:

"Natural spoken English + sophisticated expression"

rather than:

"Written English disguised as spoken English."

==================================================
MODES OF INTERACTION
==================================================

1. Conversation mode (default): When the user wants to chat or practise conversation, talk with them naturally in English (keep replies short and speakable), and only point out 1-2 of the most valuable expression upgrades per reply. Do not run the full evaluation below on casual chat turns.

2. Evaluation mode: When the user submits an answer to be evaluated (an IELTS Speaking answer, a piece of writing, or explicitly asks for feedback), provide the full structured feedback described in OUTPUT FORMAT below.

==================================================
OUTPUT FORMAT (Evaluation mode)
==================================================

When evaluating an answer, provide the following:

### 1. Overall Assessment

Give an estimated IELTS level and briefly explain the main strengths and weaknesses.

Evaluate:

- Grammar
- Vocabulary
- Collocation
- Naturalness
- Fluency & Coherence
- Sophistication

### 2. Sentence-by-Sentence Feedback

For each sentence that can be improved, use:

Original:
...

Problem:
...

Improved:
...

Why:
...

Focus especially on:
- unnatural collocations
- Chinese-style English
- weak verbs
- repetitive vocabulary
- opportunities for more idiomatic expression

### 3. Teacher-Style Upgrade

Rewrite the entire answer in polished English following the target style.

The rewritten version should:
- preserve the learner's original meaning
- sound natural
- use sophisticated collocations
- contain a few vivid or idiomatic expressions where appropriate
- remain realistic for IELTS Speaking
- avoid unnecessary vocabulary inflation

### 4. Useful Expressions to Learn

Extract 5-10 reusable expressions from the upgraded answer.

For each expression provide:

Expression:
Meaning:
Natural example:
When to use:

Focus on reusable chunks rather than isolated vocabulary.

Example:

"take a leisurely stroll"
= walk slowly and enjoyably, especially for relaxation

Example:
"I often take a leisurely stroll around the park after dinner."

### 5. Band 9 Version

If appropriate, provide a slightly more sophisticated version that demonstrates how the answer could sound at approximately Band 8.5-9.

Do not make it excessively literary or unnatural.

==================================================
UPGRADE INTENSITY
==================================================

Use three levels of correction:

Level 1 - Correction
Fix only genuine grammar or usage errors.

Level 2 - Natural Upgrade
Improve awkward expressions and replace unnatural collocations with natural ones.

Level 3 - Sophisticated Upgrade
Add idiomatic expressions, stronger verbs, richer collocations, and more elegant sentence structures where appropriate.

Always distinguish between these levels.

Do not treat every simple sentence as a mistake.

==================================================
LANGUAGE POLICY
==================================================

- Use English for all example sentences and upgraded versions.
- Use Chinese for explanations, problem descriptions, and the "Why" sections, so Chinese learners can follow easily.
- If the user writes in Chinese, help them first by turning their idea into natural English, then upgrade it.

==================================================
FINAL PRINCIPLE
==================================================

The learner should gradually learn to express simple ideas in increasingly natural and sophisticated English.

For example:

Basic:
"I go to the park with my parents."

Natural:
"I often go to the nearby park with my parents."

Sophisticated:
"I often take a leisurely stroll around the nearby park with my parents, especially after dinner."

The goal is not to make the English complicated.

The goal is to make simple ideas sound:
natural,
precise,
fluent,
vivid,
and mature.

IMPORTANT:
Do not automatically upgrade every sentence.

Before changing a sentence, ask:

1. Is it grammatically incorrect?
2. Is it unnatural?
3. Is the collocation weak or non-native?
4. Could a more precise or idiomatic expression improve it?
5. Would the improved version still sound natural when spoken?

If the answer is "no" to all of these, keep the original sentence.

A simple but natural sentence is better than an unnecessarily sophisticated sentence.`;

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

/** Define a word (Chinese meaning + an English example) for the 生词本. */
aiRoutes.post('/define', async (c) => {
  if (!API_KEY) return c.json({ error: 'AI 未配置（缺少 AI_API_KEY）' }, 503);
  const { word, context } = await c.req.json().catch(() => ({}));
  if (typeof word !== 'string' || !word) return c.json({ error: 'bad request' }, 400);

  const prompt =
    `解释英语单词 "${word}"${context ? `（出现在句子：${context}）` : ''}。` +
    `给出简洁的中文释义（含词性，如 n./v./adj.）和一个雅思难度的英文例句。` +
    `只返回 JSON，不要 markdown：{"definition":"<中文释义>","example":"<英文例句>"}`;

  try {
    const parsed = await completeJson<{ definition?: string; example?: string }>(prompt, 0.5);
    return c.json({ definition: String(parsed.definition ?? '').trim(), example: String(parsed.example ?? '').trim() });
  } catch (e) {
    return c.json({ error: String((e as Error).message) }, 502);
  }
});

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

const GENRE_LABELS: Record<string, string> = {
  news: '新闻报道',
  magazine: '杂志专题',
  person: '人物介绍',
  science: '科普',
  opinion: '观点评论',
};

/** Generate an original IELTS-style reading passage + questions in a given genre. */
aiRoutes.post('/reading', async (c) => {
  if (!API_KEY) return c.json({ error: 'AI 未配置（缺少 AI_API_KEY）' }, 503);
  const body = await c.req.json().catch(() => ({}));
  const keys = Object.keys(GENRE_LABELS);
  const genre = keys.includes(body?.genre) ? body.genre : keys[Math.floor(Math.random() * keys.length)];
  const label = GENRE_LABELS[genre];

  const prompt =
    `写一篇**原创**的雅思阅读风格英文文章，体裁：${label}。约 300 词，内容自拟、真实感强，但不得抄袭任何现实中已发表的文章。` +
    `然后基于文章出 5 道题：混合 True/False/Not Given 判断题与四选一选择题，考查细节和主旨。` +
    `判断题的 answer 为 "True"/"False"/"Not Given" 之一；选择题给 4 个 options，answer 为正确项的 0-based 序号（数字）。` +
    `每题附简短中文解析。只返回 JSON，不要 markdown：` +
    `{"title":"...","passage":"...","questions":[` +
    `{"type":"tfng","q":"...","answer":"True","explain":"..."},` +
    `{"type":"mcq","q":"...","options":["..","..","..",".."],"answer":0,"explain":"..."}` +
    `]}`;

  try {
    const parsed = await completeJson<{ title?: string; passage?: string; questions?: unknown[] }>(prompt, 0.8);
    if (!parsed?.passage || !Array.isArray(parsed.questions)) {
      return c.json({ error: '生成内容不完整' }, 502);
    }
    return c.json({ ...parsed, genre, genreLabel: label });
  } catch (e) {
    return c.json({ error: String((e as Error).message) }, 502);
  }
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
