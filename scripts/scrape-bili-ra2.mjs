// Rebuild the RA2 section of packages/core/src/data/redalert-sentences.ts from
// the three Bilibili articles "红色警戒2中各单位说的话" (步兵篇 / 车辆篇 / 补充篇),
// which together cover the full RA2 + Yuri's Revenge unit roster with English
// voice lines and Chinese translations.
//
//   node scripts/scrape-bili-ra2.mjs --dry     # scrape + report, do not write
//   node scripts/scrape-bili-ra2.mjs           # scrape + rewrite the RA2 array
//   RA2_SLEEP_MS=4000 node scripts/scrape-bili-ra2.mjs   # slower (rate limits)
//
// Why this source
//   cnc.fandom is English-only, and there is no Bilibili RA2 wiki
//   (wiki.biligame.com/redalert2 does not exist — the subdomain 301s to a
//   generic page). These three read/opus articles are the only Chinese source
//   found with complete per-unit quotes.
//
// How it reads the article
//   The rendered HTML carries anti-scrape artefacts (zero-width spaces, split
//   HTML entities, inline topic links), so parse the embedded
//   window.__INITIAL_STATE__ JSON instead:
//   detail.modules[MODULE_TYPE_CONTENT].module_content.paragraphs is a clean,
//   ordered paragraph list. para_type 1 = text (each voice line is its own
//   paragraph, though one paragraph may hold several newline-separated lines),
//   2 = image, 3 = divider.
//
// Article structure
//   unit header  -> "NO.3光棱坦克" / "NO .4幻影坦克" / "【盟军男平民】"
//                   (note the optional space: "NO .4")
//   english name -> the next short ASCII-only line (e.g. "Prism Tank")
//   section      -> "选择：" / "移动:" / "攻击：" …
//   line         -> "Prism tank in order, sir 光棱坦克就绪 长官"   (EN then ZH)
//
// Units the articles do not cover keep their previous entries verbatim, so
// nothing is silently dropped. Safe to re-run.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET = join(__dirname, '../packages/core/src/data/redalert-sentences.ts');
const DRY = process.argv.includes('--dry');
const SLEEP = Number(process.env.RA2_SLEEP_MS || 3000);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/120.0 Safari/537.36';

const ARTICLES = [
  [1990653, '步兵篇'],
  [2009267, '车辆篇'],
  [2014629, '补充篇'],
];

// [article Chinese name, canonical English name, faction]
const MAP = [
  // ── 盟军 / Allied ──
  ['美国大兵', 'GI', 'Allied'],
  ['盟军工程师', 'Engineer', 'Allied'],
  ['间谍', 'Spy', 'Allied'],
  ['阻击手', 'Sniper', 'Allied'],
  ['海豹部队', 'Navy SEAL', 'Allied'],
  ['潭雅', 'Tanya', 'Allied'],
  ['超时空军团兵', 'Chrono Legionnaire', 'Allied'],
  ['灰熊坦克', 'Grizzly Tank', 'Allied'],
  ['多功能步兵车', 'IFV', 'Allied'],
  ['光棱坦克', 'Prism tank', 'Allied'],
  ['幻影坦克', 'Mirage tank', 'Allied'],
  ['坦克杀手', 'Tank Buster', 'Allied'],
  ['战斗要塞', 'Battle Fortress', 'Allied'],
  ['盟军MCV', 'Mobile construction vehicle', 'Allied'],
  ['时空矿车', 'Chrono Miner', 'Allied'],
  ['火箭飞兵', 'Rocketeer', 'Allied'],
  ['入侵者战机', 'Intruder', 'Allied'],
  ['黑鹰战机', 'Black Eagle', 'Allied'],
  ['夜鹰运兵机', 'Nighthawk', 'Allied'],
  ['驱逐舰', 'Destroyer', 'Allied'],
  ['神盾巡洋舰', 'Aegis Cruiser', 'Allied'],
  ['航空母舰', 'Aircraft carrier', 'Allied'],
  ['盟军气垫船', 'Amphibious transport', 'Allied'],
  ['牛仔', 'Cowboy', 'Allied'],
  ['超级保镖', 'Bodyguard', 'Allied'],
  ['盟军男平民', 'Allied Civilian', 'Allied'],
  ['盟军女子', 'Allied Civilian Woman', 'Allied'],
  ['爱因斯坦教授', 'Professor Einstein', 'Allied'],
  ['总统', 'President', 'Allied'],
  // ── 苏联 / Soviet ──
  ['动员兵', 'Conscript', 'Soviet'],
  ['防空兵', 'Flak trooper', 'Soviet'],
  ['磁暴步兵', 'Tesla trooper', 'Soviet'],
  ['疯狂伊文', 'Crazy Ivan', 'Soviet'],
  ['辐射工兵', 'Desolator', 'Soviet'],
  ['鲍里斯', 'Boris', 'Soviet'],
  ['苏军工程师', 'Soviet Engineer', 'Soviet'],
  ['犀牛坦克', 'Rhino tank', 'Soviet'],
  ['防空履带车', 'Flak Track', 'Soviet'],
  ['天启坦克', 'Apocalypse tank', 'Soviet'],
  ['电磁坦克', 'Tesla tank', 'Soviet'],
  ['自爆卡车', 'Demolition truck', 'Soviet'],
  ['恐怖机器人', 'Terror Drone', 'Soviet'],
  ['苏军MCV', 'Soviet MCV', 'Soviet'],
  ['武装矿车', 'War Miner', 'Soviet'],
  ['火箭发射车', 'V3 Rocket Launcher', 'Soviet'],
  ['基洛夫空艇', 'Kirov airship', 'Soviet'],
  ['武装直升机', 'Siege Chopper', 'Soviet'],
  ['台风级攻击潜艇', 'Typhoon Attack Sub', 'Soviet'],
  ['海蝎号', 'Sea Scorpion', 'Soviet'],
  ['无畏级战舰', 'Dreadnought', 'Soviet'],
  ['雷鸣潜艇', 'Boomer Submarine', 'Soviet'],
  ['苏军气垫船', 'Soviet Hovercraft', 'Soviet'],
  ['米格战机', 'MiG Fighter', 'Soviet'],
  ['登月火箭飞行兵', 'Cosmonaut', 'Soviet'],
  ['俄男平民', 'Soviet Civilian', 'Soviet'],
  ['俄妇女', 'Soviet Civilian Woman', 'Soviet'],
  ['若曼诺夫总理', 'Premier Romanov', 'Soviet'],
  ['解放的奴隶', 'Freed Slave', 'Soviet'],
  ['恐怖分子', 'Terrorist', 'Soviet'],
  // 狗(Attack Dog) / 恐怖机器人(Terror Drone) intentionally omitted: both are
  // real RA2 units but have no spoken English lines (barks / servo noise only),
  // so the source only carries phonetic filler that is filtered out anyway.
  // ── 尤里 / Yuri ──
  ['尤里', 'Yuri', 'Yuri'],
  ['尤里新兵', 'Initiate', 'Yuri'],
  ['尤里复制人', 'Yuri Clone', 'Yuri'],
  ['尤里X', 'Yuri Prime', 'Yuri'],
  ['狂兽人', 'Brute', 'Yuri'],
  ['病毒狙击手', 'Virus', 'Yuri'],
  ['盖特机车', 'Gattling Tank', 'Yuri'],
  ['狂风坦克', 'Lasher Tank', 'Yuri'],
  ['磁能坦克', 'Magnetron', 'Yuri'],
  ['精神控制车', 'Mastermind', 'Yuri'],
  ['镭射幽浮', 'Floating Disc', 'Yuri'],
  ['奴隶矿厂', 'Slave Miner', 'Yuri'],
  ['尤里MCV', 'Yuri MCV', 'Yuri'],
  ['尤里气垫船', 'Yuri Hovercraft', 'Yuri'],
  ['尤里通讯官Misaka Yimodo', 'Yuri Communications Officer', 'Yuri'],
  ['巨型乌贼', 'Giant Squid', 'Yuri'],
];

const GROUP_MAP = {
  选择: '选中', 回应: '选中', '': '选中',
  移动: '移动',
  攻击: '攻击', 攻击建筑: '攻击', '攻击【机枪】': '攻击', '攻击【大炮】': '攻击',
  '攻击【火箭】': '攻击', '攻击【鱼雷】': '攻击',
  受伤: '受到攻击', 超载状态: '受到攻击',
  出场: '出场', 生产: '出场',
  特殊: '特殊技能', 部署: '特殊技能', 解除部署: '特殊技能',
  坠毁: '阵亡', 坠落: '阵亡', 阵亡: '阵亡', '阵亡:': '阵亡',
};
const GROUP_ORDER = ['出场', '选中', '移动', '攻击', '特殊技能', '受到攻击', '阵亡'];
const SECTION_WORDS = ['选择', '选中', '移动', '攻击', '受伤', '回应', '出场', '特殊',
  '生产', '部署', '阵亡', '坠毁', '坠落', '超载'];
const UPRISING_PLACEHOLDER = '补充（源文章未覆盖，原样保留）';   // kept-only section marker

// the article series ends every instalment with a sign-off paragraph that the
// table parser picks up as if it were a unit line — drop those.
const FOOTER_EN = /^(END|PS[:：]?)$/i;
const FOOTER_ZH = /欢迎讨论|欢迎指正|求三连|本篇完毕|准备更新|UP主/;

const CJK = /[\u3400-\u9fff\u3040-\u30ff]/;
const ZW = /[\u200b-\u200f\ufeff]/;
const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

// Optional offline cache: set RA2_CACHE_DIR to a directory holding cv<id>.html
// files (e.g. downloaded earlier) to rebuild without hitting bilibili again.
// Bilibili rate-limits hard (-509 / a 3 kB shell page), so caching the raw
// articles once and re-running off the cache is the reliable workflow.
const CACHE_DIR = process.env.RA2_CACHE_DIR || '';

function readCache(cvid) {
  if (!CACHE_DIR) return null;
  try {
    const p = join(CACHE_DIR, `cv${cvid}.html`);
    const txt = readFileSync(p, 'utf8');
    return txt.includes('__INITIAL_STATE__') ? txt : null;
  } catch {
    return null;
  }
}

/** Returns the article HTML, or null if it could not be retrieved. */
async function fetchArticle(cvid) {
  const cached = readCache(cvid);
  if (cached) {
    process.stderr.write(`  cv${cvid}: using cached html (${cached.length} bytes)\n`);
    return cached;
  }
  const url = `https://www.bilibili.com/read/cv${cvid}/`;
  for (let attempt = 0; attempt < 6; attempt++) {
    const out = execFileSync('curl', ['-sL', '-A', UA, '-H', 'Referer: https://www.bilibili.com/',
      '--max-time', '40', url], { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
    if (out.length > 50000 && out.includes('__INITIAL_STATE__')) return out;
    process.stderr.write(`  retry cv${cvid}: only ${out.length} bytes (rate-limited)\n`);
    await sleepMs(20000 + attempt * 10000);
  }
  process.stderr.write(`  FAILED cv${cvid}: giving up (rate-limited)\n`);
  return null;
}

function stateOf(html) {
  const i = html.indexOf('window.__INITIAL_STATE__=');
  if (i < 0) throw new Error('no __INITIAL_STATE__ in page');
  const j = html.indexOf('{', i);
  let depth = 0, k = j, inStr = false, esc = false;
  for (; k < html.length; k++) {
    const c = html[k];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
    } else if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) break; }
  }
  return JSON.parse(html.slice(j, k + 1));
}

function paragraphStream(state) {
  for (const m of state.detail.modules) {
    if (m.module_type !== 'MODULE_TYPE_CONTENT') continue;
    const out = [];
    for (const p of (m.module_content?.paragraphs ?? [])) {
      if (p.para_type !== 1) { out.push(''); continue; }
      const txt = ((p.text?.nodes) ?? []).map((n) => n.word?.words ?? '').join('');
      for (const piece of txt.split('\n')) out.push(piece);
    }
    return out;
  }
  return [];
}

const norm = (s) => s.replace(ZW, '').replace(/[\u00a0\u3000]/g, ' ').replace(/\s+/g, ' ').trim();

function splitEnZh(s) {
  const m = CJK.exec(s);
  if (!m) return [s.trim(), ''];
  return [s.slice(0, m.index).trim(), s.slice(m.index).trim()];
}

function unescapeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#34;|&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<');
}

function cleanLine(s) {
  return unescapeEntities(s).replace(/^[*＊\s]+|[*＊\s]+$/g, '').trim();
}

/** Case/punctuation-insensitive key so "It is day of judgement" and
 *  "It is day of judgement!" collapse to one entry. */
function dedupeKey(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Parse one article HTML into [{cn, en, sections:[{group, lines:[[en,zh]]}]}]. */
function parseArticle(html) {
  const units = [];
  let cur = null;
  let pendingEn = false;
  for (const raw of paragraphStream(stateOf(html))) {
    const txt = norm(raw);
    if (!txt) continue;
    const numbered = /^NO\s*\.?\s*(\d+)\s*(.+)$/.exec(txt);
    const bracketed = /^【(.+?)】$/.exec(txt);
    if (numbered || bracketed) {
      cur = { cn: (numbered ? numbered[2] : bracketed[1]).trim(), en: '', sections: [] };
      units.push(cur);
      pendingEn = true;
      continue;
    }
    if (!cur) continue;
    if (pendingEn && !CJK.test(txt) && txt.length < 60 && /[A-Za-z]/.test(txt)) {
      cur.en = txt;
      pendingEn = false;
      continue;
    }
    pendingEn = false;
    const bare = txt.replace(/[：:]\s*$/, '').trim();
    if (/[：:]$/.test(txt) && bare.length <= 12
        && SECTION_WORDS.some((w) => bare.includes(w))) {
      cur.sections.push({ group: bare, lines: [] });
      continue;
    }
    const [en, zh] = splitEnZh(txt);
    if (!en && !zh) continue;
    if (!cur.sections.length) cur.sections.push({ group: '', lines: [] });
    cur.sections[cur.sections.length - 1].lines.push([en, zh]);
  }
  return units;
}

// ── existing RA2 entries (kept for units the articles do not cover) ────────
const content = readFileSync(TARGET, 'utf8');
const RA2_DECL = 'const RA2_SENTENCES: RASentence[] = [';
const RA2_MARK = '  // ======================== Red Alert 2 ========================';
const declIdx = content.indexOf(RA2_DECL);
const markIdx = content.indexOf(RA2_MARK, declIdx);
const closeIdx = content.indexOf('\n];', markIdx);
if (declIdx < 0 || markIdx < 0 || closeIdx < 0) {
  throw new Error('could not locate the RA2 array in redalert-sentences.ts');
}
const existingSeg = content.slice(markIdx, closeIdx);
const existing = new Map();
for (const line of existingSeg.split('\n')) {
  const m = /unit: '((?:[^'\\]|\\.)*)', game: 'RA2'/.exec(line);
  if (m) {
    if (!existing.has(m[1])) existing.set(m[1], []);
    existing.get(m[1]).push(line.trim());
  }
}

// ── scrape ────────────────────────────────────────────────────────────────
const units = {};
const failedArticles = [];
for (const [cvid, label] of ARTICLES) {
  process.stderr.write(`fetching ${label} (cv${cvid})…\n`);
  const html = await fetchArticle(cvid);
  if (!html) { failedArticles.push(`${label}(cv${cvid})`); continue; }
  const parsed = parseArticle(html);
  process.stderr.write(`  ${label}: ${parsed.length} units\n`);
  for (const u of parsed) {
    if (units[u.cn]) units[u.cn].sections.push(...u.sections);
    else units[u.cn] = u;
  }
  await sleepMs(SLEEP);
}

// A missing article would silently drop whole unit groups, so refuse to write.
if (failedArticles.length) {
  console.error(`\nABORTED: could not fetch ${failedArticles.join(', ')}.`
    + ' Nothing was written; re-run later or set RA2_CACHE_DIR to cached cv*.html files.');
  process.exit(1);
}

// ── build entries ─────────────────────────────────────────────────────────
const ESC = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const stats = {};
const emitted = new Set();
const blocks = [];

for (const faction of ['Allied', 'Soviet', 'Yuri']) {
  const out = [`\n  // ── ${faction} ──────────────────────────────────────`];
  for (const [cn, enName, fac] of MAP) {
    if (fac !== faction) continue;
    const u = units[cn];
    const rows = [];
    if (u) {
      for (const s of u.sections) {
        const g = GROUP_MAP[s.group] ?? '特殊技能';
        for (const [rawEn, rawZh] of s.lines) {
          const e = cleanLine(rawEn);
          const z = cleanLine(rawZh);
          // drop the author's joke "translations" of non-verbal unit sounds
          if (!e || !z || z.includes('翻译') || z.startsWith('（')) continue;
          if (!/[A-Za-z]{2,}/.test(e)) continue;
          if (FOOTER_EN.test(e) || FOOTER_ZH.test(z)) continue;
          rows.push([g, e, z]);
        }
      }
    }
    const dedup = [];
    const seen = new Set();
    for (const [g, e, z] of rows) {
      const k = dedupeKey(e);
      if (seen.has(k)) continue;
      seen.add(k);
      dedup.push([g, e, z]);
    }
    // Append previous hand-authored entries the articles did not already supply.
    // The key is normalised (case/punctuation-insensitive) so re-running over a
    // file this script produced does not accumulate near-duplicates — the run
    // is idempotent.
    for (const raw of existing.get(enName) ?? []) {
      const m = /en: '((?:[^'\\]|\\.)*)', zh: '((?:[^'\\]|\\.)*)', unit: '[^']*', game: 'RA2', group: '([^']*)'/.exec(raw);
      if (!m) continue;
      const k = dedupeKey(m[1]);
      if (seen.has(k)) continue;
      seen.add(k);
      dedup.push([m[3], m[1], m[2]]);
    }
    if (!dedup.length) continue;
    dedup.sort((a, b) => {
      const ia = GROUP_ORDER.indexOf(a[0]), ib = GROUP_ORDER.indexOf(b[0]);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    out.push(`  // ${enName}（${cn}）`);
    for (const [g, e, z] of dedup) {
      out.push(`  { en: '${ESC(e)}', zh: '${ESC(z)}', unit: '${ESC(enName)}', game: 'RA2', group: '${g}' },`);
    }
    out.push('');
    stats[enName] = dedup.length;
    emitted.add(enName);
  }
  blocks.push(out.join('\n'));
}

// units only present in the old file keep their entries verbatim
const leftovers = [...existing.keys()].filter((u) => !emitted.has(u));
let leftBlock = '';
if (leftovers.length) {
  const lb = [`\n  // ── ${UPRISING_PLACEHOLDER} ──────────────`];
  for (const u of leftovers.sort()) {
    lb.push(`  // ${u}`);
    lb.push(...existing.get(u).map((l) => `  ${l}`));
    lb.push('');
  }
  leftBlock = lb.join('\n');
}

const newSection = `${RA2_MARK}\n${blocks.join('\n').trimEnd()}\n${leftBlock}`;
const total = Object.values(stats).reduce((a, b) => a + b, 0);

if (DRY) {
  console.log(JSON.stringify(stats, null, 2));
  console.log(`\nDRY RUN: ${Object.keys(stats).length} units, ${total} lines`
    + ` (+${leftovers.length} kept-only: ${leftovers.join(', ')})`);
} else {
  writeFileSync(TARGET, content.slice(0, markIdx) + newSection + content.slice(closeIdx));
  console.log(`Rebuilt RA2: ${Object.keys(stats).length} units, ${total} lines`
    + ` (+${leftovers.length} kept-only: ${leftovers.join(', ')})`);
}
