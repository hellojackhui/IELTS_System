import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import type { TabItem, TabKey } from './TabBar';

/** Desktop / wide-screen navigation: a vertical left rail instead of bottom tabs. */
export function SideBar({
  items,
  active,
  onChange,
}: {
  items: TabItem[];
  active: TabKey;
  onChange: (key: TabKey) => void;
}) {
  return (
    <View style={styles.rail}>
      <View style={styles.brand}>
        <View style={styles.mark}>
          <Text style={styles.markText}>词</Text>
        </View>
        <Text style={styles.brandName}>IELTS 词汇</Text>
      </View>

      <View style={styles.nav}>
        {items.map((item) => {
          const isActive = item.key === active;
          const color = isActive ? item.accent : colors.textSecondary;
          return (
            <Pressable
              key={item.key}
              onPress={() => onChange(item.key)}
              style={[styles.item, isActive && { backgroundColor: item.accent + '14' }]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Ionicons name={item.icon} size={20} color={color} />
              <Text style={[styles.label, { color }, isActive && styles.labelActive]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.footer}>3,611 词 · 间隔重复</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: 232,
    backgroundColor: colors.card,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 20,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 8, marginBottom: 28 },
  mark: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { color: colors.white, fontSize: 22, fontWeight: '700' },
  brandName: { fontSize: 17, fontWeight: '800', color: colors.text },
  nav: { gap: 4, flex: 1 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: radius.md,
  },
  label: { fontSize: 15, fontWeight: '600' },
  labelActive: { fontWeight: '700' },
  footer: { fontSize: 11, color: colors.textMuted, paddingHorizontal: 12 },
});
