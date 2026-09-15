// Generate the extra vocabulary-course chapters (12–22) that dankying doesn't
// cover, by slicing the main word list at the user-given theme boundaries and
// AI-generating a themed article per unit (same shape as data/course.ts).
//
//   NODE_USE_ENV_PROXY=1 node scripts/generate-course-extra.mjs        # full run
//   NODE_USE_ENV_PROXY=1 LIMIT=1 node scripts/generate-course-extra.mjs # test 1 unit
//
// Reads the relay creds from apps/server/.env (AI_BASE_URL / AI_API_KEY /
// AI_MODEL). Resumable: each unit's article is cached, so re-runs skip done work.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const ROOT = new URL('..', import.meta.url);
const CACHE_PATH = new URL('../.article-cache.json', import.meta.url); // gitignored
const OUT_PATH = new URL('../packages/core/src/data/course-extra.ts', import.meta.url);

const UNIT_SIZE = Number(process.env.UNIT_SIZE || 20);
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : Infinity;

// theme boundaries (chapter number, Chinese theme, first word), in list order
const BOUNDARIES = [
  [12, '饮食健康', 'food'],
  [13, '建筑场所', 'architecture'],
  [14, '交通旅行', 'navigate'],
  [15, '国家政府', 'republic'],
  [16, '社会经济', 'economy'],
  [17, '法律法规', 'law'],
  [18, '沙场争锋', 'violence'],
  [19, '社会角色', 'pioneer'],
  [20, '行为动作', 'act'],
  [21, '身心健康', 'feel'],
  [22, '时间日期', 'daily'],
];

// --- creds ---
function readEnv() {
  const txt = readFileSync(new URL('apps/server/.env', ROOT), 'utf8');
  const env = {};
  for (const line of txt.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}
const ENV = readEnv();
const BASE = (ENV.AI_BASE_URL || 'https://aiberm.com/v1').replace(/\/$/, '');
const KEY = ENV.AI_API_KEY;
const MODEL = ENV.AI_MODEL || 'glm-5.3';
if (!KEY) throw new Error('no AI_API_KEY in apps/server/.env');

// --- word list + POS parse (mirror packages/core/src/words.ts) ---
const POS_RE = /^((?:n|v|adj|adv|prep|conj|pron|det|num|int|abbr|aux|vi|vt)\.)/;
const raw = JSON.parse(readFileSync(new URL('words.json', ROOT), 'utf8'));
function parsePos(rawStr) {
  const m = rawStr.match(POS_RE);
  return m ? m[1] : '';
}
const order = raw.map(([word, r]) => ({ word, pos: parsePos(r) }));
const idxOf = (w) => order.findIndex((x) => x.word.toLowerCase().trim() === w.toLowerCase());

// --- build chapters + units deterministically ---
const marks = BOUNDARIES.map(([n, theme, w]) => ({ n, theme, w, i: idxOf(w) }));
const chapters = [];
const units = [];
for (let k = 0; k < marks.length; k++) {
  const start = marks[k].i;
  const end = k + 1 < marks.length ? marks[k + 1].i : order.length;
  const words = order.slice(start, end);
  // chunk into ~UNIT_SIZE; merge a tiny trailing chunk into the previous
  const chunks = [];
  for (let j = 0; j < words.length; j += UNIT_SIZE) chunks.push(words.slice(j, j + UNIT_SIZE));
  if (chunks.length >= 2 && chunks[chunks.length - 1].length < UNIT_SIZE / 2) {
    const tail = chunks.pop();
    chunks[chunks.length - 1] = chunks[chunks.length - 1].concat(tail);
  }
  const unitIds = [];
  chunks.forEach((chunkWords, pi) => {
    const id = `c${marks[k].n}p${pi + 1}`;
    unitIds.push(id);
    units.push({ id, chapter: marks[k].n, page: pi + 1, theme: marks[k].theme, words: chunkWords });
  });
  chapters.push({ chapter: marks[k].n, theme: marks[k].theme, unitIds });
}

console.error(`Planned: ${chapters.length} chapters, ${units.length} units, ${order.length - marks[0].i} words (unit size ${UNIT_SIZE}).`);

// --- cache ---
let cache = {};
if (existsSync(CACHE_PATH)) {
  try {
    cache = JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    cache = {};
  }
}
function saveCache() {
  writeFileSync(CACHE_PATH, JSON.stringify(cache));
}

// --- AI ---
function extractJson(s) {
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b < 0) return null;
  try {
    return JSON.parse(s.slice(a, b + 1));
  } catch {
    return null;
  }
}
async function ai(messages) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.7, stream: false }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text().catch(() => '')).slice(0, 200)}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? '';
}

const SYS =
  'You write short English passages to teach IELTS vocabulary in context. ' +
  'Given a theme and a list of target words, write ONE coherent, natural passage ' +
  '(about 180–260 words) that uses EVERY target word at least once, in a way a B1–B2 ' +
  'learner can follow. Wrap the FIRST occurrence of each target word in double curly ' +
  'braces exactly like {{word}} (keep the original spelling; you may inflect the word ' +
  'grammatically and still wrap the inflected form). Then translate the whole passage ' +
  'into fluent Simplified Chinese. Respond with STRICT JSON and nothing else: ' +
  '{"title": "<short English title>", "en": "<passage with {{}} marks>", "zh": "<Chinese translation>"}';

function autowrap(en, targets) {
  let out = en;
  for (const w of targets) {
    if (new RegExp(`\\{\\{\\s*${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(out)) continue; // already marked
    const re = new RegExp(`\\b(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'i');
    if (re.test(out)) out = out.replace(re, '{{$1}}');
  }
  return out;
}
function collectTargets(en) {
  return [...en.matchAll(/\{\{(.*?)\}\}/g)].map((m) => m[1]);
}

async function genUnit(u) {
  const wordList = u.words.map((w) => w.word).join(', ');
  const user = `Theme (Chinese): ${u.theme}\nTarget words (use every one): ${wordList}`;
  let lastErr;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const content = await ai([
        { role: 'system', content: SYS },
        { role: 'user', content: user },
      ]);
      const j = extractJson(content);
      if (!j || !j.en || !j.zh) throw new Error('bad JSON / missing fields');
      let en = j.en;
      if (!en.includes('{{')) en = autowrap(en, u.words.map((w) => w.word));
      else en = autowrap(en, u.words.map((w) => w.word)); // wrap any the model missed
      const targets = collectTargets(en);
      if (targets.length === 0) throw new Error('no targets marked');
      return { title: j.title || u.theme, en, zh: j.zh, targets };
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  throw new Error(`unit ${u.id} failed: ${lastErr?.message}`);
}

// --- run ---
let done = 0;
let generated = 0;
for (const u of units) {
  if (generated >= LIMIT) break;
  if (!cache[u.id]) {
    process.stderr.write(`  gen ${u.id} (${u.theme}, ${u.words.length}w) ...`);
    const art = await genUnit(u);
    cache[u.id] = art;
    saveCache();
    generated++;
    process.stderr.write(` ${art.targets.length} marks\n`);
  }
  done++;
}
console.error(`\nGenerated ${generated} new (cached total ${Object.keys(cache).length}/${units.length}).`);

if (LIMIT !== Infinity) {
  console.error('LIMIT set — inspect .article-cache.json; not writing course-extra.ts yet.');
  const sample = cache[units[0].id];
  console.error('\n--- sample (unit 1) ---\ntitle:', sample.title, '\nen head:', sample.en.slice(0, 260), '\nzh head:', sample.zh.slice(0, 80));
  process.exit(0);
}

// assemble course-extra.ts (only if all units generated)
const missing = units.filter((u) => !cache[u.id]);
if (missing.length) {
  console.error(`Still missing ${missing.length} units; re-run to continue. Not writing output.`);
  process.exit(1);
}
const outUnits = units.map((u) => {
  const art = cache[u.id];
  return {
    id: u.id,
    chapter: u.chapter,
    page: u.page,
    articleTitle: art.title,
    articleEn: art.en,
    articleZh: art.zh,
    words: u.words.map((w) => ({ word: w.word, ipa: '', pos: w.pos, defs: [] })),
    targets: art.targets,
  };
});
const out = `// AUTO-GENERATED by scripts/generate-course-extra.mjs — do not edit by hand.
// Chapters 12–22: sliced from the main word list at theme boundaries, articles AI-generated.
import type { CourseChapter, CourseUnit } from './course';

export const COURSE_EXTRA_CHAPTERS: CourseChapter[] = ${JSON.stringify(chapters.map((c) => ({ chapter: c.chapter, theme: c.theme, unitIds: c.unitIds })), null, 2)};

export const COURSE_EXTRA_UNITS: CourseUnit[] = ${JSON.stringify(outUnits, null, 2)};
`;
mkdirSync(dirname(OUT_PATH.pathname), { recursive: true });
writeFileSync(OUT_PATH, out);
console.error(`Wrote ${outUnits.length} units -> packages/core/src/data/course-extra.ts`);
