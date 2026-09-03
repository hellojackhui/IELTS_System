import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { api } from '../api';
import { useAuth } from '../auth';
import { syncNow } from '../store';
import { colors, radius, shadow } from '../theme';

export function AccountPanel({ onSynced }: { onSynced?: () => void }) {
  const { user, loading, logout } = useAuth();
  const [syncing, setSyncing] = useState(false);

  async function doSync() {
    setSyncing(true);
    try {
      const r = await syncNow(api);
      onSynced?.();
      Alert.alert('同步完成', `上传 ${r.pushed} 条，下载 ${r.pulled} 条`);
    } catch (e) {
      Alert.alert('同步失败', String((e as Error).message));
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 20 }} color={colors.accent} />;
  }

  if (user) {
    return (
      <View style={[styles.account, shadow.soft]}>
        <View style={styles.accountLeft}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={16} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.accountEmail} numberOfLines={1}>
              {user.email}
            </Text>
            <Text style={styles.accountHint}>进度已跨设备同步</Text>
          </View>
        </View>
        <View style={styles.accountBtns}>
          <Pressable style={[styles.iconBtn, { backgroundColor: colors.accentFaint }]} onPress={doSync} disabled={syncing}>
            {syncing ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name="sync" size={18} color={colors.accent} />
            )}
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>
    );
  }

  return <AuthForm />;
}

function AuthForm() {
  const { register, login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      if (mode === 'register') await register(email, password);
      else await login(email, password);
    } catch (e) {
      Alert.alert(mode === 'register' ? '注册失败' : '登录失败', String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.authCard, shadow.card]}>
      <Text style={styles.authTitle}>{mode === 'login' ? '登录以同步进度' : '创建账号'}</Text>
      <Text style={styles.authHint}>不登录也能用，进度存在本机</Text>
      <TextInput
        style={styles.input}
        placeholder="邮箱"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="密码（至少 6 位）"
        placeholderTextColor={colors.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Pressable style={styles.primaryBtn} onPress={submit} disabled={busy}>
        <Text style={styles.primaryBtnText}>
          {busy ? '请稍候…' : mode === 'login' ? '登录' : '注册'}
        </Text>
      </Pressable>
      <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')} hitSlop={8}>
        <Text style={styles.switchText}>
          {mode === 'login' ? '还没有账号？去注册' : '已有账号？去登录'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    gap: 10,
  },
  accountLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accentFaint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountEmail: { fontSize: 14, fontWeight: '600', color: colors.text },
  accountHint: { fontSize: 11, color: colors.textMuted, marginTop: 1 },
  accountBtns: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  authCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 18, gap: 10 },
  authTitle: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
  authHint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: -4, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  primaryBtn: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 13, alignItems: 'center' },
  primaryBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  switchText: { color: colors.accent, textAlign: 'center', fontSize: 13, marginTop: 2 },
});
