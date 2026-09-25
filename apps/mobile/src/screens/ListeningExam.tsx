import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { checkListening, fetchListening, type Listening, type ListeningSection } from '../listening';
import { CardGrid } from '../components/ui';
import { boards, colors, CONTENT_MAX_WIDTH, radius, shadow, space, useWide, WIDE_CONTENT_MAX } from '../theme';

const A = boards.listening.accent;

export function ListeningExam({ onExit, section = 1 }: { onExit: () => void; section?: ListeningSection }) {
  const [data, setData] = useState<Listening | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const cancelRef = useRef(false);
  const heading = section === 4 ? '听力理解 · 学术讲座' : '听力理解 · 场景对话';

  function load() {
    setData(null);
    setError(null);
    setAnswers({});
    setRevealed(false);
    fetchListening(section)
      .then(setData)
      .catch((e) => setError(String((e as Error).message)));
  }
  useEffect(load, []);
  const wide = useWide();

  useEffect(() => {
    return () => {
      cancelRef.current = true;
      Speech.stop();
    };
  }, []);

  function stop() {
    cancelRef.current = true;
    Speech.stop();
    setPlaying(false);
  }

  function play(rate = 0.92) {
    if (!data) return;
    Speech.stop();
    cancelRef.current = false;
    const speakers = [...new Set(data.lines.map((l) => l.speaker))];
    setPlaying(true);
    let i = 0;
    const next = () => {
      if (cancelRef.current || i >= data.lines.length) {
        setPlaying(false);
        return;
      }
      const line = data.lines[i++];
      const pitch = speakers.indexOf(line.speaker) === 0 ? 1.05 : 0.8;
      Speech.speak(line.text, {
        language: 'en-US',
        rate,
        pitch,
        onDone: next,
        onError: () => setPlaying(false),
      });
    };
    next();
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="cloud-offline-outline" size={44} color={colors.textMuted} />
        <Text style={[styles.muted, { marginTop: 12, textAlign: 'center', paddingHorizontal: 30 }]}>{error}</Text>
        <View style={styles.errRow}>
          <Pressable style={[styles.pill, { borderColor: A }]} onPress={load}>
            <Text style={[styles.pillText, { color: A }]}>重试</Text>
          </Pressable>
          <Pressable style={[styles.pill, { borderColor: colors.border }]} onPress={onExit}>
            <Text style={[styles.pillText, { color: colors.textMuted }]}>返回</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={A} size="large" />
        <Text style={[styles.muted, { marginTop: 14 }]}>AI 正在生成听力材料…</Text>
      </View>
    );
  }

  const correct = data.questions.filter((q, i) => checkListening(answers[i] ?? '', q.answer)).length;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={40}>
      <View style={[styles.col, wide && styles.colWide]}>
        <View style={styles.topBar}>
          <Pressable onPress={onExit} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={A} />
            <Text style={[styles.exit, { color: A }]}>返回</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {heading}
          </Text>
          <Pressable onPress={load} hitSlop={12} style={{ minWidth: 60, alignItems: 'flex-end' }}>
            <Ionicons name="refresh" size={20} color={A} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.scenario}>{data.scenario}</Text>

          {/* audio player */}
          <View style={[styles.card, shadow.card, { alignItems: 'center', gap: 14 }]}>
            <Pressable style={[styles.playBtn, { backgroundColor: A }]} onPress={() => (playing ? stop() : play())}>
              <Ionicons name={playing ? 'stop' : 'play'} size={34} color={colors.white} />
            </Pressable>
            <View style={styles.playRow}>
              <Pressable style={styles.smallBtn} onPress={() => play(0.6)} hitSlop={6}>
                <Ionicons name="play-back" size={14} color={colors.textMuted} />
                <Text style={styles.smallText}>慢速</Text>
              </Pressable>
              <Text style={styles.playHint}>{playing ? '播放中…' : revealed ? '已听完' : '边听边填下面的空'}</Text>
            </View>
          </View>

          {/* questions */}
          <Text style={styles.sectionLabel}>笔记补全（每空 1–3 词）</Text>
          <CardGrid wide={wide}>
          {data.questions.map((q, i) => {
            const ok = revealed && checkListening(answers[i] ?? '', q.answer);
            const bad = revealed && !ok;
            const parts = q.q.split('_____');
            return (
              <View key={i} style={[styles.qCard, shadow.soft]}>
                <Text style={styles.qText}>
                  <Text style={styles.qNum}>{i + 1}. </Text>
                  {parts[0]}
                  <Text style={styles.qBlankMark}>{revealed ? `【${q.answer}】` : ' ____ '}</Text>
                  {parts[1] ?? ''}
                </Text>
                {!revealed ? (
                  <TextInput
                    style={styles.input}
                    placeholder="填入听到的答案…"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={answers[i] ?? ''}
                    onChangeText={(t) => setAnswers((a) => ({ ...a, [i]: t }))}
                  />
                ) : (
                  <View style={[styles.resultRow, ok ? styles.okRow : styles.badRow]}>
                    <Ionicons name={ok ? 'checkmark-circle' : 'close-circle'} size={16} color={ok ? colors.correct : colors.wrong} />
                    <Text style={[styles.resultText, { color: ok ? colors.correct : colors.wrong }]}>
                      {ok ? '正确' : `你的：${answers[i]?.trim() || '（空）'}`}
                    </Text>
                  </View>
                )}
                {revealed && !!q.explain && <Text style={styles.explain}>{q.explain}</Text>}
              </View>
            );
          })}
          </CardGrid>

          {!revealed ? (
            <Pressable style={[styles.submit, { backgroundColor: A }]} onPress={() => { stop(); setRevealed(true); }}>
              <Text style={styles.submitText}>提交答案</Text>
            </Pressable>
          ) : (
            <>
              <View style={[styles.card, shadow.card, { alignItems: 'center' }]}>
                <Text style={[styles.score, { color: A }]}>
                  {correct} / {data.questions.length}
                </Text>
                <Text style={styles.muted}>答对 {correct} 题</Text>
              </View>

              {/* transcript */}
              <Text style={styles.sectionLabel}>{data.title || '原文'}</Text>
              <View style={[styles.card, shadow.card, { gap: 10 }]}>
                {data.lines.map((l, i) => (
                  <View key={i} style={styles.line}>
                    <Text style={styles.speaker}>{l.speaker}</Text>
                    <Text style={styles.lineText}>{l.text}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.footRow}>
                <Pressable style={[styles.pill, { borderColor: A }]} onPress={() => play()}>
                  <Ionicons name="volume-high" size={16} color={A} />
                  <Text style={[styles.pillText, { color: A }]}>再听一遍</Text>
                </Pressable>
                <Pressable style={[styles.submit, { backgroundColor: A, flex: 1 }]} onPress={load}>
                  <Text style={styles.submitText}>换一篇</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  col: { flex: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' },
  colWide: { maxWidth: WIDE_CONTENT_MAX },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.textMuted, fontSize: 14 },
  errRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: 8, paddingBottom: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', minWidth: 60 },
  exit: { fontSize: 16, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center' },
  container: { padding: space.lg, paddingBottom: 48, gap: 12 },
  scenario: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 20 },
  playBtn: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  playRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  smallBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: colors.bg },
  smallText: { color: colors.textMuted, fontSize: 13 },
  playHint: { color: colors.textMuted, fontSize: 13 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 6 },
  qCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, gap: 10 },
  qText: { fontSize: 15.5, color: colors.text, lineHeight: 24 },
  qNum: { fontWeight: '800', color: A },
  qBlankMark: { fontWeight: '700', color: A },
  input: { borderWidth: 2, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colors.text, backgroundColor: colors.bg },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.sm, paddingVertical: 6, paddingHorizontal: 8 },
  okRow: { backgroundColor: colors.correctBg },
  badRow: { backgroundColor: colors.wrongBg },
  resultText: { fontSize: 13, fontWeight: '600' },
  explain: { fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
  submit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, paddingVertical: 14, marginTop: 6 },
  submitText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  score: { fontSize: 40, fontWeight: '800' },
  line: { gap: 2 },
  speaker: { fontSize: 12, fontWeight: '700', color: A },
  lineText: { fontSize: 15, color: colors.text, lineHeight: 22 },
  footRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 11 },
  pillText: { fontSize: 14, fontWeight: '700' },
});
