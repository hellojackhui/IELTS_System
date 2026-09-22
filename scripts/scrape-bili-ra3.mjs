// Scrape the FULL Red Alert 3 unit voice bank from the Bilibili RA3 wiki
// (wiki.biligame.com/redalert3) and rebuild the RA3 section of
// packages/core/src/data/redalert-sentences.ts.
//
//   node scripts/scrape-bili-ra3.mjs            # scrape + rebuild
//   node scripts/scrape-bili-ra3.mjs --dry       # scrape only, print counts
//
// What it does
//   1. For every Chinese unit name in scripts/ra3-units.json, fetch the page
//      wikitext via api.php?action=query&prop=revisions&rvslots=main.
//   2. Parse every {{台词|标题=…|英文=…|中文=…|英文2=…|中文2=…}} block. NOTE:
//      one template holds MANY numbered lines (英文/英文2/英文3/…) — you must
//      collect all numbered fields, not just the first.
//   3. Keep only genuinely English lines. Japanese/Russian/Spanish voice lines
//      carry an English gloss in parentheses — that gloss is extracted so the
//      line is still learnable ("はい！(日语\"Yes!\")" -> "Yes!").
//   4. Normalise the action label (标题) into a small canonical set.
//   5. Emit entries grouped by faction with canonical ENGLISH unit names, then
//      splice them in place of the old RA3 section. RA2 and the Uprising-only
//      units (which have no wiki voice lines yet) are left untouched.
//
// The wiki is behind a WAF that intermittently returns HTTP 567 / a challenge
// page on burst requests. Requests are paced and retried; units that still fail
// are reported and left as-is (never silently dropped).
//
// Source: wiki.biligame.com/redalert3 — internal/personal use.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API = 'https://wiki.biligame.com/redalert3/api.php';
const TARGET = join(__dirname, '../packages/core/src/data/redalert-sentences.ts');
const DRY = process.argv.includes('--dry');
const SLEEP = Number(process.env.RA3_SLEEP_MS || 1500);

// ── Chinese unit name -> [canonical English name, faction] ────────────────
const FACTIONS = {
  Empire: [
    ['帝国武士', 'Empire Warrior'], ['坦克杀手', 'Tank Killer'], ['工兵', 'Imperial Engineer'],
    ['忍者', 'Shinobi'], ['火箭天使', 'Rocket Angel'], ['欧米茄百合子', 'Yuriko Omega'],
    ['帝国矿车', 'Empire Ore Collector'], ['迅雷运输艇', 'Sudden Transport'], ['天狗机甲', 'Mecha Tengu'],
    ['海啸坦克', 'Tsunami Tank'], ['打击者-VX', 'Striker-VX'], ['鬼王', 'King Oni'],
    ['波能炮', 'Wave-Force Artillery'], ['帝国基地车', 'Empire Construction Vehicle'],
    ['长枪迷你潜艇', 'Yari Mini-Sub'], ['海翼', 'Sea Wing'], ['薙刀巡洋舰', 'Naginata Cruiser'],
    ['将军战列舰', 'Shogun Battleship'], ['弓箭少女', 'Archer Maiden'], ['钢铁浪人', 'Steel Ronin'],
    ['超级要塞', 'Giga Fortress'],
  ],
  Allied: [
    ['维和步兵', 'Peacekeeper'], ['标枪兵', 'Javelin Soldier'], ['工程师', 'Allied engineer'],
    ['间谍', 'Spy'], ['谭雅', 'Tanya'], ['勘探者', 'Prospector'], ['激流ACV', 'Riptide ACV'],
    ['多功能步兵战车', 'Multigunner IFV'], ['守护者坦克', 'Guardian Tank'], ['雅典娜炮', 'Athena Cannon'],
    ['幻影坦克', 'Mirage tank'], ['盟军基地车', 'Allied Construction Vehicle'], ['维和轰炸机', 'Vindicator'],
    ['阿波罗战斗机', 'Apollo Fighter'], ['冰冻直升机', 'Cryocopter'], ['世纪轰炸机', 'Century Bomber'],
    ['水翼船', 'Hydrofoil'], ['突袭驱逐舰', 'Assault Destroyer'], ['航空母舰', 'Aircraft carrier'],
    ['冰冻部队', 'Cryo Legionnaire'], ['平定者', 'Pacifier'], ['未来坦克X-1', 'Future Tank X-1'],
    ['先锋武装战艇机', 'Harbinger'],
  ],
  Soviet: [
    ['动员兵', 'Conscript'], ['防空步兵', 'Flak trooper'], ['战斗工兵', 'Soviet Engineer'],
    ['磁暴部队', 'Tesla trooper'], ['娜塔莎', 'Natasha'], ['苏联矿车', 'Soviet ore collector'],
    ['史普尼克勘探车', 'Sputnik'], ['镰刀', 'Sickle'], ['牛蛙', 'Bullfrog'],
    ['铁锤坦克', 'Hammer Tank'], ['天启坦克', 'Apocalypse tank'], ['V4导弹发射车', 'V4 Rocket Launcher'],
    ['苏联基地车', 'Soviet Construction Vehicle'], ['双刃', 'Twinblade'], ['米格战斗机', 'MiG Fighter'],
    ['基洛夫飞艇', 'Kirov airship'], ['磁暴快艇', 'Stingray'], ['阿库拉潜艇', 'Akula'],
    ['无畏战列舰', 'Dreadnought'], ['火炮机车', 'Mortar Cycle'], ['化学部队', 'Desolator'],
    ['收割者', 'Reaper'], ['粉碎者', 'Grinder'],
  ],
};

// Units whose wiki page has no 台词 but which exist in Uprising — keep as-is.
// Uprising-only unit names kept verbatim across runs because their wiki page
// has no 台词 yet. Deliberately EMPTY: the eight names that used to sit here
// (Valkyrie Fighter / Riot Trooper / Multigunner Turret / Demolisher /
// Needle Gunner / Jet Tengu / Hiroshi / Tesla tank) appear in no authoritative
// RA3 roster — Uprising adds exactly 11 units (Empire 3 / Allied 4 / Soviet 4)
// and every one of them is already scraped from FACTIONS below.
const UPRISING_ONLY = [];

const GROUP_ORDER = ['出场', '选中', '移动', '行进攻击', '攻击', '特殊技能',
  '受到攻击', '战斗中', '撤退', '进驻建筑', '采矿', '修理'];

// ── fetching ──────────────────────────────────────────────────────────────
function fetchWikitext(title) {
  const enc = encodeURIComponent(title);
  const url = `${API}?action=query&titles=${enc}&prop=revisions&rvprop=content&rvslots=main&format=json`;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const out = execFileSync('curl', ['-s', '--max-time', '40', url], {
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      });
      if (!out || out[0] !== '{') throw new Error('non-json (WAF / rate-limited)');
      const d = JSON.parse(out);
      for (const p of Object.values(d?.query?.pages || {})) {
        if (p.revisions) return p.revisions[0].slots.main['*'];
      }
      return null; // page genuinely missing
    } catch (e) {
      if (attempt === 4) throw e;
      execFileSync('sleep', [String(3 + attempt * 3)]);
    }
  }
  return null;
}

// ── parsing ───────────────────────────────────────────────────────────────
const NONLATIN = /[\u0400-\u04ff\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff66-\uff9f\u00a1\u00bf]/;

function annotationEnglish(s) {
  // (a) quoted gloss inside parentheses: （"Everything is in order!")
  const q = s.match(/[\u201c\u201d"']([A-Za-z][^"'\u201c\u201d]{1,80})["\u201d\u201c']/);
  if (q) {
    const cand = q[1].replace(/[*＊]/g, '').trim();
    if (/[A-Za-z]{2,}/.test(cand) && !NONLATIN.test(cand)) return cand;
  }
  // (b) plain English parenthetical with >= 2 words: (Of course!)
  for (const mm of s.matchAll(/[（(]([^）)]*)[）)]/g)) {
    let inner = mm[1].replace(/[*＊]/g, '').trim().replace(/^["'“”\s]+|["'“”\s]+$/g, '');
    if (NONLATIN.test(inner)) continue;
    if (/[A-Za-z]{2,}/.test(inner) && inner.split(/\s+/).length >= 2) return inner;
  }
  return null;
}

function cleanEn(raw) {
  const s = String(raw ?? '').replace(/^[*＊\s]+|[*＊\s]+$/g, '');
  if (!s) return null;
  // non-Latin led line (Japanese / Russian / Spanish): keep only its English gloss
  if (NONLATIN.test(s)) return annotationEnglish(s);
  // English-led line: drop parentheticals that are non-Latin or annotation notes
  let t = s.replace(/[（(][^）)]*[）)]/g, (m) =>
    (NONLATIN.test(m) || /(日语|俄语|西语|读音|Japanese|Russian)/.test(m)) ? '' : m);
  t = t.replace(/^[\s,、，。;；:：-]+/, '').replace(/\s+/g, ' ').trim();
  if (!t || NONLATIN.test(t) || !/[A-Za-z]{2,}/.test(t)) return null;
  return t;
}

function normGroup(title) {
  const t = String(title || '').trim();
  if (/(出厂|出场|训练完成|出矿石精炼厂|出战车工厂|船坞)/.test(t)) return '出场';
  if (/(行进攻击|移动攻击)/.test(t)) return '行进攻击';
  if (t.includes('选中')) return '选中';
  if (/(受击|低血量|血量低)/.test(t)) return '受到攻击';
  if (t.includes('战斗中')) return '战斗中';
  if (/(撤退|返回基地)/.test(t)) return '撤退';
  if (/(进驻建筑|占领建筑|渗透|驻军|潜入)/.test(t)) return '进驻建筑';
  if (/(采矿|采集矿石|返回精炼厂|返回矿场)/.test(t)) return '采矿';
  if (t.includes('修')) return '修理';
  if (t.includes('移动') || ['登陆', '下海', '上岸'].includes(t)) return '移动';
  if (/(攻击|轰炸|炮击)/.test(t)) return '攻击';
  return '特殊技能';
}

function parseQuotes(wikitext) {
  const out = [];
  for (const b of wikitext.matchAll(/\{\{台词\s*([\s\S]*?)\}\}/g)) {
    const body = b[1];
    const tm = body.match(/\|\s*标题\s*=\s*([^\n|]+)/);
    const group = normGroup(tm ? tm[1] : '选中');
    // collect ALL numbered English/Chinese fields (English/英文2/英文3/…)
    const ens = [...body.matchAll(/\|\s*英文(?:[0-9]+)?\s*=\s*([^\n|]+)/g)].map((m) => m[1]);
    const zhs = [...body.matchAll(/\|\s*中文(?:[0-9]+)?\s*=\s*([^\n|]+)/g)].map((m) => m[1]);
    for (let i = 0; i < ens.length; i++) {
      const en = cleanEn(ens[i]);
      const zh = String(zhs[i] ?? '').replace(/^[*＊\s]+|[*＊\s]+$/g, '').trim();
      if (!en || !zh) continue;
      out.push({ en, zh, group });
    }
  }
  const seen = new Set();
  return out.filter((q) => {
    const k = q.en.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ── main ──────────────────────────────────────────────────────────────────
const content = readFileSync(TARGET, 'utf8');
const RA3_MARK = '  // ======================== Red Alert 3 ========================';
const start = content.indexOf(RA3_MARK);
if (start < 0) throw new Error('RA3 section marker not found in target file');
const end = content.indexOf('\n];', start);
if (end < 0) throw new Error("RA3 array terminator '];' not found");

// Index the existing RA3 entries by unit so a unit that fails to scrape this
// run can fall back to what is already on disk instead of being dropped.
const ra3Seg = content.slice(start, end);
const existingByUnit = new Map();
for (const l of ra3Seg.split('\n')) {
  const m = l.match(/unit: '((?:[^'\\]|\\.)*)', game: 'RA3'/);
  if (!m) continue;
  const u = m[1];
  if (!existingByUnit.has(u)) existingByUnit.set(u, []);
  existingByUnit.get(u).push(l);
}

// keep Uprising-only entries verbatim (their wiki page has no 台词 yet)
const kept = ra3Seg.split('\n').filter((l) => {
  const m = l.match(/unit: '([^']*)', game: 'RA3'/);
  return m && UPRISING_ONLY.includes(m[1]);
});

const stats = {};
let failed = [];
const blocks = [];

for (const [faction, units] of Object.entries(FACTIONS)) {
  const lines = [`\n  // ── ${faction} ──────────────────────────────────────`];
  let factionTotal = 0;
  for (const [cn, enName] of units) {
    let wt = null;
    try {
      wt = fetchWikitext(cn);
    } catch (e) {
      failed.push(`${cn} (${e.message})`);
    }
    if (!wt) {
      const prev = existingByUnit.get(enName) || [];
      if (prev.length) lines.push(`  // ${enName}（${cn}）— 本次抓取失败，保留原条目`, ...prev, '');
      process.stderr.write(`  SKIP (no wikitext${prev.length ? ', kept previous' : ''}): ${cn}\n`);
      await sleepAsync(SLEEP);
      continue;
    }
    const quotes = parseQuotes(wt);
    if (!quotes.length) {
      const prev = existingByUnit.get(enName) || [];
      if (prev.length) lines.push(`  // ${enName}（${cn}）— 维基无台词，保留原条目`, ...prev, '');
      process.stderr.write(`  SKIP (no 台词 on wiki): ${cn}\n`);
      await sleepAsync(SLEEP);
      continue;
    }
    quotes.sort((a, b) => {
      const ga = GROUP_ORDER.indexOf(a.group), gb = GROUP_ORDER.indexOf(b.group);
      return (ga < 0 ? 99 : ga) - (gb < 0 ? 99 : gb);
    });
    lines.push(`  // ${enName}（${cn}）`);
    for (const q of quotes) {
      const en = q.en.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      const zh = q.zh.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      lines.push(`  { en: '${en}', zh: '${zh}', unit: '${enName}', game: 'RA3', group: '${q.group}' },`);
    }
    lines.push('');
    stats[enName] = quotes.length;
    factionTotal += quotes.length;
    process.stderr.write(`  OK ${cn} -> ${enName}: ${quotes.length} lines\n`);
    await sleepAsync(SLEEP);
  }
  blocks.push(lines.join('\n'));
}

function sleepAsync(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let keptBlock = '';
if (kept.length) {
  keptBlock = '\n  // ── 起义时刻专属单位（Bili 维基暂无台词，保留原条目） ──────────\n' + kept.join('\n') + '\n';
}

const newSection = RA3_MARK + '\n' + blocks.join('\n').trimEnd() + '\n' + keptBlock;
const total = Object.values(stats).reduce((a, b) => a + b, 0);

if (DRY) {
  console.log(JSON.stringify(stats, null, 2));
  console.log(`\nDRY RUN: ${Object.keys(stats).length} units, ${total} lines`);
  if (failed.length) console.log('failed:', failed);
} else {
  writeFileSync(TARGET, content.slice(0, start) + newSection + content.slice(end));
  console.log(`Rebuilt RA3: ${Object.keys(stats).length} units, ${total} lines (+${kept.length} uprising-only kept)`);
  if (failed.length) console.log('failed units (left as-is):', failed);
}
