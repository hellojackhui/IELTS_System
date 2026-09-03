import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors, radius, shadow, space } from '../theme';

export function ScreenHeader({
  title,
  subtitle,
  accent = colors.accent,
  right,
}: {
  title: string;
  subtitle?: string;
  accent?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <View style={styles.headerTitleRow}>
          <View style={[styles.accentBar, { backgroundColor: accent }]} />
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        {!!subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

export function ActivityCard({
  icon,
  title,
  desc,
  accent,
  onPress,
  badge,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  accent: string;
  onPress?: () => void;
  badge?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.card, shadow.card, pressed && onPress && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={[styles.iconChip, { backgroundColor: accent + '16' }]}>
        <Ionicons name={icon} size={24} color={accent} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle}>{title}</Text>
          {!!badge && (
            <View style={[styles.badge, { backgroundColor: accent + '18' }]}>
              <Text style={[styles.badgeText, { color: accent }]}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardDesc}>{desc}</Text>
      </View>
      {onPress && <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />}
    </Pressable>
  );
}

export function StatRow({ items }: { items: { label: string; value: number; accent?: string }[] }) {
  return (
    <View style={styles.statRow}>
      {items.map((s) => (
        <View key={s.label} style={[styles.stat, shadow.soft]}>
          <Text style={[styles.statValue, s.accent ? { color: s.accent } : null]}>{s.value}</Text>
          <Text style={styles.statLabel}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.plainCard, shadow.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: space.sm, paddingBottom: space.lg },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  accentBar: { width: 4, height: 26, borderRadius: 2 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginLeft: 14 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  iconChip: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  cardDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 3, lineHeight: 18 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  badgeText: { fontSize: 11, fontWeight: '700' },
  statRow: { flexDirection: 'row', gap: 10 },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  plainCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 18 },
});
