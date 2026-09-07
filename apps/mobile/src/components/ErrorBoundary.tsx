import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';

interface State {
  error: Error | null;
}

/** Catches render errors anywhere in the tree and shows a recoverable fallback
 *  instead of a blank screen. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('App error:', error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={styles.wrap}>
          <Ionicons name="sad-outline" size={48} color={colors.textMuted} />
          <Text style={styles.title}>出了点问题</Text>
          <Text style={styles.msg} numberOfLines={4}>
            {this.state.error.message || '未知错误'}
          </Text>
          <Pressable style={styles.btn} onPress={this.reset}>
            <Text style={styles.btnText}>重试</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12, backgroundColor: colors.bg },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  msg: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 21 },
  btn: { marginTop: 8, backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 32 },
  btnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});
