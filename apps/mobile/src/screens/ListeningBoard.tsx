import type { QuizMode } from '@ielts/core';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActivityCard, Card, ScreenHeader } from '../components/ui';
import { boards, colors, CONTENT_MAX_WIDTH, space } from '../theme';

const A = boards.listening.accent;

export function ListeningBoard({ onStart }: { onStart: (mode: QuizMode) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="听力" subtitle="用耳朵记单词，练听音辨词" accent={A} />

      <Text style={styles.sectionLabel}>练习方式</Text>
      <ActivityCard
        icon="headset-outline"
        title="单词听写"
        desc="听英文发音，拼写出听到的单词"
        accent={A}
        onPress={() => onStart('dictation')}
      />

      <ActivityCard icon="mic-outline" title="句子听写" desc="听整句英文并复现（开发中）" accent={A} badge="即将上线" />

      <Card style={{ marginTop: 12 }}>
        <Text style={styles.tipTitle}>💡 小贴士</Text>
        <Text style={styles.tipText}>
          听写时先不看拼写，尽量凭发音写出单词；写错的词会自动进入复习队列，隔天再考你。
        </Text>
      </Card>
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
  tipTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 6 },
  tipText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
});
