import { Ionicons } from '@expo/vector-icons';
import {
  buildChallengeLevels,
  HOC_EPISODES,
  HOC_QUOTES,
  hocLineCount,
  hocQuoteSeasons,
  hocQuotesBySeason,
  hocSeasonEpisodes,
  hocSeasons,
  RA_FACTION_META,
  raUnitsByFaction,
  SCENARIOS,
  unitFaction,
  type ChallengeLevel,
  type HocEpisode,
  type HocQuote,
  type RAGame,
  type RAUnitSentences,
  type RASentence,
  type Scenario,
} from '@ielts/core';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ScreenHeader } from '../components/ui';
import { getChallengeProgress, type LevelProgress } from '../challenge';
import { boards, colors, CONTENT_MAX_WIDTH, radius, shadow, space, WIDE_BREAKPOINT } from '../theme';
import { ChallengeFlow } from './Challenge';

const A = boards.scenario.accent;

function speak(text: string, rate = 0.95) {
  Speech.stop();
  Speech.speak(text, { language: 'en-US', rate });
}

function StarRow({ stars, size = 14 }: { stars: number; size?: number }) {
  return (
    <View style={styles.stars}>
      {[0, 1, 2].map((i) => (
        <Ionicons key={i} name={i < stars ? 'star' : 'star-outline'} size={size} color={i < stars ? '#F2B705' : colors.textMuted} />
      ))}
    </View>
  );
}

const RA_GAMES: { game: RAGame; label: string; desc: string }[] = [
  { game: 'RA2', label: '红警 2', desc: '原版 + 尤复的复仇' },
  { game: 'RA3', label: '红警 3', desc: '原版 + 起义时刻' },
];

/** House of Cards script bank: 6 seasons / 73 episodes / ~16k lines of English dialogue. */
const HOC_ACCENT = '#7A2E3E';
const HOC_SEASON_COUNT = hocSeasons().length;
const HOC_EPISODE_COUNT = HOC_EPISODES.length;
const HOC_LINE_COUNT = hocLineCount();

/** Thousands separator without relying on Intl, which Hermes does not always ship. */
function formatCount(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function gameLabel(g: RAGame): string {
  switch (g) {
    case 'RA2':
      return '红警 2';
    case 'RA3':
      return '红警 3';
    default:
      return g;
  }
}

function groupSentences(sentences: RASentence[]): { label: string; sentences: RASentence[] }[] {
  const map = new Map<string, RASentence[]>();
  for (const s of sentences) {
    if (!map.has(s.group)) map.set(s.group, []);
    map.get(s.group)!.push(s);
  }
  return [...map.entries()].map(([label, ss]) => ({ label, sentences: ss }));
}

type SBView =
  | { k: 'home'; tab: 'browse' | 'challenge' }
  | { k: 'scenario'; s: Scenario }
  | { k: 'ra'; game: RAGame; label: string }
  | { k: 'raUnit'; unit: RAUnitSentences }
  | { k: 'hocEpisodes' }
  | { k: 'hocEpisode'; ep: HocEpisode }
  | { k: 'hocQuotes' }
  | { k: 'challengeFlow'; level: ChallengeLevel };

export function ScenarioBoard() {
  const [view, setView] = useState<SBView>({ k: 'home', tab: 'browse' });
  const [progress, setProgress] = useState<Record<string, LevelProgress>>({});
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT;

  const reloadProgress = useCallback(() => {
    getChallengeProgress().then(setProgress);
  }, []);
  useEffect(() => {
    reloadProgress();
  }, [reloadProgress]);

  const levels = buildChallengeLevels();
  const clearedCount = Object.values(progress).filter((p) => p.cleared).length;
  const totalStars = Object.values(progress).reduce((n, p) => n + (p.bestStars ?? 0), 0);

  if (view.k === 'scenario') return <ScenarioDetail scenario={view.s} wide={wide} onBack={() => setView({ k: 'home', tab: 'browse' })} />;
  if (view.k === 'ra')
    return <RAUnits game={view.game} label={view.label} wide={wide} onBack={() => setView({ k: 'home', tab: 'browse' })} onOpen={(unit) => setView({ k: 'raUnit', unit })} />;
  if (view.k === 'raUnit')
    return (
      <RAUnitView
        unit={view.unit}
        wide={wide}
        onBack={() => setView({ k: 'ra', game: view.unit.game, label: gameLabel(view.unit.game) })}
        onChallenge={() => setView({ k: 'challengeFlow', level: levels.find((l) => l.id === `ra:${view.unit.game}:${view.unit.unit}`)! })}
      />
    );
  if (view.k === 'hocEpisodes')
    return (
      <HocEpisodeList
        wide={wide}
        onBack={() => setView({ k: 'home', tab: 'browse' })}
        onOpen={(ep) => setView({ k: 'hocEpisode', ep })}
        onQuotes={() => setView({ k: 'hocQuotes' })}
      />
    );
  if (view.k === 'hocEpisode')
    return <HocEpisodeView ep={view.ep} wide={wide} onBack={() => setView({ k: 'hocEpisodes' })} />;
  if (view.k === 'hocQuotes') return <HocQuotesView wide={wide} onBack={() => setView({ k: 'hocEpisodes' })} />;
  if (view.k === 'challengeFlow')
    return (
      <ChallengeFlow
        level={view.level}
        onExit={() => setView({ k: 'home', tab: 'challenge' })}
        onCleared={() => reloadProgress()}
      />
    );

  return (
    <ScrollView contentContainerStyle={[styles.container, wide && styles.containerWide]} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="场景" subtitle="吃穿住行 · 出门就能用的口语" accent={A} right={<Segmented tab={view.tab} onChange={(t) => setView({ k: 'home', tab: t })} />} />

      {view.tab === 'browse' ? (
        <>
          <View style={wide ? styles.grid : undefined}>
            {SCENARIOS.map((s) => {
              const p = progress[`sc:${s.id}`];
              return (
                <Pressable key={s.id} style={[styles.catCard, shadow.soft, wide && styles.catCardWide]} onPress={() => setView({ k: 'scenario', s })}>
                  <View style={styles.catIcon}>
                    <Ionicons name={s.icon as keyof typeof Ionicons.glyphMap} size={22} color={A} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.catTitle}>{s.title}</Text>
                    <Text style={styles.catCount}>{s.sentences.length} 句</Text>
                  </View>
                  {p?.cleared && <StarRow stars={p.bestStars ?? 0} />}
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>游戏台词 · 红警句子库</Text>
          <View style={wide ? styles.grid : undefined}>
            {RA_GAMES.map((g) => {
              const groups = raUnitsByFaction(g.game);
              const n = groups.reduce((sum, grp) => sum + grp.units.length, 0);
              const cleared = levels.filter((l) => l.kind === 'ra' && l.id.startsWith(`ra:${g.game}:`)).filter((l) => progress[l.id]?.cleared).length;
              return (
                <Pressable
                  key={g.game}
                  style={[styles.catCard, shadow.soft, wide && styles.catCardWide]}
                  onPress={() => setView({ k: 'ra', game: g.game, label: g.label })}
                >
                  <View style={styles.catIcon}>
                    <Ionicons name="game-controller-outline" size={22} color={A} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.catTitle}>{g.label}</Text>
                    <Text style={styles.catCount}>
                      {groups.length} 阵营 · {n} 个单位 · {cleared}/{n} 关
                    </Text>
                  </View>
                  <View style={styles.groupDots}>
                    {groups.map((grp) => (
                      <View key={grp.faction} style={[styles.groupDot, { backgroundColor: grp.color }]} />
                    ))}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionLabel}>影视台词 · 美剧</Text>
          <View style={wide ? styles.grid : undefined}>
            <Pressable
              style={[styles.catCard, shadow.soft, wide && styles.catCardWide]}
              onPress={() => setView({ k: 'hocEpisodes' })}
            >
              <View style={styles.catIcon}>
                <Ionicons name="tv-outline" size={22} color={A} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.catTitle}>纸牌屋</Text>
                <Text style={styles.catCount}>
                  House of Cards · {HOC_SEASON_COUNT} 季 {HOC_EPISODE_COUNT} 集 · {formatCount(HOC_LINE_COUNT)} 句
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <View style={[styles.progressBanner, { backgroundColor: A + '12' }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: A }]}>{clearedCount}</Text>
              <Text style={styles.statLbl}>已通关</Text>
            </View>
            <View style={styles.statDiv} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: A }]}>{levels.length}</Text>
              <Text style={styles.statLbl}>总关卡</Text>
            </View>
            <View style={styles.statDiv} />
            <View style={styles.statItem}>
              <Text style={[styles.statNum, { color: A }]}>{totalStars}</Text>
              <Text style={styles.statLbl}>★ 总星数</Text>
            </View>
          </View>

          <Text style={styles.sectionLabel}>场景关卡</Text>
          <View style={wide ? styles.grid : undefined}>
            {levels
              .filter((l) => l.kind === 'scenario')
              .map((l) => (
                <LevelCard key={l.id} level={l} progress={progress[l.id]} wide={wide} onChallenge={() => setView({ k: 'challengeFlow', level: l })} onBrowse={() => { const s = SCENARIOS.find((x) => `sc:${x.id}` === l.id); if (s) setView({ k: 'scenario', s }); }} />
              ))}
          </View>

          <Text style={styles.sectionLabel}>红警单位关卡</Text>
          {RA_GAMES.map((gm) =>
            raUnitsByFaction(gm.game).map((grp) => (
              <View key={`${gm.game}:${grp.faction}`} style={styles.groupSection}>
                <View style={styles.groupHead}>
                  <View style={[styles.groupDot, { backgroundColor: grp.color }]} />
                  <Text style={styles.groupName}>
                    {gm.label} · {grp.zh}
                  </Text>
                  <Text style={styles.groupCount}>{grp.units.length} 关</Text>
                </View>
                <View style={wide ? styles.grid : undefined}>
                  {grp.units.map((u) => {
                    const l = levels.find((x) => x.id === `ra:${u.game}:${u.unit}`);
                    if (!l) return null;
                    return (
                      <LevelCard
                        key={l.id}
                        level={l}
                        progress={progress[l.id]}
                        wide={wide}
                        onChallenge={() => setView({ k: 'challengeFlow', level: l })}
                        onBrowse={() => setView({ k: 'raUnit', unit: u })}
                      />
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

function Segmented({ tab, onChange }: { tab: 'browse' | 'challenge'; onChange: (t: 'browse' | 'challenge') => void }) {
  return (
    <View style={styles.segmented}>
      {(['browse', 'challenge'] as const).map((t) => (
        <Pressable key={t} style={[styles.segBtn, tab === t && { backgroundColor: A }]} onPress={() => onChange(t)}>
          <Text style={[styles.segLbl, tab === t && { color: colors.white }]}>{t === 'browse' ? '句子库' : '闯关'}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function LevelCard({
  level,
  progress,
  onChallenge,
  onBrowse,
  wide,
}: {
  level: ChallengeLevel;
  progress?: LevelProgress;
  onChallenge: () => void;
  onBrowse: () => void;
  wide: boolean;
}) {
  return (
    <View style={[styles.levelCard, shadow.soft, wide && styles.catCardWide]}>
      <View style={styles.levelHead}>
        <View style={styles.catIcon}>
          <Ionicons name={level.icon as keyof typeof Ionicons.glyphMap} size={20} color={A} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.catTitle} numberOfLines={1}>
            {level.title}
          </Text>
          <Text style={styles.catCount}>{level.sentences.length} 句</Text>
        </View>
        {progress?.cleared && <Ionicons name="checkmark-circle" size={18} color={colors.correct} />}
      </View>
      <View style={styles.levelActions}>
        <Pressable style={[styles.actBtn, { backgroundColor: A }]} onPress={onChallenge}>
          <Ionicons name="play" size={14} color={colors.white} />
          <Text style={styles.actText}>{progress?.cleared ? '再战' : '开始闯关'}</Text>
        </Pressable>
        <Pressable style={[styles.actBtn, styles.actBrowse]} onPress={onBrowse}>
          <Text style={[styles.actBrowseText, { color: A }]}>看句子</Text>
        </Pressable>
      </View>
      {progress?.cleared && <StarRow stars={progress.bestStars ?? 0} size={13} />}
    </View>
  );
}

function TopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={22} color={A} />
        <Text style={[styles.exit, { color: A }]}>返回</Text>
      </Pressable>
      <Text style={styles.topTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ minWidth: 60 }} />
    </View>
  );
}

function ScenarioDetail({ scenario, wide, onBack }: { scenario: Scenario; wide: boolean; onBack: () => void }) {
  return (
    <View style={styles.col}>
      <TopBar title={scenario.title} onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.container, wide && styles.containerWide]} showsVerticalScrollIndicator={false}>
        {scenario.sentences.map((s, i) => (
          <Pressable key={i} style={[styles.sCard, shadow.soft]} onPress={() => speak(s.en)}>
            <View style={styles.sTop}>
              <Text style={styles.sEn}>{s.en}</Text>
              <View style={[styles.speak, { backgroundColor: A + '15' }]}>
                <Ionicons name="volume-high" size={18} color={A} />
              </View>
            </View>
            <Text style={styles.sZh}>{s.zh}</Text>
            {!!s.tip && (
              <View style={styles.tipRow}>
                <Ionicons name="bulb-outline" size={13} color={A} />
                <Text style={styles.tip}>{s.tip}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function RAUnits({
  game,
  label,
  wide,
  onBack,
  onOpen,
}: {
  game: RAGame;
  label: string;
  wide: boolean;
  onBack: () => void;
  onOpen: (u: RAUnitSentences) => void;
}) {
  const groups = raUnitsByFaction(game);
  return (
    <View style={styles.col}>
      <TopBar title={label} onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.container, wide && styles.containerWide]} showsVerticalScrollIndicator={false}>
        {groups.map((grp) => (
          <View key={grp.faction} style={styles.groupSection}>
            <View style={styles.groupHead}>
              <View style={[styles.groupDot, { backgroundColor: grp.color }]} />
              <Text style={styles.groupName}>{grp.zh}</Text>
              <Text style={styles.groupCount}>
                {grp.units.length} 单位 · {grp.sentenceCount} 句
              </Text>
            </View>
            <View style={wide ? styles.grid : undefined}>
              {grp.units.map((u) => (
                <Pressable key={u.id} style={[styles.unitCard, shadow.soft, wide && styles.catCardWide]} onPress={() => onOpen(u)}>
                  <View style={[styles.unitBar, { backgroundColor: grp.color }]} />
                  <View style={styles.flex}>
                    <Text style={styles.unitName}>{u.unit}</Text>
                    <Text style={styles.catCount}>{u.sentences.length} 句</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function RAUnitView({ unit, wide, onBack, onChallenge }: { unit: RAUnitSentences; wide: boolean; onBack: () => void; onChallenge: () => void }) {
  const groups = groupSentences(unit.sentences);
  const faction = unitFaction(unit.game, unit.unit);
  const factionMeta = faction ? RA_FACTION_META[faction] : undefined;
  return (
    <View style={styles.col}>
      <TopBar title={`${unit.unit} · ${gameLabel(unit.game)}`} onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.container, wide && styles.containerWide]} showsVerticalScrollIndicator={false}>
        {factionMeta && (
          <View style={styles.factionChip}>
            <View style={[styles.groupDot, { backgroundColor: factionMeta.color }]} />
            <Text style={styles.factionChipText}>{factionMeta.zh}</Text>
          </View>
        )}
        <Pressable style={[styles.bigBtn, { backgroundColor: A }]} onPress={onChallenge}>
          <Ionicons name="play" size={20} color={colors.white} />
          <View style={styles.flex}>
            <Text style={[styles.bigBtnTitle, { color: colors.white }]}>开始闯关</Text>
            <Text style={styles.bigBtnDesc}>听音选义 · 中英互译，通关得星</Text>
          </View>
        </Pressable>
        {groups.map((g) => (
          <View key={g.label} style={[styles.card, shadow.soft, { gap: 8 }]}>
            <Text style={styles.groupLabel}>{g.label}</Text>
            {g.sentences.map((s, si) => (
              <Pressable key={si} style={styles.qLine} onPress={() => speak(s.en)}>
                <Ionicons name="volume-medium-outline" size={16} color={A} />
                <View style={styles.flex}>
                  <Text style={styles.qText}>{s.en}</Text>
                  <Text style={[styles.qText, { color: colors.textMuted, fontSize: 13 }]}>{s.zh}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function HocEpisodeList({ wide, onBack, onOpen, onQuotes }: { wide: boolean; onBack: () => void; onOpen: (ep: HocEpisode) => void; onQuotes: () => void }) {
  const seasons = hocSeasons();
  return (
    <View style={styles.col}>
      <TopBar title="纸牌屋" onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.container, wide && styles.containerWide]} showsVerticalScrollIndicator={false}>
        <Pressable style={[styles.catCard, shadow.soft]} onPress={onQuotes}>
          <View style={[styles.catIcon, { backgroundColor: HOC_ACCENT + '14' }]}>
            <Ionicons name="chatbubbles-outline" size={22} color={HOC_ACCENT} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.catTitle}>经典台词</Text>
            <Text style={styles.catCount}>{HOC_QUOTES.length} 条 · 中英对照 · 逐字核对原文</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
        {seasons.map((s) => {
          const eps = hocSeasonEpisodes(s);
          const lines = eps.reduce((n, e) => n + e.lines.length, 0);
          return (
            <View key={s} style={styles.groupSection}>
              <View style={styles.groupHead}>
                <View style={[styles.groupDot, { backgroundColor: HOC_ACCENT }]} />
                <Text style={styles.groupName}>第 {s} 季</Text>
                <Text style={styles.groupCount}>
                  {eps.length} 集 · {formatCount(lines)} 句
                </Text>
              </View>
              <View style={wide ? styles.grid : undefined}>
                {eps.map((ep) => (
                  <Pressable key={ep.chapter} style={[styles.unitCard, shadow.soft, wide && styles.catCardWide]} onPress={() => onOpen(ep)}>
                    <View style={[styles.unitBar, { backgroundColor: HOC_ACCENT }]} />
                    <View style={styles.flex}>
                      <Text style={styles.unitName}>第 {ep.episode} 集</Text>
                      <Text style={styles.catCount}>
                        Chapter {ep.chapter} · {ep.lines.length} 句
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function HocEpisodeView({ ep, wide, onBack }: { ep: HocEpisode; wide: boolean; onBack: () => void }) {
  return (
    <View style={styles.col}>
      <TopBar title={`第 ${ep.season} 季 · 第 ${ep.episode} 集`} onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.container, wide && styles.containerWide]} showsVerticalScrollIndicator={false}>
        <View style={styles.groupHead}>
          <View style={[styles.groupDot, { backgroundColor: HOC_ACCENT }]} />
          <Text style={styles.groupName}>Chapter {ep.chapter}</Text>
          <Text style={styles.groupCount}>{ep.lines.length} 句 · 点句子可朗读</Text>
        </View>
        <View style={[styles.card, shadow.soft]}>
          {ep.lines.map((line, i) => (
            <Pressable key={i} style={styles.scriptLine} onPress={() => speak(line)}>
              <Text style={styles.scriptIndex}>{i + 1}</Text>
              <Text style={styles.scriptText}>{line}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function HocQuotesView({ wide, onBack }: { wide: boolean; onBack: () => void }) {
  return (
    <View style={styles.col}>
      <TopBar title="纸牌屋 · 经典台词" onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.container, wide && styles.containerWide]} showsVerticalScrollIndicator={false}>
        <Text style={styles.quoteHint}>
          每条都逐字核对过全剧字幕原文（含季 / 集 / Chapter / 行号）；说话人依据媒体报道归属——字幕本身没有标注。点英文可朗读。
        </Text>
        {hocQuoteSeasons().map((s) => (
          <View key={s} style={styles.groupSection}>
            <View style={styles.groupHead}>
              <View style={[styles.groupDot, { backgroundColor: HOC_ACCENT }]} />
              <Text style={styles.groupName}>第 {s} 季</Text>
              <Text style={styles.groupCount}>{hocQuotesBySeason(s).length} 条</Text>
            </View>
            {hocQuotesBySeason(s).map((q) => (
              <QuoteCard key={q.id} q={q} />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function QuoteCard({ q }: { q: HocQuote }) {
  const [zhOpen, setZhOpen] = useState(false);
  const loc = `S${q.season}E${q.episode} · Chapter ${q.chapter}`;
  return (
    <View style={[styles.quoteCard, shadow.soft]}>
      <View style={styles.quoteHead}>
        <Text style={[styles.quoteWho, { color: HOC_ACCENT }]}>{q.who}</Text>
        <View style={styles.quoteMeta}>
          <Text style={styles.quoteLoc}>{loc}</Text>
          {q.kind === 'dialogue' && (
            <View style={[styles.quoteTag, { borderColor: HOC_ACCENT + '55' }]}>
              <Text style={[styles.quoteTagText, { color: HOC_ACCENT }]}>对话</Text>
            </View>
          )}
        </View>
      </View>
      {q.lines.map((l, i) => (
        <Pressable key={i} style={styles.quoteEn} onPress={() => speak(l)}>
          <Text style={styles.quoteEnText}>{l}</Text>
        </Pressable>
      ))}
      <Pressable style={styles.quoteZhToggle} onPress={() => setZhOpen((v) => !v)}>
        <Ionicons name={zhOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
        <Text style={styles.quoteZhToggleText}>{zhOpen ? '收起译文' : '看译文'}</Text>
      </Pressable>
      {zhOpen && (
        <View style={styles.quoteZh}>
          <Text style={styles.quoteZhText}>{q.zh}</Text>
          {q.note ? <Text style={styles.quoteNote}>{q.note}</Text> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  col: { flex: 1, width: '100%', maxWidth: 1000, alignSelf: 'center' },
  container: { padding: space.lg, paddingBottom: 40, gap: 12, maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center' },
  containerWide: { maxWidth: 1000 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  catCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.lg, padding: 16 },
  catCardWide: { width: '48.5%' },
  catIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: A + '14', alignItems: 'center', justifyContent: 'center' },
  catTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  catCount: { fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 14, marginBottom: 2 },

  // faction grouping (red alert unit banks)
  groupSection: { gap: 10, marginTop: 4 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  quoteHint: { fontSize: 12.5, color: colors.textMuted, lineHeight: 19, marginBottom: 4 },
  quoteCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, gap: 8 },
  quoteHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quoteWho: { fontSize: 13.5, fontWeight: '800' },
  quoteMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  quoteLoc: { fontSize: 11.5, color: colors.textMuted },
  quoteTag: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  quoteTagText: { fontSize: 10.5, fontWeight: '700' },
  quoteEn: { paddingVertical: 2 },
  quoteEnText: { fontSize: 15.5, lineHeight: 23, color: colors.text, fontWeight: '600' },
  quoteZhToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  quoteZhToggleText: { fontSize: 12, color: colors.textMuted },
  quoteZh: { backgroundColor: colors.bg, borderRadius: radius.md, padding: 12, gap: 8 },
  quoteZhText: { fontSize: 14, lineHeight: 22, color: colors.text },
  quoteNote: { fontSize: 12, lineHeight: 18, color: colors.textMuted },
  groupDot: { width: 8, height: 8, borderRadius: 4 },
  groupDots: { flexDirection: 'row', gap: 4, marginRight: 4 },
  groupName: { fontSize: 14, fontWeight: '800', color: colors.text },
  groupCount: { fontSize: 12, color: colors.textMuted },
  factionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 2 },
  factionChipText: { fontSize: 12, fontWeight: '700', color: colors.textSecondary },

  // segmented control
  segmented: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: radius.pill, padding: 3, gap: 3 },
  segBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill },
  segLbl: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },

  // challenge progress banner
  progressBanner: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, paddingVertical: 14, paddingHorizontal: 10 },
  statItem: { flex: 1, alignItems: 'center' },
  statDiv: { width: 1, height: 28, backgroundColor: colors.border },
  statNum: { fontSize: 22, fontWeight: '800' },
  statLbl: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  // level card
  levelCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, gap: 10 },
  levelHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelActions: { flexDirection: 'row', gap: 8 },
  actBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: radius.md, paddingVertical: 9, flex: 1 },
  actText: { color: colors.white, fontWeight: '700', fontSize: 13.5 },
  actBrowse: { backgroundColor: A + '14', flex: 0 },
  actBrowseText: { fontWeight: '700', fontSize: 13.5 },
  stars: { flexDirection: 'row', gap: 2 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: 8, paddingBottom: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', minWidth: 60 },
  exit: { fontSize: 16, fontWeight: '600' },
  topTitle: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center' },

  sCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, gap: 8 },
  sTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  sEn: { flex: 1, fontSize: 17, fontWeight: '600', color: colors.text, lineHeight: 24 },
  speak: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  sZh: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  tip: { flex: 1, fontSize: 12.5, color: colors.textMuted, lineHeight: 18 },

  unitCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: radius.lg, paddingVertical: 12, paddingHorizontal: 14, overflow: 'hidden' },
  unitBar: { width: 3, height: 24, borderRadius: 2 },
  unitName: { fontSize: 16, fontWeight: '700', color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16 },
  groupLabel: { fontSize: 13, fontWeight: '800', color: A, marginBottom: 2 },
  qLine: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  qText: { flex: 1, fontSize: 15.5, color: colors.text, lineHeight: 22, fontStyle: 'italic' },

  bigBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.lg, padding: 16 },
  bigBtnTitle: { fontSize: 16, fontWeight: '800' },
  bigBtnDesc: { fontSize: 12.5, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  // House of Cards 剧集台词（每行一句，点按朗读）
  scriptLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  scriptIndex: { fontSize: 11, color: colors.textMuted, minWidth: 20, textAlign: 'right', paddingTop: 3 },
  scriptText: { flex: 1, fontSize: 14.5, color: colors.text, lineHeight: 21 },
});
