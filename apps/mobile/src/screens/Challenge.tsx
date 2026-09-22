import { Ionicons } from '@expo/vector-icons';
import {
  buildChallengeQuestions,
  starsForScore,
  type ChallengeLevel,
  type ChallengeQuestion,
} from '@ielts/core';
import * as Speech from 'expo-speech';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { markLevelCleared } from '../challenge';
import { recordActivity } from '../rewards';
import { boards, colors, CONTENT_MAX_WIDTH, radius, shadow, space } from '../theme';

const A = boards.scenario.accent;

function speak(text: string, rate = 0.9) {
  Speech.stop();
  Speech.speak(text, { language: 'en-US', rate });
}

export function ChallengeFlow({
  level,
  onExit,
  onCleared,
}: {
  level: ChallengeLevel;
  onExit: () => void;
  onCleared?: (stars: number, scorePct: number) => void;
}) {
  const [attempt, setAttempt] = useState(0);
  const questions = useMemo(
    () => buildChallengeQuestions(level, 4),
    [level.id, attempt],
  );
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const savedRef = useRef(false);

  const total = questions.length;
  const q = questions[idx];

  // Auto-play the audio for listen questions.
  useEffect(() => {
    setPicked(null);
    if (q?.type === 'listen') {
      const t = setTimeout(() => speak(q.prompt), 250);
      return () => clearTimeout(t);
    }
  }, [idx, q]);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  function pick(optIndex: number) {
    if (picked !== null) return;
    const chosen = q.options[optIndex];
    setPicked(optIndex);
    if (chosen === q.answer) setCorrect((c) => c + 1);
  }

  function next() {
    if (idx + 1 >= total) {
      setDone(true);
      return;
    }
    setIdx((i) => i + 1);
  }

  if (done) {
    const pct = total ? Math.round((correct / total) * 100) : 0;
    const stars = starsForScore(correct, total);
    if (!savedRef.current) {
      savedRef.current = true;
      markLevelCleared(level.id, stars, pct).catch(() => {});
      if (stars > 0) recordActivity(stars * 5).catch(() => {});
      onCleared?.(stars, pct);
    }
    return <Result stars={stars} pct={pct} correct={correct} total={total} onExit={onExit} onRetry={() => { savedRef.current = false; setDone(false); setIdx(0); setCorrect(0); setAttempt((a) => a + 1); }} />;
  }

  return (
    <View style={styles.col}>
      <TopBar title={level.title} onBack={onExit} />
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((idx + (picked !== null ? 1 : 0)) / total) * 100}%` }]} />
      </View>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <PartHeader
          label={`第 ${idx + 1} / ${total} 题`}
          sub={q.type === 'listen' ? '听音选义 · 听英文，选中文' : '看义选句 · 看中文，选英文'}
        />
        <View style={[styles.card, shadow.card]}>
          {q.type === 'listen' ? (
            <Pressable style={[styles.playBtn, { backgroundColor: A }]} onPress={() => speak(q.prompt)}>
              <Ionicons name="volume-high" size={30} color={colors.white} />
            </Pressable>
          ) : (
            <Text style={styles.prompt}>{q.prompt}</Text>
          )}
          {q.type === 'listen' && (
            <Text style={styles.listenHint}>点击喇叭重听</Text>
          )}
          <View style={styles.options}>
            {q.options.map((o, oi) => {
              const isAnswer = o === q.answer;
              const state = picked !== null && isAnswer ? 'correct' : picked === oi ? 'wrong' : 'idle';
              return (
                <Pressable
                  key={oi}
                  style={[styles.option, state === 'correct' && styles.optCorrect, state === 'wrong' && styles.optWrong]}
                  onPress={() => pick(oi)}
                  disabled={picked !== null}
                >
                  <Text style={[styles.optionText, state === 'correct' && { color: colors.correct }, state === 'wrong' && { color: colors.wrong }]}>
                    {o}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {picked !== null && (
            <Pressable style={[styles.nextBtn, { backgroundColor: A }]} onPress={next}>
              <Text style={styles.nextText}>{idx + 1 >= total ? '查看结果' : '下一题'}</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Result({
  stars,
  pct,
  correct,
  total,
  onExit,
  onRetry,
}: {
  stars: number;
  pct: number;
  correct: number;
  total: number;
  onExit: () => void;
  onRetry: () => void;
}) {
  const pass = stars > 0;
  return (
    <View style={styles.col}>
      <TopBar title="闯关结果" onBack={onExit} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, shadow.card, styles.resultCard]}>
          <Text style={[styles.bigScore, { color: pass ? A : colors.wrong }]}>{pct}%</Text>
          <Text style={styles.muted}>
            {correct} / {total} 正确
          </Text>
          <View style={styles.stars}>
            {[0, 1, 2].map((i) => (
              <Ionicons key={i} name={i < stars ? 'star' : 'star-outline'} size={34} color={i < stars ? '#F2B705' : colors.textMuted} />
            ))}
          </View>
          <Text style={[styles.resultMsg, { color: pass ? A : colors.wrong }]}>
            {pass ? (stars === 3 ? '完美通关！🌟' : '通关成功！') : '差一点点，再来一次吧'}
          </Text>
          <View style={styles.resultBtns}>
            <Pressable style={[styles.resultBtn, styles.retryBtn]} onPress={onRetry}>
              <Ionicons name="refresh" size={18} color={A} />
              <Text style={[styles.retryText, { color: A }]}>再来一次</Text>
            </Pressable>
            <Pressable style={[styles.resultBtn, { backgroundColor: A }]} onPress={onExit}>
              <Text style={styles.nextText}>完成</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function TopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.topBar}>
      <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={22} color={A} />
        <Text style={[styles.exit, { color: A }]}>返回</Text>
      </Pressable>
      <Text style={styles.mode} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ minWidth: 72 }} />
    </View>
  );
}

function PartHeader({ label, sub }: { label: string; sub: string }) {
  return (
    <View style={styles.partHead}>
      <Text style={styles.partLabel}>{label}</Text>
      <Text style={styles.partSub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  col: { flex: 1, width: '100%', maxWidth: 1000, alignSelf: 'center' },
  container: { padding: space.lg, paddingBottom: 48, gap: 12, maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg, paddingTop: 8, paddingBottom: 12 },
  backBtn: { flexDirection: 'row', alignItems: 'center', minWidth: 72 },
  exit: { fontSize: 16, fontWeight: '600' },
  mode: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center' },
  progressTrack: { height: 4, backgroundColor: colors.border, marginHorizontal: space.lg, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: A },

  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 20, gap: 14, alignItems: 'center' },
  playBtn: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  listenHint: { fontSize: 12.5, color: colors.textMuted },
  prompt: { fontSize: 19, color: colors.text, lineHeight: 28, fontWeight: '600', textAlign: 'center' },

  options: { gap: 10, width: '100%' },
  option: { borderWidth: 2, borderColor: colors.border, borderRadius: radius.md, padding: 15, backgroundColor: colors.bg },
  optCorrect: { borderColor: colors.correct, backgroundColor: colors.correctBg },
  optWrong: { borderColor: colors.wrong, backgroundColor: colors.wrongBg },
  optionText: { fontSize: 16, color: colors.text, fontWeight: '500' },

  nextBtn: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.md, paddingVertical: 14 },
  nextText: { color: colors.white, fontWeight: '700', fontSize: 15 },

  partHead: { gap: 2 },
  partLabel: { fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' },
  partSub: { fontSize: 13, color: colors.textSecondary },

  resultCard: { gap: 10 },
  bigScore: { fontSize: 52, fontWeight: '800' },
  muted: { color: colors.textMuted, fontSize: 14 },
  stars: { flexDirection: 'row', gap: 8 },
  resultMsg: { fontSize: 18, fontWeight: '800' },
  resultBtns: { flexDirection: 'row', gap: 12, marginTop: 8 },
  resultBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.md, paddingVertical: 14 },
  retryBtn: { backgroundColor: A + '14' },
  retryText: { fontWeight: '700', fontSize: 15 },
});
