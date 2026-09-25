import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActivityCard, Card, CardGrid, ScreenHeader } from '../components/ui';
import { GENRES } from '../reading';
import { boards, colors, CONTENT_MAX_WIDTH, radius, shadow, space, useWide, WIDE_CONTENT_MAX } from '../theme';

const A = boards.exam.accent;
const OFFICIAL_SAMPLES = 'https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-practice-tests';

export function ExamBoard({
  onStartWriting,
  onStartReading,
}: {
  onStartWriting: () => void;
  onStartReading: (genre: string) => void;
}) {
  const wide = useWide();
  return (
    <ScrollView contentContainerStyle={[styles.container, wide && styles.containerWide]} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="模拟考试" subtitle="AI 原创题 · 按官方评分标准" accent={A} />

      <Text style={styles.sectionLabel}>可用</Text>
      <CardGrid wide={wide}>
      <ActivityCard
        icon="create-outline"
        title="写作 Task 2"
        desc="限时作文 → AI 按四项评分标准打 band + 改进建议"
        accent={A}
        onPress={onStartWriting}
      />

      <Card>
        <View style={styles.readingHead}>
          <View style={[styles.chip, { backgroundColor: A + '16' }]}>
            <Ionicons name="reader-outline" size={22} color={A} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.readingTitle}>阅读</Text>
            <Text style={styles.readingDesc}>选一个题材，AI 现出原创长文 + 题目；读到生词点一下即可收藏</Text>
          </View>
        </View>
        <View style={styles.genres}>
          {GENRES.map((g) => (
            <Pressable
              key={g.key}
              style={[styles.genreChip, { borderColor: A + '55' }]}
              onPress={() => onStartReading(g.key)}
            >
              <Ionicons name={g.icon as keyof typeof Ionicons.glyphMap} size={14} color={A} />
              <Text style={[styles.genreText, { color: A }]}>{g.label}</Text>
            </Pressable>
          ))}
        </View>
      </Card>
      </CardGrid>

      <Text style={styles.sectionLabel}>即将上线</Text>
      <CardGrid wide={wide}>
        <ActivityCard icon="bar-chart-outline" title="写作 Task 1" desc="图表描述作文批改" accent={A} badge="即将上线" />
        <ActivityCard icon="headset-outline" title="听力" desc="音频听力 4 部分" accent={A} badge="即将上线" />
        <ActivityCard icon="mic-outline" title="口语" desc="AI 考官 Part 1/2/3" accent={A} badge="即将上线" />
      </CardGrid>

      <Text style={styles.sectionLabel}>练真题手感</Text>
      <Pressable onPress={() => Linking.openURL(OFFICIAL_SAMPLES)}>
        <Card>
          <View style={styles.linkRow}>
            <Ionicons name="open-outline" size={20} color={A} />
            <View style={{ flex: 1 }}>
              <Text style={styles.linkTitle}>官方免费样题</Text>
              <Text style={styles.linkDesc}>British Council / IELTS.org 官方提供的免费练习题，点击前往</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </Card>
      </Pressable>
      <Text style={styles.note}>
        本应用的模考题目均为 AI 原创、贴近雅思难度，不收录任何受版权保护的真题。
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, paddingBottom: 32, gap: 12, maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center' },
  containerWide: { maxWidth: WIDE_CONTENT_MAX },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 2,
  },
  readingHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  chip: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  readingTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  readingDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 3, lineHeight: 18 },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  genreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  genreText: { fontSize: 13, fontWeight: '600' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  linkDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 3, lineHeight: 18 },
  note: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginTop: 6, paddingHorizontal: 4 },
});
