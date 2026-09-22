import { Ionicons } from '@expo/vector-icons';
import { SCENARIOS, type Scenario } from '@ielts/core';
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

export function ScenarioBoard() {
  const [sel, setSel] = useState<Scenario | null>(null);
  const wide = useWindowDimensions().width >= WIDE_BREAKPOINT;

  if (sel) return <Detail scenario={sel} wide={wide} onBack={() => setSel(null)} />;

  return (
    <ScrollView contentContainerStyle={[styles.container, wide && styles.containerWide]} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="场景" subtitle="吃穿住行 · 出门就能用的口语" accent={A} />
      <View style={wide ? styles.grid : undefined}>
        {SCENARIOS.map((s) => (
          <Pressable key={s.id} style={[styles.catCard, shadow.soft, wide && styles.catCardWide]} onPress={() => setSel(s)}>
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
    </ScrollView>
  );
}

function Detail({ scenario, wide, onBack }: { scenario: Scenario; wide: boolean; onBack: () => void }) {
  return (
    <View style={styles.col}>
      <View style={styles.topBar}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={A} />
          <Text style={[styles.exit, { color: A }]}>返回</Text>
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          {scenario.title}
        </Text>
        <View style={{ minWidth: 60 }} />
      </View>
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
});
