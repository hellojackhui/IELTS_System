import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';

export type TabKey = 'memory' | 'ai' | 'listening' | 'profile';

export interface TabItem {
  key: TabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
}

export function TabBar({
  items,
  active,
  onChange,
}: {
  items: TabItem[];
  active: TabKey;
  onChange: (key: TabKey) => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {items.map((item) => {
        const isActive = item.key === active;
        const color = isActive ? item.accent : colors.textMuted;
        return (
          <Pressable
            key={item.key}
            style={styles.tab}
            onPress={() => onChange(item.key)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={item.label}
          >
            <View
              style={[
                styles.iconWrap,
                isActive && { backgroundColor: item.accent + '18' },
              ]}
            >
              <Ionicons name={item.icon} size={22} color={color} />
            </View>
            <Text style={[styles.label, { color }, isActive && styles.labelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 8,
    ...Platform.select({
      web: { boxShadow: '0 -1px 12px rgba(26,29,46,0.04)' } as any,
      default: {},
    }),
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  iconWrap: {
    width: 52,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 11, fontWeight: '500' },
  labelActive: { fontWeight: '700' },
});
