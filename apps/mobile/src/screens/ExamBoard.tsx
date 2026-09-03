import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActivityCard, Card, ScreenHeader } from '../components/ui';
import { boards, colors, CONTENT_MAX_WIDTH, radius, space } from '../theme';

const A = boards.exam.accent;
const OFFICIAL_SAMPLES = 'https://takeielts.britishcouncil.org/take-ielts/prepare/free-ielts-practice-tests';

export function ExamBoard({ onStartWriting }: { onStartWriting: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="模拟考试" subtitle="AI 原创题 · 按官方评分标准" accent={A} />

      <Text style={styles.sectionLabel}>可用</Text>
      <ActivityCard
        icon="create-outline"
        title="写作 Task 2"
        desc="限时作文 → AI 按四项评分标准打 band + 改进建议"
        accent={A}
        onPress={onStartWriting}
      />

      <Text style={styles.sectionLabel}>即将上线</Text>
      <ActivityCard icon="bar-chart-outline" title="写作 Task 1" desc="图表描述作文批改" accent={A} badge="即将上线" />
      <ActivityCard icon="reader-outline" title="阅读" desc="原创长文 + 多题型限时练" accent={A} badge="即将上线" />
      <ActivityCard icon="headset-outline" title="听力" desc="音频听力 4 部分" accent={A} badge="即将上线" />
      <ActivityCard icon="mic-outline" title="口语" desc="AI 考官 Part 1/2/3" accent={A} badge="即将上线" />

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
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 2,
  },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  linkDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 3, lineHeight: 18 },
  note: { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginTop: 6, paddingHorizontal: 4 },
});
