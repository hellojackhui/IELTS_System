import { Ionicons } from '@expo/vector-icons';
import { WORD_COUNT } from '@ielts/core';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AccountPanel } from '../components/AccountPanel';
import { Card, ScreenHeader, StatRow } from '../components/ui';
import { API_URL } from '../api';
import { computeBadges, getRewards, type Rewards } from '../rewards';
import { getStats, type Stats } from '../store';
import { boards, colors, space } from '../theme';

const A = boards.profile.accent;
const EMPTY_REWARDS: Rewards = { lastActive: '', streak: 0, best: 0, points: 0, days: 0 };

export function ProfileBoard({ reloadToken }: { reloadToken: number }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rewards, setRewards] = useState<Rewards | null>(null);
  const refresh = useCallback(() => {
    getStats().then(setStats);
    getRewards().then(setRewards);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, reloadToken]);

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <ScreenHeader title="我的" subtitle="账号与学习进度" accent={A} />

      <Text style={styles.sectionLabel}>账号</Text>
      <AccountPanel onSynced={refresh} />

      <Text style={styles.sectionLabel}>学习进度</Text>
      <StatRow
        items={[
          { label: '已学', value: stats?.learned ?? 0 },
          { label: '待复习', value: stats?.due ?? 0, accent: boards.memory.accent },
          { label: '已掌握', value: stats?.mastered ?? 0 },
        ]}
      />

      <Text style={styles.sectionLabel}>成就</Text>
      <Card>
        <View style={styles.badgeGrid}>
          {computeBadges(rewards ?? EMPTY_REWARDS, stats?.learned ?? 0, stats?.mastered ?? 0).map((b) => (
            <View key={b.id} style={styles.badge}>
              <View style={[styles.badgeIcon, { backgroundColor: b.unlocked ? A + '18' : colors.bg }]}>
                <Ionicons name={b.icon as keyof typeof Ionicons.glyphMap} size={22} color={b.unlocked ? A : colors.textMuted} />
              </View>
              <Text style={[styles.badgeLabel, !b.unlocked && { color: colors.textMuted }]} numberOfLines={1}>
                {b.label}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      <Text style={styles.sectionLabel}>关于</Text>
      <Card>
        <Row icon="book-outline" label="词库" value={`${WORD_COUNT.toLocaleString()} 词`} />
        <Divider />
        <Row icon="server-outline" label="同步服务" value={API_URL.replace(/^https?:\/\//, '')} />
        <Divider />
        <Row icon="pricetag-outline" label="版本" value="0.1.0" />
      </Card>
    </ScrollView>
  );
}

function Row({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={18} color={colors.textMuted} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { padding: space.lg, paddingBottom: 32, gap: 12, maxWidth: 720, width: '100%', alignSelf: 'center' },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 2,
  },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  badge: { width: '25%', alignItems: 'center', gap: 6, paddingVertical: 10 },
  badgeIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  badgeLabel: { fontSize: 11, color: colors.text, textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  rowLabel: { fontSize: 14, color: colors.text, flex: 1 },
  rowValue: { fontSize: 14, color: colors.textMuted, flexShrink: 1, maxWidth: '60%' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
