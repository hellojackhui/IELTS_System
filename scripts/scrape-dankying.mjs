// Scrape the dankying IELTS vocabulary course (11 chapters / 44 pages) into a
// typed data file the app consumes. Internal/self-use tool.
//
//   node scripts/scrape-dankying.mjs
//
// Fetches each page's /text/ (themed article, EN target words wrapped in
// <em><strong>, plus a 中文 translation) and /vocabulary/ (word + IPA + POS +
// English definitions), and writes packages/core/src/data/course.ts.
//
// Uses curl (honours the sandbox HTTP(S)_PROXY) so it works behind the GFW.

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const HOST = 'https://vocabulary-ielts.dankying.com';
// pages per chapter, from the sitemap
const CHAPTERS = { 1: 6, 2: 4, 3: 4, 4: 3, 5: 8, 6: 3, 7: 3, 8: 3, 9: 4, 10: 3, 11: 3 };

function fetchHtml(url) {
  let lastErr;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const html = execFileSync('curl', ['-s', '--fail', '--retry', '2', '--max-time', '40', url], {
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
      });
      if (html && html.includes('markdown book-article')) return html;
      lastErr = new Error('empty/unexpected body');
    } catch (e) {
      lastErr = e;
    }
    execFileSync('sleep', ['2']); // backoff (sync)
  }
  throw new Error(`fetch failed after retries: ${url} (${lastErr?.message ?? lastErr})`);
}

const ENT = {
  '&rsquo;': '’', '&lsquo;': '‘', '&ldquo;': '“', '&rdquo;': '”',
  '&mdash;': '—', '&ndash;': '–', '&hellip;': '…', '&amp;': '&',
  '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ', '&lt;': '<', '&gt;': '>',
};
function decode(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&[a-z]+;/gi, (m) => ENT[m] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
}
function stripTags(s) {
  return decode(s.replace(/<[^>]+>/g, ''));
}

// inner HTML of <div class="markdown book-article"> via depth-matched </div>
function markdownInner(html) {
  const i = html.indexOf('markdown book-article');
  if (i < 0) return '';
  const start = html.indexOf('>', i) + 1;
  let depth = 1;
  const re = /<(\/?)div\b/g;
  re.lastIndex = start;
  let m;
  while ((m = re.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(start, m.index);
  }
  return html.slice(start);
}

function chapterTheme(html, ch) {
  const m = html.match(new RegExp(`href="/docs/chapter${ch}/"[^>]*>\\s*([^<]+)</a>`));
  return m ? decode(m[1]) : '';
}

// --- article (/text/) ---
function parseText(html) {
  const inner = markdownInner(html);
  const titleM = inner.match(/<h1[^>]*>(.*?)<a class="anchor"/s);
  const title = titleM ? stripTags(titleM[1]) : '';
  const zhIdx = inner.search(/<h[12][^>]*id="中文"/);
  const enPart = zhIdx >= 0 ? inner.slice(0, zhIdx) : inner;
  const zhPart = zhIdx >= 0 ? inner.slice(zhIdx) : '';

  const paras = (part) => [...part.matchAll(/<p>(.*?)<\/p>/gs)].map((m) => m[1]);

  const targets = [];
  const enParas = paras(enPart).map((p) => {
    // mark target words, remember surface forms
    const marked = p.replace(/<em><strong>(.*?)<\/strong><\/em>/gs, (_, w) => {
      const word = decode(w);
      targets.push(word);
      return `{{${word}}}`;
    });
    return stripTags(marked).replace(/\{\{\s*/g, '{{').replace(/\s*\}\}/g, '}}');
  });
  const en = enParas.join('\n\n');
  const zh = paras(zhPart).map(stripTags).join('\n\n');
  return { title, en, zh, targets };
}

// --- vocabulary (/vocabulary/) ---
function parseVocab(html) {
  const inner = markdownInner(html);

  // Format B (e.g. chapter 11): a <table> of Word | Part of Speech | Meaning(中文).
  if (inner.includes('<table>')) {
    const words = [];
    for (const row of inner.matchAll(/<tr>(.*?)<\/tr>/gs)) {
      const tds = [...row[1].matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map((m) => stripTags(m[1]));
      if (tds.length < 2) continue; // header / malformed
      const word = tds[0];
      if (!word) continue;
      const pos = (tds[1] || '').replace(/\.$/, '');
      const meaning = tds[2] || '';
      words.push({ word, ipa: '', pos, defs: meaning ? [meaning] : [] });
    }
    if (words.length) return words;
  }

  // Format A: a headword paragraph <p><em><strong>WORD</strong></em> …</p> whose
  // trailing text (after </em>, before the next tag) holds an optional /ipa/ and
  // sometimes the POS; POS/defs may instead sit in the following <ol>/<p>.
  const POS_SNIFF = /^\s*\(?(nouns?|verbs?|adjectives?|adverbs?|n|v|vt|vi|adj|adv|prep|conj|pron|det|abbr)\b\.?\)?[:.]?\s*/i;
  const headRe = /<p><em><strong>(.*?)<\/strong><\/em>([^<]*)<\/p>/gs;
  const heads = [...inner.matchAll(headRe)];
  const words = [];
  for (let k = 0; k < heads.length; k++) {
    const h = heads[k];
    const word = decode(h[1]);
    if (!word) continue;
    const trailing = h[2] || '';
    const ipaM = trailing.match(/\/([^/]+)\//);
    const ipa = ipaM ? decode(ipaM[1]) : '';
    let pos = decode(trailing.replace(/\/[^/]+\//, '').trim()).replace(/\.$/, '');
    const segStart = h.index + h[0].length;
    const segEnd = k + 1 < heads.length ? heads[k + 1].index : inner.length;
    const seg = inner.slice(segStart, segEnd);
    let defs = [];
    for (const li of seg.matchAll(/<li>(.*?)<\/li>/gs)) defs.push(stripTags(li[1]));
    if (defs.length === 0) {
      for (const p of seg.matchAll(/<p>(.*?)<\/p>/gs)) {
        const t = stripTags(p[1]);
        if (t) defs.push(t);
      }
    }
    // If POS wasn't on the header line, sniff it from the first def's leading marker.
    if (!pos && defs[0]) {
      const m = defs[0].match(POS_SNIFF);
      if (m) pos = m[1].replace(/s$/, '').toLowerCase();
    }
    defs = defs.map((d) => d.replace(POS_SNIFF, '')).filter(Boolean);
    words.push({ word, ipa, pos, defs });
  }
  return words;
}

const units = [];
const chapters = [];
for (const [chStr, pages] of Object.entries(CHAPTERS)) {
  const ch = +chStr;
  let theme = '';
  const unitIds = [];
  for (let pg = 1; pg <= pages; pg++) {
    const base = `${HOST}/docs/chapter${ch}/page${pg}`;
    process.stderr.write(`  chapter${ch}/page${pg} ...`);
    const textHtml = fetchHtml(`${base}/text/`);
    const vocabHtml = fetchHtml(`${base}/vocabulary/`);
    if (!theme) theme = chapterTheme(textHtml, ch);
    const { title, en, zh, targets } = parseText(textHtml);
    const words = parseVocab(vocabHtml);
    const id = `c${ch}p${pg}`;
    unitIds.push(id);
    units.push({ id, chapter: ch, page: pg, articleTitle: title, words, articleEn: en, articleZh: zh, targets });
    process.stderr.write(` ${words.length} words, ${targets.length} marks\n`);
  }
  chapters.push({ chapter: ch, theme, unitIds });
}

const out = `// AUTO-GENERATED by scripts/scrape-dankying.mjs — do not edit by hand.
// Source: dankying IELTS vocabulary course (internal use).

export interface CourseWord {
  word: string;
  ipa: string;
  pos: string;
  defs: string[];
}

export interface CourseUnit {
  id: string;
  chapter: number;
  page: number;
  articleTitle: string;
  /** Article with target words wrapped as {{word}} tokens. */
  articleEn: string;
  articleZh: string;
  words: CourseWord[];
  /** Target-word surface forms as they appear (marked) in the article, in order. */
  targets: string[];
}

export interface CourseChapter {
  chapter: number;
  theme: string;
  unitIds: string[];
}

export const COURSE_CHAPTERS: CourseChapter[] = ${JSON.stringify(chapters, null, 2)};

export const COURSE_UNITS: CourseUnit[] = ${JSON.stringify(units, null, 2)};
`;

const dest = new URL('../packages/core/src/data/course.ts', import.meta.url);
writeFileSync(dest, out);
console.error(`\nWrote ${units.length} units across ${chapters.length} chapters -> packages/core/src/data/course.ts`);
