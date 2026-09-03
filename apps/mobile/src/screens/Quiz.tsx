import { Ionicons } from '@expo/vector-icons';
import {
  buildSession,
  checkSpelling,
  type Question,
  type QuizMode,
  type Word,
} from '@ielts/core';
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
import { api } from '../api';
import { useAuth } from '../auth';
import { getCloze, type Cloze } from '../cloze';
import { recordActivity } from '../rewards';
import { loadProgress, recordAnswer, syncNow } from '../store';
import { boards, colors, CONTENT_MAX_WIDTH, radius, shadow, space } from '../theme';

const ROUND_SIZE = 20;
const TITLES: Record<QuizMode, string> = {
  spelling: '单词拼写',
  dictation: '单词听写',
  choice: '语境选词',
};

function accentFor(mode: QuizMode): string {
  return mode === 'dictation' ? boards.listening.accent : boards.memory.accent;
}

function speak(word: string, rate = 0.85) {
  Speech.stop();
  Speech.speak(word, { language: 'en-US', rate });
}

export function Quiz({
  mode,
  onExit,
  review = false,
}: {
  mode: QuizMode;
  onExit: () => void;
  review?: boolean;
}) {
  const { user } = useAuth();
  const accent = accentFor(mode);
  const title = review ? '今日复习' : TITLES[mode];
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongs, setWrongs] = useState<Word[]>([]);
  const [answered, setAnswered] = useState<null | boolean>(null);
  const [input, setInput] = useState('');
  const [picked, setPicked] = useState<number | null>(null);
  const [cloze, setCloze] = useState<Cloze | null>(null);
  const [clozeLoading, setClozeLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadProgress().then((progress) => {
      setQuestions(buildSession({ mode, size: ROUND_SIZE, progress, dueOnly: review }));
    });
  }, [mode, review]);

  const q = questions?.[index];

  // In context-choice mode, fetch (and cache) a cloze sentence for each word.
  useEffect(() => {
    if (!q || mode !== 'choice') return;
    let cancelled = false;
    setCloze(null);
    setClozeLoading(true);
    getCloze(q.word).then((c) => {
      if (!cancelled) {
        setCloze(c);
        setClozeLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [q, mode]);

  useEffect(() => {
    if (q && mode === 'dictation' && answered === null) {
      const t = setTimeout(() => speak(q.word.word), 250);
      return () => clearTimeout(t);
    }
  }, [q, mode, answered]);

  if (!questions) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>加载中…</Text>
      </View>
    );
  }

  if (questions.length === 0) {
    return (
      <View style={styles.center}>
        <Ionicons name="checkmark-done-circle-outline" size={48} color={accent} />
        <Text style={[styles.muted, { marginTop: 12 }]}>今天没有到期要复习的词 🎉</Text>
        <Pressable style={[styles.nextBtn, { backgroundColor: accent, marginTop: 20, paddingHorizontal: 28 }]} onPress={onExit}>
          <Text style={styles.nextText}>返回</Text>
        </Pressable>
      </View>
    );
  }

  if (index >= questions.length) {
    return (
      <Result total={questions.length} correct={correctCount} wrongs={wrongs} loggedIn={!!user} accent={accent} onExit={onExit} />
    );
  }

  async function commit(isCorrect: boolean, word: Word) {
    setAnswered(isCorrect);
    setCorrectCount((c) => c + (isCorrect ? 1 : 0));
    if (!isCorrect) setWrongs((w) => [...w, word]);
    await recordAnswer(word.id, isCorrect);
    recordActivity(isCorrect ? 2 : 1);
  }

  function submitTyped() {
    if (answered !== null || !q) return;
    commit(checkSpelling(input, q.word), q.word);
  }

  function submitChoice(i: number) {
    if (answered !== null || !q) return;
    setPicked(i);
    commit(q.options![i].id === q.word.id, q.word);
  }

  function next() {
    setAnswered(null);
    setInput('');
    setPicked(null);
    setIndex((i) => i + 1);
  }

  const pct = ((index + (answered !== null ? 1 : 0)) / questions.length) * 100;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={40}>
      <View style={styles.column}>
      <View style={styles.topBar}>
        <Pressable onPress={onExit} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={accent} />
          <Text style={[styles.exit, { color: accent }]}>返回</Text>
        </Pressable>
        <Text style={styles.mode}>{title}</Text>
        <Text style={[styles.score, { color: accent }]}>
          {correctCount} / {answered !== null ? index + 1 : index}
        </Text>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: accent }]} />
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.qnum}>
          第 {index + 1} / {questions.length} 题
        </Text>

        <View style={[styles.card, shadow.card]}>
          {mode === 'dictation' ? (
            <View style={styles.listenArea}>
              <Pressable style={[styles.playBtn, { backgroundColor: accent }]} onPress={() => q && speak(q.word.word)}>
                <Ionicons name="volume-high" size={30} color={colors.white} />
              </Pressable>
              <Pressable style={styles.slowBtn} onPress={() => q && speak(q.word.word, 0.4)} hitSlop={8}>
                <Ionicons name="play-back" size={14} color={colors.textMuted} />
                <Text style={styles.slowText}>慢速重播</Text>
              </Pressable>
            </View>
          ) : mode === 'choice' ? (
            clozeLoading ? (
              <View style={styles.clozeLoading}>
                <ActivityIndicator color={accent} />
                <Text style={styles.pos}>生成例句中…</Text>
              </View>
            ) : cloze ? (
              <>
                <Text style={styles.prompt}>
                  {answered !== null ? cloze.en.replace('____', q!.word.word) : cloze.en}
                </Text>
                {!!cloze.zh && <Text style={styles.clozeHint}>{cloze.zh}</Text>}
              </>
            ) : (
              <>
                <Text style={styles.prompt}>{q!.word.meanings}</Text>
                {!!q!.word.pos && <Text style={styles.pos}>{q!.word.pos}</Text>}
              </>
            )
          ) : (
            <>
              <Text style={styles.prompt}>{q!.word.meanings}</Text>
              {!!q!.word.pos && <Text style={styles.pos}>{q!.word.pos}</Text>}
            </>
          )}

          {mode === 'choice' ? (
            <View style={styles.options}>
              {q!.options!.map((o, i) => {
                const isAnswer = o.id === q!.word.id;
                const show = answered !== null;
                const state = show && isAnswer ? 'correct' : show && i === picked ? 'wrong' : 'idle';
                return (
                  <Pressable
                    key={o.id}
                    style={[
                      styles.option,
                      state === 'idle' && !show && { borderColor: colors.border },
                      state === 'correct' && styles.optCorrect,
                      state === 'wrong' && styles.optWrong,
                    ]}
                    onPress={() => submitChoice(i)}
                    disabled={answered !== null}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        state === 'correct' && { color: colors.correct },
                        state === 'wrong' && { color: colors.wrong },
                      ]}
                    >
                      {o.word}
                    </Text>
                    {state === 'correct' && <Ionicons name="checkmark-circle" size={20} color={colors.correct} />}
                    {state === 'wrong' && <Ionicons name="close-circle" size={20} color={colors.wrong} />}
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={[
                  styles.input,
                  answered === true && styles.inputCorrect,
                  answered === false && styles.inputWrong,
                  answered === null && { borderColor: colors.border },
                ]}
                placeholder={mode === 'dictation' ? '输入听到的单词…' : '输入英文单词…'}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                value={input}
                editable={answered === null}
                onChangeText={setInput}
                onSubmitEditing={submitTyped}
                returnKeyType="done"
              />
              {answered === null && (
                <Pressable style={[styles.confirm, { backgroundColor: accent }]} onPress={submitTyped}>
                  <Text style={styles.confirmText}>确认</Text>
                </Pressable>
              )}
            </View>
          )}

          {answered !== null && (
            <View style={[styles.feedback, answered ? styles.fbCorrect : styles.fbWrong]}>
              <Ionicons
                name={answered ? 'checkmark-circle' : 'information-circle'}
                size={18}
                color={answered ? colors.correct : colors.wrong}
              />
              <Text style={[styles.fbText, answered ? styles.fbCorrectText : styles.fbWrongText]}>
                {answered ? '正确！' : `${q!.word.word}　${q!.word.raw}`}
              </Text>
            </View>
          )}

          {answered !== null && (
            <Pressable style={[styles.nextBtn, { backgroundColor: accent }]} onPress={next}>
              <Text style={styles.nextText}>{index + 1 >= questions.length ? '查看结果' : '下一题'}</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </Pressable>
          )}
        </View>
      </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function Result({
  total,
  correct,
  wrongs,
  loggedIn,
  accent,
  onExit,
}: {
  total: number;
  correct: number;
  wrongs: Word[];
  loggedIn: boolean;
  accent: string;
  onExit: () => void;
}) {
  const pct = Math.round((correct / total) * 100);
  const [syncMsg, setSyncMsg] = useState(loggedIn ? '正在同步…' : '');

  useEffect(() => {
    if (loggedIn) {
      syncNow(api)
        .then((r) => setSyncMsg(`已同步 ↑${r.pushed} ↓${r.pulled}`))
        .catch(() => setSyncMsg('同步失败，可在记忆页重试'));
    }
  }, [loggedIn]);

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, shadow.card, { alignItems: 'center' }]}>
        <Text style={[styles.bigScore, { color: accent }]}>{pct}%</Text>
        <Text style={styles.muted}>
          {correct} / {total} 正确
        </Text>
        {!!syncMsg && <Text style={styles.syncMsg}>{syncMsg}</Text>}

        {wrongs.length > 0 && (
          <View style={styles.wrongList}>
            <Text style={styles.wrongHeader}>需复习（{wrongs.length}）</Text>
            {wrongs.map((w) => (
              <View key={w.id} style={styles.wrongItem}>
                <Text style={styles.wrongEn}>{w.word}</Text>
                <Text style={styles.wrongZh} numberOfLines={1}>
                  {w.raw}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Pressable style={[styles.nextBtn, { backgroundColor: accent, marginTop: 20 }]} onPress={onExit}>
          <Text style={styles.nextText}>完成</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' },
  container: { padding: space.lg, paddingBottom: 48, gap: 12, maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.textMuted, fontSize: 14 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', minWidth: 72 },
  exit: { fontSize: 16, fontWeight: '600' },
  mode: { fontSize: 16, fontWeight: '700', color: colors.text },
  score: { fontSize: 15, fontWeight: '800', minWidth: 72, textAlign: 'right' },
  progressTrack: { height: 4, backgroundColor: colors.border, marginHorizontal: space.lg, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  qnum: { fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 20, gap: 16 },
  prompt: { fontSize: 23, color: colors.text, lineHeight: 32, fontWeight: '600' },
  pos: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic', marginTop: -8 },
  clozeHint: { fontSize: 14, color: colors.textMuted, lineHeight: 20, marginTop: -6 },
  clozeLoading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: {
    flex: 1,
    borderWidth: 2,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 17,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  inputCorrect: { borderColor: colors.correct, backgroundColor: colors.correctBg },
  inputWrong: { borderColor: colors.wrong, backgroundColor: colors.wrongBg },
  confirm: { borderRadius: radius.md, paddingHorizontal: 22, justifyContent: 'center' },
  confirmText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  listenArea: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  playBtn: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  slowBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 12 },
  slowText: { color: colors.textMuted, fontSize: 13 },
  options: { gap: 10 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 15,
    backgroundColor: colors.bg,
  },
  optCorrect: { borderColor: colors.correct, backgroundColor: colors.correctBg },
  optWrong: { borderColor: colors.wrong, backgroundColor: colors.wrongBg },
  optionText: { fontSize: 16, color: colors.text, fontWeight: '500' },
  feedback: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, padding: 12 },
  fbText: { flex: 1, fontSize: 14, lineHeight: 20 },
  fbCorrect: { backgroundColor: colors.correctBg },
  fbWrong: { backgroundColor: colors.wrongBg },
  fbCorrectText: { color: colors.correct, fontWeight: '700' },
  fbWrongText: { color: colors.wrong },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.md,
    paddingVertical: 14,
  },
  nextText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  bigScore: { fontSize: 52, fontWeight: '800' },
  syncMsg: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  wrongList: { alignSelf: 'stretch', marginTop: 18, gap: 6 },
  wrongHeader: { fontSize: 14, fontWeight: '700', color: colors.wrong, marginBottom: 4 },
  wrongItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  wrongEn: { color: colors.accent, fontWeight: '700', fontSize: 14 },
  wrongZh: { color: colors.textSecondary, fontSize: 13, flexShrink: 1 },
});
