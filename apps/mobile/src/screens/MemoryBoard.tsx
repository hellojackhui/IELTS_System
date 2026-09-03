import { Ionicons } from '@expo/vector-icons';
import { WORD_COUNT, type QuizMode } from '@ielts/core';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActivityCard, ScreenHeader, StatRow } from '../components/ui';
import { getRewards, type Rewards } from '../rewards';
import { getStats, type Stats } from '../store';
import { boards, colors, CONTENT_MAX_WIDTH, radius, shadow, space } from '../theme';

const A = boards.memory.accent;

export function MemoryBoard({
  onStart,
  onReview,
  reloadToken,
}: {
  onStart: (mode: QuizMode) => void;
  onReview: () => void;
  reloadToken: number;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rewards, setRewards] = useState<Rewards | null>(null);
  const refresh = useCallback(() => {
    getStats().then(setStats);
    getRewards().then(setRewards);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, reloadToken]);

  const due = stats?.due ?? 0;

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="单词记忆" subtitle={`${WORD_COUNT.toLocaleString()} 词 · 间隔重复`} accent={A} />

      <View style={[styles.rewardBar, shadow.soft]}>
        <View style={styles.rewardItem}>
          <Ionicons name="flame" size={18} color="#E0803A" />
          <Text style={styles.rewardValue}>{rewards?.streak ?? 0}</Text>
          <Text style={styles.rewardLabel}>天连续</Text>
        </View>
        <View style={styles.rewardDivider} />
        <View style={styles.rewardItem}>
          <Ionicons name="star" size={17} color="#E0A93A" />
          <Text style={styles.rewardValue}>{rewards?.points ?? 0}</Text>
          <Text style={styles.rewardLabel}>积分</Text>
        </View>
      </View>

      <StatRow
        items={[
          { label: '已学', value: stats?.learned ?? 0 },
          { label: '待复习', value: due, accent: A },
          { label: '已掌握', value: stats?.mastered ?? 0 },
        ]}
      />

      <ActivityCard
        icon="time-outline"
        title="今日复习"
        desc={due > 0 ? `${due} 个到期的词，趁记忆还在` : '暂无到期，去学点新词吧'}
        accent={A}
        onPress={onReview}
        badge={due > 0 ? String(due) : undefined}
      />

      <Text style={styles.sectionLabel}>练习方式</Text>
      <ActivityCard
        icon="create-outline"
        title="单词拼写"
        desc="看中文释义，拼写出英文单词"
        accent={A}
        onPress={() => onStart('spelling')}
      />
      <ActivityCard
        icon="options-outline"
        title="语境选词"
        desc="看英文例句，选出空格处正确的词"
        accent={A}
        onPress={() => onStart('choice')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, paddingBottom: 32, gap: 12, maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center' },
  rewardBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 12,
    gap: 20,
  },
  rewardItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rewardValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  rewardLabel: { fontSize: 13, color: colors.textMuted },
  rewardDivider: { width: StyleSheet.hairlineWidth, height: 22, backgroundColor: colors.border },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 2,
  },
});
