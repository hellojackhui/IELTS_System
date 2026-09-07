import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { fetchReading, TFNG_OPTIONS, type Reading, type ReadingQuestion } from '../reading';
import { addWord, loadWordbook, removeWord } from '../wordbook';
import { boards, colors, CONTENT_MAX_WIDTH, radius, shadow, space } from '../theme';

const A = boards.exam.accent;

function isCorrect(q: ReadingQuestion, selected: number): boolean {
  if (q.type === 'tfng') return TFNG_OPTIONS[selected] === q.answer;
  return selected === Number(q.answer);
}

export function ReadingExam({ genre, onExit }: { genre: string; onExit: () => void }) {
  const [reading, setReading] = useState<Reading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReading(null);
    setError(null);
    setAnswers({});
    setRevealed(false);
    loadWordbook().then((list) => {
      if (!cancelled) setMarked(new Set(list.map((e) => e.word)));
    });
    fetchReading(genre)
      .then((r) => !cancelled && setReading(r))
      .catch((e) => !cancelled && setError(String((e as Error).message)));
    return () => {
      cancelled = true;
    };
  }, [genre]);

  function toggleWord(word: string) {
    const low = word.toLowerCase();
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(low)) {
        next.delete(low);
        removeWord(low);
      } else {
        next.add(low);
        addWord(low, undefined, reading?.title);
      }
      return next;
    });
  }

  const score = useMemo(() => {
    if (!reading) return 0;
    return reading.questions.reduce(
      (n, q, i) => n + (answers[i] != null && isCorrect(q, answers[i]) ? 1 : 0),
      0,
    );
  }, [reading, answers]);

  if (error) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={44} color={colors.wrong} />
        <Text style={[styles.muted, { marginTop: 10, textAlign: 'center', paddingHorizontal: 30 }]}>{error}</Text>
        <Pressable style={[styles.btn, { backgroundColor: A, marginTop: 18 }]} onPress={onExit}>
          <Text style={styles.btnText}>返回</Text>
        </Pressable>
      </View>
    );
  }

  if (!reading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={A} size="large" />
        <Text style={[styles.muted, { marginTop: 14 }]}>AI 正在生成阅读文章…</Text>
      </View>
    );
  }

  const answeredAll = reading.questions.every((_, i) => answers[i] != null);

  return (
    <View style={styles.flex}>
      <View style={styles.topBar}>
        <Pressable onPress={onExit} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={A} />
          <Text style={[styles.exit, { color: A }]}>返回</Text>
        </Pressable>
        <Text style={styles.topTitle}>阅读</Text>
        <Text style={styles.score}>{revealed ? `${score}/${reading.questions.length}` : ''}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.genreBadge, { backgroundColor: A + '18' }]}>
          <Text style={[styles.genreText, { color: A }]}>{reading.genreLabel}</Text>
        </View>
        <Text style={styles.title}>{reading.title}</Text>
        <Text style={styles.hint}>💡 读到不认识的词，点它一下即可加入「生词本」</Text>

        <View style={[styles.card, shadow.soft]}>
          <Passage text={reading.passage} marked={marked} onToggle={toggleWord} />
        </View>

        <Text style={styles.sectionLabel}>题目</Text>
        {reading.questions.map((q, i) => (
          <QuestionCard
            key={i}
            index={i}
            q={q}
            selected={answers[i]}
            revealed={revealed}
            onSelect={(opt) => !revealed && setAnswers((a) => ({ ...a, [i]: opt }))}
          />
        ))}

        {!revealed ? (
          <Pressable
            style={[styles.btn, { backgroundColor: answeredAll ? A : colors.border, marginTop: 8 }]}
            onPress={() => answeredAll && setRevealed(true)}
            disabled={!answeredAll}
          >
            <Text style={styles.btnText}>{answeredAll ? '提交' : '答完全部题目后提交'}</Text>
          </Pressable>
        ) : (
          <View style={styles.resultBtns}>
            <Pressable style={[styles.btn, { backgroundColor: A, flex: 1 }]} onPress={onExit}>
              <Text style={styles.btnText}>完成</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Passage({
  text,
  marked,
  onToggle,
}: {
  text: string;
  marked: Set<string>;
  onToggle: (w: string) => void;
}) {
  const tokens = useMemo(() => text.match(/[A-Za-z][A-Za-z'-]*|[^A-Za-z]+/g) ?? [], [text]);
  return (
    <Text style={styles.passage}>
      {tokens.map((tok, i) => {
        if (!/[A-Za-z]/.test(tok[0])) return <Text key={i}>{tok}</Text>;
        const on = marked.has(tok.toLowerCase());
        return (
          <Text key={i} onPress={() => onToggle(tok)} style={on ? styles.markedWord : undefined}>
            {tok}
          </Text>
        );
      })}
    </Text>
  );
}

function QuestionCard({
  index,
  q,
  selected,
  revealed,
  onSelect,
}: {
  index: number;
  q: ReadingQuestion;
  selected?: number;
  revealed: boolean;
  onSelect: (opt: number) => void;
}) {
  const options = q.type === 'tfng' ? TFNG_OPTIONS : q.options ?? [];
  const correctIdx = q.type === 'tfng' ? TFNG_OPTIONS.indexOf(String(q.answer)) : Number(q.answer);

  return (
    <View style={[styles.card, shadow.soft]}>
      <Text style={styles.qText}>
        {index + 1}. {q.q}
      </Text>
      <View style={{ gap: 8, marginTop: 10 }}>
        {options.map((opt, oi) => {
          const chosen = selected === oi;
          let state: 'idle' | 'correct' | 'wrong' | 'missed' = 'idle';
          if (revealed) {
            if (oi === correctIdx) state = 'correct';
            else if (chosen) state = 'wrong';
          } else if (chosen) state = 'missed';
          return (
            <Pressable
              key={oi}
              style={[
                styles.opt,
                state === 'missed' && { borderColor: A, backgroundColor: A + '10' },
                state === 'correct' && styles.optCorrect,
                state === 'wrong' && styles.optWrong,
              ]}
              onPress={() => onSelect(oi)}
              disabled={revealed}
            >
              <Text
                style={[
                  styles.optText,
                  state === 'correct' && { color: colors.correct },
                  state === 'wrong' && { color: colors.wrong },
                ]}
              >
                {opt}
              </Text>
              {revealed && state === 'correct' && <Ionicons name="checkmark-circle" size={18} color={colors.correct} />}
              {revealed && state === 'wrong' && <Ionicons name="close-circle" size={18} color={colors.wrong} />}
            </Pressable>
          );
        })}
      </View>
      {revealed && !!q.explain && (
        <View style={styles.explainBox}>
          <Text style={styles.explainText}>{q.explain}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.textMuted, fontSize: 14 },
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
  backBtn: { flexDirection: 'row', alignItems: 'center', minWidth: 64 },
  exit: { fontSize: 16, fontWeight: '600' },
  topTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  score: { fontSize: 15, fontWeight: '800', color: A, minWidth: 64, textAlign: 'right' },
  body: { padding: space.lg, paddingBottom: 40, gap: 12, maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center' },
  genreBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
  genreText: { fontSize: 12, fontWeight: '700' },
  title: { fontSize: 21, fontWeight: '800', color: colors.text, lineHeight: 28 },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: -4 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16 },
  passage: { fontSize: 16, lineHeight: 27, color: colors.text },
  markedWord: {
    backgroundColor: '#F4D06A55',
    color: colors.text,
    textDecorationLine: 'underline',
    textDecorationColor: '#C79A2E',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 12,
  },
  qText: { fontSize: 15, color: colors.text, fontWeight: '600', lineHeight: 22 },
  opt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: colors.bg,
  },
  optCorrect: { borderColor: colors.correct, backgroundColor: colors.correctBg },
  optWrong: { borderColor: colors.wrong, backgroundColor: colors.wrongBg },
  optText: { fontSize: 14, color: colors.text, flex: 1 },
  explainBox: { marginTop: 10, backgroundColor: colors.bg, borderRadius: radius.md, padding: 10 },
  explainText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
  btn: { borderRadius: radius.md, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  resultBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
});
