import { Ionicons } from '@expo/vector-icons';
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
import {
  gradeWriting,
  randomPrompt,
  wordCount,
  type WritingPrompt,
  type WritingScore,
} from '../exam';
import { boards, colors, CONTENT_MAX_WIDTH, radius, shadow, space } from '../theme';

const A = boards.exam.accent;

function fmt(sec: number): string {
  const m = Math.floor(Math.max(0, sec) / 60);
  const s = Math.max(0, sec) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function WritingExam({ onExit }: { onExit: () => void }) {
  const [prompt, setPrompt] = useState<WritingPrompt>(() => randomPrompt());
  const [essay, setEssay] = useState('');
  const [phase, setPhase] = useState<'writing' | 'grading' | 'result'>('writing');
  const [score, setScore] = useState<WritingScore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState(prompt.minutes * 60);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (phase !== 'writing') return;
    timer.current = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [phase]);

  const words = wordCount(essay);

  function restart() {
    const next = randomPrompt(prompt.id);
    setPrompt(next);
    setEssay('');
    setScore(null);
    setError(null);
    setLeft(next.minutes * 60);
    setPhase('writing');
  }

  async function submit() {
    if (words < 20) {
      setError('至少写够 20 个单词再提交');
      return;
    }
    setError(null);
    setPhase('grading');
    try {
      const result = await gradeWriting(prompt.task, prompt.text, essay);
      setScore(result);
      setPhase('result');
    } catch (e) {
      setError(String((e as Error).message));
      setPhase('writing');
    }
  }

  if (phase === 'result' && score) {
    return <Report prompt={prompt} score={score} onRetry={restart} onExit={onExit} />;
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={40}>
      <View style={styles.topBar}>
        <Pressable onPress={onExit} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={A} />
          <Text style={[styles.exit, { color: A }]}>返回</Text>
        </Pressable>
        <Text style={styles.title}>写作 Task 2</Text>
        <Text style={[styles.timer, left <= 60 && { color: colors.wrong }]}>{fmt(left)}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.promptCard, shadow.soft]}>
          <View style={styles.promptHead}>
            <Text style={[styles.promptType, { color: A }]}>{prompt.type}</Text>
            <Pressable onPress={restart} hitSlop={8} style={styles.swap}>
              <Ionicons name="shuffle" size={15} color={colors.textMuted} />
              <Text style={styles.swapText}>换一题</Text>
            </Pressable>
          </View>
          <Text style={styles.promptText}>{prompt.text}</Text>
        </View>

        {phase === 'grading' ? (
          <View style={styles.grading}>
            <ActivityIndicator color={A} />
            <Text style={styles.muted}>AI 考官正在评分…</Text>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.editor}
              placeholder="在此作答（建议 250 词以上）…"
              placeholderTextColor={colors.textMuted}
              value={essay}
              onChangeText={setEssay}
              multiline
              textAlignVertical="top"
              autoCapitalize="sentences"
            />
            <View style={styles.footer}>
              <Text style={[styles.count, words >= prompt.minWords ? { color: colors.correct } : null]}>
                {words} 词{prompt.minWords ? ` / 建议 ${prompt.minWords}` : ''}
              </Text>
              <Pressable
                style={[styles.submit, { backgroundColor: words >= 20 ? A : colors.border }]}
                onPress={submit}
                disabled={words < 20}
              >
                <Text style={styles.submitText}>提交评分</Text>
              </Pressable>
            </View>
            {!!error && <Text style={styles.errorText}>{error}</Text>}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Report({
  prompt,
  score,
  onRetry,
  onExit,
}: {
  prompt: WritingPrompt;
  score: WritingScore;
  onRetry: () => void;
  onExit: () => void;
}) {
  const crits = [
    { key: 'Task Response', c: score.tr },
    { key: 'Coherence & Cohesion', c: score.cc },
    { key: 'Lexical Resource', c: score.lr },
    { key: 'Grammar', c: score.gra },
  ];
  return (
    <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <Pressable onPress={onExit} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={A} />
          <Text style={[styles.exit, { color: A }]}>返回</Text>
        </Pressable>
        <Text style={styles.title}>评分报告</Text>
        <View style={{ minWidth: 60 }} />
      </View>

      <View style={[styles.overallCard, shadow.card]}>
        <Text style={styles.overallLabel}>预估总分</Text>
        <Text style={[styles.overallBand, { color: A }]}>{score.overall.toFixed(1)}</Text>
        <Text style={styles.muted}>{prompt.type}</Text>
      </View>

      {crits.map((x) => (
        <View key={x.key} style={[styles.critCard, shadow.soft]}>
          <View style={styles.critHead}>
            <Text style={styles.critName}>{x.key}</Text>
            <Text style={[styles.critBand, { color: A }]}>{x.c?.band?.toFixed(1) ?? '-'}</Text>
          </View>
          <Text style={styles.critComment}>{x.c?.comment ?? ''}</Text>
        </View>
      ))}

      {!!score.summary && (
        <View style={[styles.critCard, shadow.soft]}>
          <Text style={styles.critName}>总评</Text>
          <Text style={styles.critComment}>{score.summary}</Text>
        </View>
      )}

      {score.suggestions?.length > 0 && (
        <View style={[styles.critCard, shadow.soft]}>
          <Text style={styles.critName}>改进建议</Text>
          {score.suggestions.map((s, i) => (
            <View key={i} style={styles.sugRow}>
              <Ionicons name="arrow-forward" size={14} color={A} style={{ marginTop: 3 }} />
              <Text style={styles.sugText}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.resultBtns}>
        <Pressable style={[styles.submit, { backgroundColor: A, flex: 1 }]} onPress={onRetry}>
          <Text style={styles.submitText}>再写一篇</Text>
        </Pressable>
        <Pressable style={[styles.ghostBtn, { flex: 1 }]} onPress={onExit}>
          <Text style={[styles.ghostText, { color: A }]}>完成</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: space.lg, paddingBottom: 40, gap: 12, maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: 8,
    paddingBottom: 12,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', minWidth: 60 },
  exit: { fontSize: 16, fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  timer: { fontSize: 15, fontWeight: '800', color: colors.textSecondary, minWidth: 60, textAlign: 'right', fontVariant: ['tabular-nums'] },
  muted: { color: colors.textMuted, fontSize: 13 },
  promptCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, gap: 8 },
  promptHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  promptType: { fontSize: 12, fontWeight: '700' },
  swap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swapText: { fontSize: 12, color: colors.textMuted },
  promptText: { fontSize: 16, color: colors.text, lineHeight: 24, fontWeight: '500' },
  editor: {
    minHeight: 260,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { fontSize: 13, color: colors.textMuted, fontVariant: ['tabular-nums'] },
  submit: { borderRadius: radius.md, paddingVertical: 13, paddingHorizontal: 24, alignItems: 'center' },
  submitText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  ghostBtn: { borderRadius: radius.md, paddingVertical: 13, alignItems: 'center', backgroundColor: colors.accentFaint },
  ghostText: { fontWeight: '700', fontSize: 15 },
  grading: { alignItems: 'center', gap: 12, paddingVertical: 50 },
  errorText: { color: colors.wrong, fontSize: 13, textAlign: 'center' },
  overallCard: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 24, alignItems: 'center', gap: 2 },
  overallLabel: { fontSize: 13, color: colors.textMuted },
  overallBand: { fontSize: 54, fontWeight: '800' },
  critCard: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, gap: 6 },
  critHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  critName: { fontSize: 15, fontWeight: '700', color: colors.text },
  critBand: { fontSize: 18, fontWeight: '800' },
  critComment: { fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
  sugRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  sugText: { flex: 1, fontSize: 14, color: colors.textSecondary, lineHeight: 21 },
  resultBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
});
