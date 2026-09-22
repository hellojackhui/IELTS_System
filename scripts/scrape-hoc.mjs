#!/usr/bin/env node
// Scrape the House of Cards (2013) episode scripts from springfieldspringfield.co.uk
// and regenerate packages/core/src/data/hoc-scripts.ts.
//
// Usage:
//   node scripts/scrape-hoc.mjs                 fetch all 73 episodes, rewrite the data file
//   node scripts/scrape-hoc.mjs --dry           fetch + report only, never touch the data file
//   HOC_CACHE_DIR=/tmp/hoc node scripts/scrape-hoc.mjs
//   HOC_SLEEP_MS=800 node scripts/scrape-hoc.mjs
//
// The source ships English subtitles: no speaker labels, no Chinese, lyrics mixed
// in, proper nouns lowercased. Lines are therefore only lightly cleaned (strip the
// "- " dialogue prefix and [sound] cues) and kept COMPLETE — short interjections
// like "It's okay." are real dialogue and must survive (v1.0 dropped lines under
// 25 chars / 6 words and lost ~19k lines; do not reintroduce length filters).
//
// NOTE: the site is a plain transcript mirror; robots.txt carries no Disallow rules,
// but keep the default politeness delay in place.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TARGET = join(ROOT, 'packages/core/src/data/hoc-scripts.ts');

const SHOW = 'house-of-cards-2013';
const BASE = 'https://www.springfieldspringfield.co.uk/view_episode_scripts.php';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/122.0 Safari/537.36';

// House of Cards (2013): 6 seasons / 73 episodes (13,13,13,13,13,8).
const SEASONS = [
  { season: 1, episodes: 13 },
  { season: 2, episodes: 13 },
  { season: 3, episodes: 13 },
  { season: 4, episodes: 13 },
  { season: 5, episodes: 13 },
  { season: 6, episodes: 8 },
];

const DRY = process.argv.includes('--dry');
const SLEEP = Number(process.env.HOC_SLEEP_MS ?? 1500);
const CACHE_DIR = process.env.HOC_CACHE_DIR ?? '';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘',
  ldquo: '“', rdquo: '”', eacute: 'é', egrave: 'è', aacute: 'á', ouml: 'ö',
};

function decodeEntities(s) {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, ent) => {
    if (ent[0] === '#') {
      const code =
        ent[1] === 'x' || ent[1] === 'X'
          ? parseInt(ent.slice(2), 16)
          : parseInt(ent.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[ent] ?? m;
  });
}

function episodeTag(season, episode) {
  return `s${String(season).padStart(2, '0')}e${String(episode).padStart(2, '0')}`;
}

async function fetchEpisode(season, episode) {
  const tag = episodeTag(season, episode);
  if (CACHE_DIR) {
    const p = join(CACHE_DIR, `${tag}.html`);
    if (existsSync(p)) return readFileSync(p, 'utf8');
  }
  const url = `${BASE}?tv-show=${SHOW}&episode=${tag}`;
  let lastErr;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      if (!html.includes('scrolling-script-container')) throw new Error('no script container');
      if (CACHE_DIR) {
        mkdirSync(CACHE_DIR, { recursive: true });
        writeFileSync(join(CACHE_DIR, `${tag}.html`), html);
      }
      return html;
    } catch (e) {
      lastErr = e;
      if (attempt < 3) await sleep(SLEEP * (attempt + 2));
    }
  }
  throw lastErr;
}

/** Raw script container text → cleaned, complete, consecutive-deduped lines. */
function parseScript(html) {
  const m = html.match(/<div class="scrolling-script-container">([\s\S]*?)<\/div>/);
  if (!m) return [];
  const text = decodeEntities(m[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''));
  const out = [];
  let prevKey = '';
  for (const raw of text.split('\n')) {
    // Strip dialogue dashes and [sound] cues — they can stack in either order
    // ("- [door] Hello", "[door] - Hello"), so peel them off repeatedly.
    let l = raw.trim();
    for (let i = 0; i < 4; i++) {
      const before = l;
      l = l.replace(/^-\s*/, '').replace(/^\[[^\]]*\]\s*/, '').trim();
      if (l === before) break;
    }
    l = l.replace(/\s+/g, ' ').trim();
    if (!/[A-Za-z]{2}/.test(l)) continue;
    // Collapse only back-to-back identical captions (subtitles often repeat a
    // cue across two frames); mid-episode repeats are real dialogue and stay.
    const key = l.toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (key === prevKey) continue;
    prevKey = key;
    out.push(l);
  }
  return out;
}

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const HEADER = `// House of Cards (2013) episode scripts — the English dialogue of every episode,
// season 1-6 (73 episodes), feeding the "影视台词" browse page.
//
// AUTO-GENERATED by scripts/scrape-hoc.mjs — do NOT edit by hand, re-run the script.
// Source: springfieldspringfield.co.uk episode scripts (English only).
//
// The source is subtitle-derived: there are no speaker labels, no Chinese, song
// lyrics are mixed in, and casing is normalised (proper nouns come through as
// lowercase). All dialogue lines are kept verbatim (short interjections included;
// only consecutive duplicate captions collapse), so treat this as raw viewing
// material rather than a curated learning bank.
`;

const INTERFACE = `
export interface HocEpisode {
  /** 1-based season number. */
  season: number;
  /** 1-based episode number within the season. */
  episode: number;
  /** Netflix chapter number (chapters are numbered continuously across seasons). */
  chapter: number;
  /** Cleaned English dialogue lines, in script order. */
  lines: string[];
}
`;

function renderSeason(season, eps) {
  const body = eps
    .map(({ episode, chapter, lines }) => {
      const rows = lines.map((l) => `        '${esc(l)}',`).join('\n');
      return `  {\n    season: ${season},\n    episode: ${episode},\n    chapter: ${chapter},\n    lines: [\n${rows}\n    ],\n  },`;
    })
    .join('\n');
  return `const S${season}: HocEpisode[] = [\n${body}\n];`;
}

function renderFile(built) {
  const blocks = built.map(({ season, eps }) => renderSeason(season, eps)).join('\n\n');
  const spread = built.map(({ season }) => `...S${season}`).join(', ');
  return `${HEADER}${INTERFACE}
${blocks}

export const HOC_EPISODES: HocEpisode[] = [${spread}];

/** All episodes of one season, in order. */
export function hocSeasonEpisodes(season: number): HocEpisode[] {
  return HOC_EPISODES.filter((e) => e.season === season);
}

/** Season numbers that actually have episodes, ascending. */
export function hocSeasons(): number[] {
  return [...new Set(HOC_EPISODES.map((e) => e.season))].sort((a, b) => a - b);
}

/** Total dialogue lines across the whole show. */
export function hocLineCount(): number {
  return HOC_EPISODES.reduce((n, e) => n + e.lines.length, 0);
}
`;
}

const stats = [];
const built = [];
let chapter = 0;
let totalLines = 0;
let failed = [];

for (const { season, episodes } of SEASONS) {
  const eps = [];
  for (let episode = 1; episode <= episodes; episode++) {
    chapter += 1;
    const tag = episodeTag(season, episode);
    let html = null;
    try {
      html = await fetchEpisode(season, episode);
    } catch (e) {
      failed.push(`${tag} (${e.message})`);
    }
    const lines = html ? parseScript(html) : [];
    stats.push({ tag, chapter, lines: lines.length });
    eps.push({ episode, chapter, lines });
    totalLines += lines.length;
    process.stderr.write(`  ${tag} ch${String(chapter).padStart(2, '0')}: ${lines.length} lines\n`);
    if (!html && CACHE_DIR) {
      await sleep(SLEEP);
      continue;
    }
    await sleep(SLEEP);
  }
  built.push({ season, eps });
}

const render = renderFile(built);

if (DRY) {
  console.log(render.slice(0, 900));
  console.log('...');
  console.log(`\nDRY RUN: ${stats.length} episodes, ${totalLines} lines (file would be ${(render.length / 1024).toFixed(0)} KB)`);
} else {
  writeFileSync(TARGET, render);
  console.log(`Wrote ${TARGET}`);
  console.log(`${SEASONS.length} seasons, ${stats.length} episodes, ${totalLines} lines, ${(render.length / 1024).toFixed(0)} KB`);
}
if (failed.length) console.log('failed episodes:', failed);
