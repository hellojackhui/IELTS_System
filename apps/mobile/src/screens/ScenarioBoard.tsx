import { Ionicons } from '@expo/vector-icons';
import { REDALERT_UNITS, SCENARIOS, type RAUnit, type Scenario } from '@ielts/core';
import * as Speech from 'expo-speech';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ScreenHeader } from '../components/ui';
import { boards, colors, CONTENT_MAX_WIDTH, radius, shadow, space, WIDE_BREAKPOINT } from '../theme';

const A = boards.scenario.accent;

function speak(text: string, rate = 0.95) {
  Speech.stop();
  Speech.speak(text, { language: 'en-US', rate });
}

type SBView =
  | { k: 'home' }
  | { k: 'scenario'; s: Scenario }
  | { k: 'ra'; game: string; label: string }
  | { k: 'raUnit'; unit: RAUnit };

export function ScenarioBoard() {
  const [view, setView] = useState<SBView>({ k: 'home' });
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT;

  if (view.k === 'scenario') return <ScenarioDetail scenario={view.s} wide={wide} onBack={() => setView({ k: 'home' })} />;
  if (view.k === 'ra')
    return <RAUnits game={view.game} label={view.label} wide={wide} onBack={() => setView({ k: 'home' })} onOpen={(unit) => setView({ k: 'raUnit', unit })} />;
  if (view.k === 'raUnit')
    return (
      <RAUnitView
        unit={view.unit}
        wide={wide}
        onBack={() => setView({ k: 'ra', game: view.unit.game, label: view.unit.game === 'RA2' ? '红警 2' : '红警 3' })}
      />
    );

  return (
    <ScrollView contentContainerStyle={[styles.container, wide && styles.containerWide]} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="场景" subtitle="吃穿住行 · 出门就能用的口语" accent={A} />
      <View style={wide ? styles.grid : undefined}>
        {SCENARIOS.map((s) => (
          <Pressable key={s.id} style={[styles.catCard, shadow.soft, wide && styles.catCardWide]} onPress={() => setView({ k: 'scenario', s })}>
            <View style={styles.catIcon}>
              <Ionicons name={s.icon as keyof typeof Ionicons.glyphMap} size={22} color={A} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.catTitle}>{s.title}</Text>
              <Text style={styles.catCount}>{s.sentences.length} 句</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionLabel}>游戏台词 · 彩蛋</Text>
      <View style={wide ? styles.grid : undefined}>
        {[
          { game: 'RA2', label: '红警 2', desc: '经典单位语音台词' },
          { game: 'RA3', label: '红警 3', desc: '单位语音台词' },
        ].map((g) => {
          const n = REDALERT_UNITS.filter((u) => u.game === g.game).length;
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
                  {n} 个单位 · {g.desc}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
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
  game: string;
  label: string;
  wide: boolean;
  onBack: () => void;
  onOpen: (u: RAUnit) => void;
}) {
  const units = REDALERT_UNITS.filter((u) => u.game === game);
  return (
    <View style={styles.col}>
      <TopBar title={label} onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.container, wide && styles.containerWide]} showsVerticalScrollIndicator={false}>
        <View style={wide ? styles.grid : undefined}>
          {units.map((u) => (
            <Pressable key={u.name} style={[styles.unitCard, shadow.soft, wide && styles.catCardWide]} onPress={() => onOpen(u)}>
              <Text style={styles.unitName}>{u.name}</Text>
              <Text style={styles.catCount}>{u.groups.reduce((n, g) => n + g.lines.length, 0)} 句</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function RAUnitView({ unit, wide, onBack }: { unit: RAUnit; wide: boolean; onBack: () => void }) {
  return (
    <View style={styles.col}>
      <TopBar title={`${unit.name} · ${unit.game}`} onBack={onBack} />
      <ScrollView contentContainerStyle={[styles.container, wide && styles.containerWide]} showsVerticalScrollIndicator={false}>
        {unit.groups.map((g, gi) => (
          <View key={gi} style={[styles.card, shadow.soft, { gap: 8 }]}>
            <Text style={styles.groupLabel}>{g.label}</Text>
            {g.lines.map((line, li) => (
              <Pressable key={li} style={styles.qLine} onPress={() => speak(line)}>
                <Ionicons name="volume-medium-outline" size={16} color={A} />
                <Text style={styles.qText}>{line}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
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

  unitCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, gap: 2 },
  unitName: { fontSize: 16, fontWeight: '700', color: colors.text },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16 },
  groupLabel: { fontSize: 13, fontWeight: '800', color: A, marginBottom: 2 },
  qLine: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  qText: { flex: 1, fontSize: 15.5, color: colors.text, lineHeight: 22, fontStyle: 'italic' },
});
