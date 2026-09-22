// Scrape Red Alert 2 & 3 unit voice quotes from the Command & Conquer wiki
// (cnc.fandom.com) via its MediaWiki API (bypasses the Cloudflare block on
// /wiki/ pages). Content is CC-BY-SA. Internal/self-use tool.
//
//   node scripts/scrape-redalert.mjs
//
// RA2 stores quotes in a {{Quotes|select=|move=|...}} template; RA3 uses
// ==Quotes== with ===Created===/===Select===/... subsections. Output ->
// packages/core/src/data/redalert.ts

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const API = 'https://cnc.fandom.com/api.php';
const UA = 'ielts-study/1.0 (personal use)';

function api(params) {
  const url = `${API}?${new URLSearchParams({ ...params, format: 'json' })}`;
  const out = execFileSync('curl', ['-s', '--fail', '--retry', '2', '--max-time', '40', '-A', UA, url], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  return JSON.parse(out);
}

// Map a raw wiki key/heading to a Chinese action label by keyword (collapses the
// many RA3 contextual variants into a handful of buckets).
function labelOf(raw) {
  const s = cleanLine(raw).toLowerCase().replace(/_/g, ' ');
  if (/creat/.test(s)) return '建成';
  if (/combat/.test(s)) return '战斗中';
  if (/retreat/.test(s)) return '撤退';
  if (/under (fire|attack)|suppress|low on health/.test(s)) return '受到攻击';
  if (/captur|infiltrat|bribing|disguis/.test(s)) return '潜入/占领';
  if (/garrison/.test(s)) return '驻守';
  if (/repair/.test(s)) return '维修';
  if (/harvest|refinery/.test(s)) return '采矿';
  if (/kill|death|dying/.test(s)) return '阵亡';
  if (/abilit|use |using|switch|charg|disrupt|belt|missile|mines|gap generator|time |blackout|harpoon|molotov|cannon/.test(s)) return '特殊技能';
  if (/attack/.test(s)) return '攻击';
  if (/mov/.test(s)) return '移动';
  if (/select|exiting|boot camp|armor facility/.test(s)) return '选中';
  return cleanLine(raw);
}

/** Merge groups that map to the same label; dedup lines, keep order. */
function mergeGroups(groups) {
  const map = new Map();
  for (const g of groups) {
    const cur = map.get(g.label) || [];
    for (const l of g.lines) if (!cur.includes(l)) cur.push(l);
    map.set(g.label, cur);
  }
  return [...map.entries()].map(([label, lines]) => ({ label, lines }));
}

function cleanLine(s) {
  return s
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/\{\{[^}]*\}\}/g, '')
    .replace(/'''?/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}
function bulletLines(block) {
  const out = [];
  for (const m of block.matchAll(/^\s*\*+\s*(.+)$/gm)) {
    const t = cleanLine(m[1]);
    // drop pure stage directions like [something] and empty
    if (t && !/^\[.*\]$/.test(t)) out.push(t);
  }
  return out;
}

// RA2: {{Quotes | key = *lines... | key2 = ... }}
function parseTemplate(wt) {
  const i = wt.search(/\{\{Quotes\b/i);
  if (i < 0) return [];
  // grab balanced {{ ... }}
  let depth = 0, end = -1;
  for (let k = i; k < wt.length - 1; k++) {
    if (wt[k] === '{' && wt[k + 1] === '{') { depth++; k++; }
    else if (wt[k] === '}' && wt[k + 1] === '}') { depth--; k++; if (depth === 0) { end = k + 1; break; } }
  }
  const body = wt.slice(i, end < 0 ? wt.length : end);
  const groups = [];
  // split on |key=
  const re = /\|\s*([A-Za-z0-9_ ]+?)\s*=/g;
  const parts = [];
  let m;
  while ((m = re.exec(body))) parts.push({ key: m[1], start: m.index + m[0].length });
  for (let p = 0; p < parts.length; p++) {
    const seg = body.slice(parts[p].start, p + 1 < parts.length ? parts[p + 1].start - (`|${parts[p + 1].key}=`).length : body.length);
    if (/^(is_|has_|no_)/i.test(parts[p].key)) continue; // flags like is_aircraft=1
    const lines = bulletLines(seg);
    if (lines.length) groups.push({ label: labelOf(parts[p].key), lines });
  }
  return groups;
}

// RA3: ==Quotes== then ===Sub=== *lines
function parseSubsections(wt) {
  const qi = wt.search(/==\s*Quotes\s*==/i);
  if (qi < 0) return [];
  let block = wt.slice(qi);
  const nextTop = block.slice(3).search(/\n==[^=]/);
  if (nextTop >= 0) block = block.slice(0, nextTop + 3);
  const groups = [];
  const re = /===+\s*([^=\n]+?)\s*===+/g;
  const heads = [...block.matchAll(re)];
  for (let h = 0; h < heads.length; h++) {
    const seg = block.slice(heads[h].index + heads[h][0].length, h + 1 < heads.length ? heads[h + 1].index : block.length);
    const lines = bulletLines(seg);
    if (lines.length) groups.push({ label: labelOf(heads[h][1]), lines });
  }
  return groups;
}

function titleParts(title) {
  const m = title.match(/^(.*?)\s*\((Red Alert 2|Red Alert 3)\)\s*$/);
  if (!m) return null;
  return { name: m[1].trim(), game: m[2] === 'Red Alert 2' ? 'RA2' : 'RA3' };
}

// --- collect unit titles ---
function embeddedInQuotes() {
  const titles = [];
  let cont;
  do {
    const j = api({ action: 'query', list: 'embeddedin', eititle: 'Template:Quotes', eilimit: '500', einamespace: '0', ...(cont || {}) });
    titles.push(...j.query.embeddedin.map((p) => p.title));
    cont = j.continue;
  } while (cont);
  return titles;
}
function categoryMembers(cat) {
  const titles = [];
  let cont;
  do {
    const j = api({ action: 'query', list: 'categorymembers', cmtitle: `Category:${cat}`, cmlimit: '500', cmnamespace: '0', ...(cont || {}) });
    titles.push(...(j.query.categorymembers || []).map((p) => p.title));
    cont = j.continue;
  } while (cont);
  return titles;
}

const ra2Titles = embeddedInQuotes().filter((t) => /\(Red Alert 2\)$/.test(t));
const ra3Set = new Set();
for (const f of ['Red Alert 3 Soviet arsenal', 'Red Alert 3 Allied arsenal', 'Red Alert 3 Empire arsenal']) {
  for (const t of categoryMembers(f)) if (/\(Red Alert 3\)$/.test(t)) ra3Set.add(t);
}
const allTitles = [...new Set([...ra2Titles, ...ra3Set])];
console.error(`candidate units: RA2=${ra2Titles.length}, RA3=${ra3Set.size}, total=${allTitles.length}`);

// --- fetch wikitext in batches of 50 and parse ---
const units = [];
for (let i = 0; i < allTitles.length; i += 50) {
  const batch = allTitles.slice(i, i + 50);
  const j = api({ action: 'query', titles: batch.join('|'), prop: 'revisions', rvprop: 'content', rvslots: 'main' });
  for (const page of Object.values(j.query.pages)) {
    if (!page.revisions) continue;
    const wt = page.revisions[0].slots.main['*'];
    const tp = titleParts(page.title);
    if (!tp) continue;
    const groups = mergeGroups(tp.game === 'RA2' ? parseTemplate(wt) : parseSubsections(wt));
    if (groups.length) units.push({ name: tp.name, game: tp.game, groups });
  }
  process.stderr.write(`  parsed ${Math.min(i + 50, allTitles.length)}/${allTitles.length}\n`);
}

units.sort((a, b) => (a.game === b.game ? a.name.localeCompare(b.name) : a.game.localeCompare(b.game)));
const ra2 = units.filter((u) => u.game === 'RA2').length;
const ra3 = units.filter((u) => u.game === 'RA3').length;
console.error(`units with quotes: RA2=${ra2}, RA3=${ra3}, total=${units.length}, lines=${units.reduce((n, u) => n + u.groups.reduce((m, g) => m + g.lines.length, 0), 0)}`);

const out = `// AUTO-GENERATED by scripts/scrape-redalert.mjs — do not edit by hand.
// Red Alert 2 & 3 unit voice quotes (source: cnc.fandom.com, CC-BY-SA). Internal use.

export interface RAQuoteGroup {
  /** Chinese action label (选中/移动/攻击/…). */
  label: string;
  lines: string[];
}

export interface RAUnit {
  name: string;
  /** "RA2" | "RA3" */
  game: string;
  groups: RAQuoteGroup[];
}

export const REDALERT_UNITS: RAUnit[] = ${JSON.stringify(units, null, 2)};
`;
writeFileSync(new URL('../packages/core/src/data/redalert.ts', import.meta.url), out);
console.error(`\nWrote ${units.length} units -> packages/core/src/data/redalert.ts`);
