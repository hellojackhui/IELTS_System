import { Ionicons } from '@expo/vector-icons';
import {
  COURSE_CHAPTERS,
  articlePlain,
  buildArticleCloze,
  buildUnitChoiceQuestions,
  chapterUnits,
  courseWordMeaning,
  courseWordExample,
  getChapter,
  getUnit,
  type CourseUnit,
} from '@ielts/core';
import * as Speech from 'expo-speech';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { recordActivity } from '../rewards';
import { recordAnswer } from '../store';
import { getCourseProgress, markUnitLearned, recordUnitTest } from '../course';
import { boards, colors, CONTENT_MAX_WIDTH, radius, shadow, space } from '../theme';

const A = boards.memory.accent;

function speak(word: string, rate = 0.85) {
  Speech.stop();
  Speech.speak(word, { language: 'en-US', rate });
}

type CourseView =
  | { k: 'chapters' }
  | { k: 'unit'; unitId: string }
  | { k: 'learn'; unitId: string }
  | { k: 'test'; unitId: string };

export function Course({ onExit }: { onExit: () => void }) {
  const [view, setView] = useState<CourseView>({ k: 'chapters' });
  const [progress, setProgress] = useState<Record<string, { learned?: boolean; testBest?: number }>>({});
  const refresh = () => getCourseProgress().then(setProgress);
  useEffect(() => {
    refresh();
  }, [view]);

  if (view.k === 'chapters') {
    return <Chapters progress={progress} onExit={onExit} onOpenUnit={(unitId) => setView({ k: 'unit', unitId })} />;
  }
  const unit = getUnit(view.unitId)!;
  if (view.k === 'unit') {
    return (
      <UnitHome
        unit={unit}
        prog={progress[unit.id]}
        onBack={() => setView({ k: 'chapters' })}
        onLearn={() => setView({ k: 'learn', unitId: unit.id })}
        onTest={() => setView({ k: 'test', unitId: unit.id })}
      />
    );
  }
  if (view.k === 'learn') {
    return <Learn unit={unit} onDone={() => setView({ k: 'unit', unitId: unit.id })} />;
  }
  return <UnitTest unit={unit} onDone={() => setView({ k: 'unit', unitId: unit.id })} />;
}

/* ----------------------------- chapters list ----------------------------- */

function Chapters({
  progress,
  onExit,
  onOpenUnit,
}: {
  progress: Record<string, { learned?: boolean; testBest?: number }>;
  onExit: () => void;
  onOpenUnit: (unitId: string) => void;
}) {
  const [open, setOpen] = useState<number | null>(1);
  return (
    <View style={styles.flex}>
      <TopBar title="词汇课程" onBack={onExit} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>雅思词汇真经 · {COURSE_CHAPTERS.length} 章 · 先学后测</Text>
        {COURSE_CHAPTERS.map((ch) => {
          const units = chapterUnits(ch.chapter);
          const done = units.filter((u) => (progress[u.id]?.testBest ?? 0) >= 60).length;
          const expanded = open === ch.chapter;
          return (
            <View key={ch.chapter} style={[styles.chapterCard, shadow.soft]}>
              <Pressable style={styles.chapterHead} onPress={() => setOpen(expanded ? null : ch.chapter)}>
                <View style={styles.chapterNumChip}>
                  <Text style={styles.chapterNum}>{ch.chapter}</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.chapterTheme}>{ch.theme}</Text>
                  <Text style={styles.chapterMeta}>
                    {units.length} 单元 · 已过 {done}/{units.length}
                  </Text>
                </View>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
              </Pressable>
              {expanded && (
                <View style={styles.unitList}>
                  {units.map((u, i) => {
                    const p = progress[u.id];
                    const passed = (p?.testBest ?? 0) >= 60;
                    return (
                      <Pressable key={u.id} style={styles.unitRow} onPress={() => onOpenUnit(u.id)}>
                        <View
                          style={[
                            styles.unitDot,
                            passed && { backgroundColor: A, borderColor: A },
                            !passed && p?.learned && { borderColor: A },
                          ]}
                        >
                          {passed && <Ionicons name="checkmark" size={12} color={colors.white} />}
                        </View>
                        <Text style={styles.unitTitle} numberOfLines={1}>
                          第 {i + 1} 单元 · {u.words.length} 词
                        </Text>
                        {p?.testBest != null && <Text style={styles.unitScore}>{p.testBest}%</Text>}
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

/* ------------------------------- unit home ------------------------------- */

function UnitHome({
  unit,
  prog,
  onBack,
  onLearn,
  onTest,
}: {
  unit: CourseUnit;
  prog?: { learned?: boolean; testBest?: number };
  onBack: () => void;
  onLearn: () => void;
  onTest: () => void;
}) {
  const ch = getChapter(unit.chapter);
  return (
    <View style={styles.flex}>
      <TopBar title={ch?.theme ?? '单元'} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, shadow.card]}>
          <Text style={styles.articleTitle}>{unit.articleTitle}</Text>
          <Text style={styles.unitSub}>{unit.words.length} 个单词</Text>
        </View>

        <Pressable style={[styles.bigBtn, { backgroundColor: A }]} onPress={onLearn}>
          <Ionicons name="school-outline" size={22} color={colors.white} />
          <View style={styles.flex}>
            <Text style={styles.bigBtnTitle}>学习</Text>
            <Text style={styles.bigBtnDesc}>逐词卡片：释义 · 音标 · 发音</Text>
          </View>
          {prog?.learned && <Ionicons name="checkmark-circle" size={20} color={colors.white} />}
        </Pressable>

        <Pressable style={[styles.bigBtn, styles.testBtn]} onPress={onTest}>
          <Ionicons name="create-outline" size={22} color={A} />
          <View style={styles.flex}>
            <Text style={[styles.bigBtnTitle, { color: colors.text }]}>测试</Text>
            <Text style={[styles.bigBtnDesc, { color: colors.textSecondary }]}>选择 · 听音拼写 · 文章填空</Text>
          </View>
          {prog?.testBest != null && <Text style={[styles.unitScore, { fontSize: 15 }]}>{prog.testBest}%</Text>}
        </Pressable>

        <WordPreview unit={unit} />
      </ScrollView>
    </View>
  );
}

function WordPreview({ unit }: { unit: CourseUnit }) {
  return (
    <View style={[styles.card, shadow.card]}>
      <Text style={styles.sectionLabel}>单词表</Text>
      {unit.words.map((w) => (
        <View key={w.word} style={styles.previewRow}>
          <Pressable onPress={() => speak(w.word)} hitSlop={8} style={styles.previewSpeak}>
            <Ionicons name="volume-medium-outline" size={16} color={A} />
          </Pressable>
          <Text style={styles.previewWord}>{w.word}</Text>
          <Text style={styles.previewMeaning} numberOfLines={1}>
            {courseWordMeaning(w)}
          </Text>
        </View>
      ))}
    </View>
  );
}

/* --------------------------------- learn --------------------------------- */

function Learn({ unit, onDone }: { unit: CourseUnit; onDone: () => void }) {
  const [i, setI] = useState(0);
  const w = unit.words[i];
  const last = i >= unit.words.length - 1;

  useEffect(() => {
    const t = setTimeout(() => speak(w.word), 200);
    return () => clearTimeout(t);
  }, [i]);

  async function finish() {
    await markUnitLearned(unit.id);
    onDone();
  }

  return (
    <View style={styles.flex}>
      <TopBar title={`学习 ${i + 1}/${unit.words.length}`} onBack={onDone} />
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${((i + 1) / unit.words.length) * 100}%` }]} />
      </View>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, shadow.card, styles.flashCard]}>
          <Text style={styles.flashWord}>{w.word}</Text>
          {!!w.ipa && <Text style={styles.flashIpa}>/{w.ipa}/</Text>}
          <Pressable style={[styles.speakBtn, { backgroundColor: A }]} onPress={() => speak(w.word)}>
            <Ionicons name="volume-high" size={26} color={colors.white} />
          </Pressable>
          {!!w.pos && <Text style={styles.flashPos}>{w.pos}</Text>}
          <Text style={styles.flashMeaning}>{courseWordMeaning(w)}</Text>
          {w.defs.slice(0, 2).map((d, k) => (
            <Text key={k} style={styles.flashDef}>
              {k + 1}. {d}
            </Text>
          ))}
          {!!courseWordExample(w.word) && (
            <View style={styles.exampleBox}>
              <Ionicons name="chatbubble-ellipses-outline" size={14} color={A} />
              <Text style={styles.exampleText}>{courseWordExample(w.word)}</Text>
            </View>
          )}
        </View>

        <View style={styles.learnNav}>
          <Pressable
            style={[styles.navBtn, i === 0 && styles.navBtnDisabled]}
            disabled={i === 0}
            onPress={() => setI((n) => Math.max(0, n - 1))}
          >
            <Ionicons name="chevron-back" size={18} color={i === 0 ? colors.textMuted : colors.text} />
            <Text style={[styles.navText, i === 0 && { color: colors.textMuted }]}>上一个</Text>
          </Pressable>
          {last ? (
            <Pressable style={[styles.navBtn, styles.navPrimary, { backgroundColor: A }]} onPress={finish}>
              <Text style={styles.navPrimaryText}>学完了</Text>
              <Ionicons name="checkmark" size={18} color={colors.white} />
            </Pressable>
          ) : (
            <Pressable style={[styles.navBtn, styles.navPrimary, { backgroundColor: A }]} onPress={() => setI((n) => n + 1)}>
              <Text style={styles.navPrimaryText}>下一个</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.white} />
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/* ------------------------------- unit test ------------------------------- */

type Phase = 'choice' | 'dictation' | 'cloze' | 'result';

function UnitTest({ unit, onDone }: { unit: CourseUnit; onDone: () => void }) {
  const choiceQs = useMemo(() => buildUnitChoiceQuestions(unit, 6), [unit.id]);
  const dictWords = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const w of unit.words) {
      const k = w.word.toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push(w.word);
      }
      if (out.length >= 6) break;
    }
    return out;
  }, [unit.id]);

  const [phase, setPhase] = useState<Phase>('choice');
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [wrong, setWrong] = useState<string[]>([]);

  function tally(word: string, ok: boolean) {
    setTotal((t) => t + 1);
    if (ok) setCorrect((c) => c + 1);
    else setWrong((w) => (w.includes(word) ? w : [...w, word]));
    recordAnswer(word.toLowerCase(), ok);
    recordActivity(ok ? 2 : 1);
  }

  function afterChoice() {
    setPhase(dictWords.length ? 'dictation' : 'cloze');
  }

  useEffect(() => {
    if (phase === 'result') {
      const pct = total ? Math.round((correct / total) * 100) : 0;
      recordUnitTest(unit.id, pct);
    }
  }, [phase]);

  if (phase === 'choice') {
    return choiceQs.length ? (
      <ChoiceRound qs={choiceQs} onWord={tally} onBack={onDone} onDone={afterChoice} />
    ) : (
      <DictationRound words={dictWords} onWord={tally} onBack={onDone} onDone={() => setPhase('cloze')} />
    );
  }
  if (phase === 'dictation') {
    return <DictationRound words={dictWords} onWord={tally} onBack={onDone} onDone={() => setPhase('cloze')} />;
  }
  if (phase === 'cloze') {
    return (
      <ClozeRound
        unit={unit}
        onBack={onDone}
        onDone={(c, t, wrongWords) => {
          setCorrect((x) => x + c);
          setTotal((x) => x + t);
          setWrong((w) => [...new Set([...w, ...wrongWords])]);
          wrongWords.forEach((ww) => recordAnswer(ww.toLowerCase(), false));
          setPhase('result');
        }}
      />
    );
  }
  const pct = total ? Math.round((correct / total) * 100) : 0;
  return (
    <View style={styles.flex}>
      <TopBar title="测试结果" onBack={onDone} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, shadow.card, { alignItems: 'center' }]}>
          <Text style={[styles.bigScore, { color: pct >= 60 ? A : colors.wrong }]}>{pct}%</Text>
          <Text style={styles.muted}>
            {correct} / {total} 正确
          </Text>
          {wrong.length > 0 && (
            <View style={styles.wrongList}>
              <Text style={styles.wrongHeader}>需复习（{wrong.length}）</Text>
              {wrong.map((word) => {
                const cw = unit.words.find((w) => w.word.toLowerCase() === word.toLowerCase());
                return (
                  <View key={word} style={styles.wrongItem}>
                    <Text style={styles.wrongEn}>{word}</Text>
                    <Text style={styles.wrongZh} numberOfLines={1}>
                      {cw ? courseWordMeaning(cw) : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          <Pressable style={[styles.nextBtn, { backgroundColor: A, marginTop: 20 }]} onPress={onDone}>
            <Text style={styles.nextText}>完成</Text>
          </Pressable>
        </View>
      </ScrollView>
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

function ChoiceRound({
  qs,
  onWord,
  onBack,
  onDone,
}: {
  qs: ReturnType<typeof buildUnitChoiceQuestions>;
  onWord: (word: string, ok: boolean) => void;
  onBack: () => void;
  onDone: () => void;
}) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const q = qs[i];
  const answered = picked !== null;

  function pick(opt: string) {
    if (answered) return;
    setPicked(opt);
    onWord(q.answer, opt === q.answer);
  }
  function next() {
    if (i + 1 >= qs.length) return onDone();
    setPicked(null);
    setI((n) => n + 1);
  }

  return (
    <View style={styles.flex}>
      <TopBar title="测试 · 语境选词" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <PartHeader label={`选择 ${i + 1}/${qs.length}`} sub="选出句子空格处正确的词" />
        <View style={[styles.card, shadow.card]}>
          <Text style={styles.prompt}>{q.prompt}</Text>
          <View style={styles.options}>
            {q.options.map((o) => {
              const isAnswer = o === q.answer;
              const state = answered && isAnswer ? 'correct' : answered && o === picked ? 'wrong' : 'idle';
              return (
                <Pressable
                  key={o}
                  style={[styles.option, state === 'correct' && styles.optCorrect, state === 'wrong' && styles.optWrong]}
                  onPress={() => pick(o)}
                  disabled={answered}
                >
                  <Text
                    style={[
                      styles.optionText,
                      state === 'correct' && { color: colors.correct },
                      state === 'wrong' && { color: colors.wrong },
                    ]}
                  >
                    {o}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {answered && (
            <Pressable style={[styles.nextBtn, { backgroundColor: A }]} onPress={next}>
              <Text style={styles.nextText}>{i + 1 >= qs.length ? '下一部分' : '下一题'}</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function DictationRound({
  words,
  onWord,
  onBack,
  onDone,
}: {
  words: string[];
  onWord: (word: string, ok: boolean) => void;
  onBack: () => void;
  onDone: () => void;
}) {
  const [i, setI] = useState(0);
  const [input, setInput] = useState('');
  const [answered, setAnswered] = useState<null | boolean>(null);
  const word = words[i];

  useEffect(() => {
    const t = setTimeout(() => speak(word), 250);
    return () => clearTimeout(t);
  }, [i]);

  function submit() {
    if (answered !== null) return;
    const ok = input.trim().toLowerCase() === word.toLowerCase();
    setAnswered(ok);
    onWord(word, ok);
  }
  function next() {
    if (i + 1 >= words.length) return onDone();
    setInput('');
    setAnswered(null);
    setI((n) => n + 1);
  }

  return (
    <View style={styles.flex}>
      <TopBar title="测试 · 听音拼写" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <PartHeader label={`听音拼写 ${i + 1}/${words.length}`} sub="听发音，拼出单词" />
        <View style={[styles.card, shadow.card]}>
          <View style={styles.listenArea}>
            <Pressable style={[styles.playBtn, { backgroundColor: A }]} onPress={() => speak(word)}>
              <Ionicons name="volume-high" size={30} color={colors.white} />
            </Pressable>
            <Pressable style={styles.slowBtn} onPress={() => speak(word, 0.4)} hitSlop={8}>
              <Ionicons name="play-back" size={14} color={colors.textMuted} />
              <Text style={styles.slowText}>慢速重播</Text>
            </Pressable>
          </View>
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.input,
                answered === true && styles.inputCorrect,
                answered === false && styles.inputWrong,
                answered === null && { borderColor: colors.border },
              ]}
              placeholder="输入听到的单词…"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              value={input}
              editable={answered === null}
              onChangeText={setInput}
              onSubmitEditing={submit}
              returnKeyType="done"
            />
            {answered === null && (
              <Pressable style={[styles.confirm, { backgroundColor: A }]} onPress={submit}>
                <Text style={styles.confirmText}>确认</Text>
              </Pressable>
            )}
          </View>
          {answered !== null && (
            <>
              <View style={[styles.feedback, answered ? styles.fbCorrect : styles.fbWrong]}>
                <Ionicons name={answered ? 'checkmark-circle' : 'information-circle'} size={18} color={answered ? colors.correct : colors.wrong} />
                <Text style={[styles.fbText, { color: answered ? colors.correct : colors.wrong, fontWeight: answered ? '700' : '400' }]}>
                  {answered ? '正确！' : word}
                </Text>
              </View>
              <Pressable style={[styles.nextBtn, { backgroundColor: A }]} onPress={next}>
                <Text style={styles.nextText}>{i + 1 >= words.length ? '下一部分' : '下一题'}</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.white} />
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/* --------------------------- article cloze (tap) --------------------------- */

function ClozeRound({
  unit,
  onBack,
  onDone,
}: {
  unit: CourseUnit;
  onBack: () => void;
  onDone: (correct: number, total: number, wrongWords: string[]) => void;
}) {
  const cloze = useMemo(() => buildArticleCloze(unit), [unit.id]);
  const blankKeys = useMemo(
    () => cloze.parts.filter((p) => p.kind === 'blank').map((p) => (p as { answer: string }).answer),
    [cloze],
  );
  const [fills, setFills] = useState<(string | null)[]>(() => blankKeys.map(() => null));
  const [selected, setSelected] = useState(0);
  const [checked, setChecked] = useState(false);

  const usedValues = new Set(fills.filter(Boolean) as string[]);
  const allFilled = fills.every(Boolean);

  function place(tile: string) {
    if (checked) return;
    const next = [...fills];
    let idx = selected;
    if (next[idx]) {
      const empty = next.findIndex((f) => !f);
      idx = empty >= 0 ? empty : idx;
    }
    const prev = next.indexOf(tile);
    if (prev >= 0) next[prev] = null;
    next[idx] = tile;
    setFills(next);
    const empty = next.findIndex((f) => !f);
    setSelected(empty >= 0 ? empty : idx);
  }
  function onBlank(idx: number) {
    if (checked) return;
    if (fills[idx]) {
      const next = [...fills];
      next[idx] = null;
      setFills(next);
    }
    setSelected(idx);
  }
  const correctCount = fills.filter((f, k) => (f ?? '').toLowerCase() === blankKeys[k].toLowerCase()).length;
  function check() {
    setChecked(true); // reveal corrections; the user reviews, then taps 查看结果
  }
  function finish() {
    const wrongWords = blankKeys.filter((key, i) => (fills[i] ?? '').toLowerCase() !== key.toLowerCase());
    onDone(correctCount, blankKeys.length, wrongWords);
  }

  let bi = -1;
  return (
    <View style={styles.flex}>
      <TopBar title="测试 · 文章填空" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <PartHeader label={`文章填空 ${fills.filter(Boolean).length}/${blankKeys.length}`} sub="点空格→点下方词，把词填进文章" />
        <View style={[styles.card, shadow.card]}>
          <Text style={styles.articleHeading}>{unit.articleTitle}</Text>
          <Text style={styles.articleBody}>
            {cloze.parts.map((p, k) => {
              if (p.kind === 'text') return <Text key={k}>{p.text}</Text>;
              bi += 1;
              const idx = bi;
              const val = fills[idx];
              const ok = checked && (val ?? '').toLowerCase() === p.answer.toLowerCase();
              const bad = checked && !ok;
              return (
                <Text
                  key={k}
                  onPress={() => onBlank(idx)}
                  style={[
                    styles.blank,
                    !checked && selected === idx && styles.blankSel,
                    ok && styles.blankOk,
                    bad && styles.blankBad,
                  ]}
                >
                  {' '}
                  {checked ? (ok ? val : p.answer) : (val ?? '_____')}
                  {' '}
                </Text>
              );
            })}
          </Text>
        </View>

        {!checked && (
          <View style={styles.bank}>
            {cloze.bank.map((tile) => {
              const used = usedValues.has(tile);
              return (
                <Pressable
                  key={tile}
                  style={[styles.tile, used && styles.tileUsed]}
                  onPress={() => place(tile)}
                  disabled={used}
                >
                  <Text style={[styles.tileText, used && { color: colors.textMuted }]}>{tile}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {!checked && (
          <Pressable
            style={[styles.nextBtn, { backgroundColor: allFilled ? A : colors.border }]}
            onPress={check}
            disabled={!allFilled}
          >
            <Text style={styles.nextText}>提交</Text>
          </Pressable>
        )}
        {checked && (
          <>
            <Text style={styles.clozeScore}>
              填对 {correctCount} / {blankKeys.length}
              {correctCount < blankKeys.length ? '　·　红色为正确答案' : ' 🎉'}
            </Text>
            <Pressable style={[styles.nextBtn, { backgroundColor: A }]} onPress={finish}>
              <Text style={styles.nextText}>查看结果</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/* --------------------------------- shared -------------------------------- */

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

const styles = StyleSheet.create({
  flex: { flex: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' },
  container: { padding: space.lg, paddingBottom: 48, gap: 12 },
  muted: { color: colors.textMuted, fontSize: 14 },
  lead: { fontSize: 13, color: colors.textMuted, marginBottom: 4 },
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
  mode: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, textAlign: 'center' },

  chapterCard: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  chapterHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  chapterNumChip: { width: 34, height: 34, borderRadius: 17, backgroundColor: A + '18', alignItems: 'center', justifyContent: 'center' },
  chapterNum: { color: A, fontWeight: '800', fontSize: 15 },
  chapterTheme: { fontSize: 16, fontWeight: '700', color: colors.text },
  chapterMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  unitList: { paddingHorizontal: 16, paddingBottom: 8 },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  unitDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitTitle: { flex: 1, fontSize: 14, color: colors.text },
  unitScore: { fontSize: 12, fontWeight: '700', color: A },

  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 20, gap: 12 },
  articleTitle: { fontSize: 18, fontWeight: '700', color: colors.text, lineHeight: 25 },
  unitSub: { fontSize: 13, color: colors.textMuted },
  bigBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radius.lg, padding: 18 },
  testBtn: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: A + '40' },
  bigBtnTitle: { fontSize: 17, fontWeight: '800', color: colors.white },
  bigBtnDesc: { fontSize: 12.5, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  previewSpeak: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  previewWord: { fontSize: 15, fontWeight: '600', color: colors.text, minWidth: 110 },
  previewMeaning: { flex: 1, fontSize: 13, color: colors.textSecondary },

  progressTrack: { height: 4, backgroundColor: colors.border, marginHorizontal: space.lg, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2, backgroundColor: A },
  flashCard: { alignItems: 'center', gap: 10, paddingVertical: 28 },
  flashWord: { fontSize: 34, fontWeight: '800', color: colors.text },
  flashIpa: { fontSize: 16, color: colors.textMuted },
  speakBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginVertical: 4 },
  flashPos: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic' },
  flashMeaning: { fontSize: 19, color: colors.text, fontWeight: '600', textAlign: 'center' },
  flashDef: { fontSize: 13.5, color: colors.textSecondary, lineHeight: 20, alignSelf: 'stretch' },
  exampleBox: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'stretch',
    backgroundColor: A + '0E',
    borderRadius: radius.md,
    padding: 12,
    marginTop: 6,
  },
  exampleText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 21, fontStyle: 'italic' },
  learnNav: { flexDirection: 'row', gap: 12 },
  navBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.md, paddingVertical: 14, backgroundColor: colors.card },
  navBtnDisabled: { opacity: 0.6 },
  navText: { fontSize: 15, fontWeight: '600', color: colors.text },
  navPrimary: {},
  navPrimaryText: { fontSize: 15, fontWeight: '700', color: colors.white },

  partHead: { gap: 2 },
  partLabel: { fontSize: 12, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' },
  partSub: { fontSize: 13, color: colors.textSecondary },
  prompt: { fontSize: 19, color: colors.text, lineHeight: 28, fontWeight: '600' },
  options: { gap: 10 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderColor: colors.border, borderRadius: radius.md, padding: 15, backgroundColor: colors.bg },
  optCorrect: { borderColor: colors.correct, backgroundColor: colors.correctBg },
  optWrong: { borderColor: colors.wrong, backgroundColor: colors.wrongBg },
  optionText: { fontSize: 16, color: colors.text, fontWeight: '500' },
  listenArea: { alignItems: 'center', gap: 12, paddingVertical: 8 },
  playBtn: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  slowBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 12 },
  slowText: { color: colors.textMuted, fontSize: 13 },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, borderWidth: 2, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 17, color: colors.text, backgroundColor: colors.bg },
  inputCorrect: { borderColor: colors.correct, backgroundColor: colors.correctBg },
  inputWrong: { borderColor: colors.wrong, backgroundColor: colors.wrongBg },
  confirm: { borderRadius: radius.md, paddingHorizontal: 22, justifyContent: 'center' },
  confirmText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  feedback: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, padding: 12 },
  fbText: { flex: 1, fontSize: 14, lineHeight: 20 },
  fbCorrect: { backgroundColor: colors.correctBg },
  fbWrong: { backgroundColor: colors.wrongBg },

  articleHeading: { fontSize: 16, fontWeight: '700', color: colors.text, lineHeight: 23 },
  articleBody: { fontSize: 16, color: colors.text, lineHeight: 32 },
  blank: { color: A, fontWeight: '700' },
  blankSel: { color: A, backgroundColor: A + '22' },
  blankOk: { color: colors.correct },
  blankBad: { color: colors.wrong, backgroundColor: colors.wrong + '18' },
  bank: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { borderWidth: 1.5, borderColor: A + '55', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: A + '12' },
  tileUsed: { borderColor: colors.border, backgroundColor: colors.bg, opacity: 0.5 },
  tileText: { fontSize: 15, color: A, fontWeight: '600' },
  clozeScore: { textAlign: 'center', color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 2 },

  nextBtn: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.md, paddingVertical: 14 },
  nextText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  bigScore: { fontSize: 52, fontWeight: '800' },
  wrongList: { alignSelf: 'stretch', marginTop: 18, gap: 6 },
  wrongHeader: { fontSize: 14, fontWeight: '700', color: colors.wrong, marginBottom: 4 },
  wrongItem: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  wrongEn: { color: A, fontWeight: '700', fontSize: 14 },
  wrongZh: { color: colors.textSecondary, fontSize: 13, flexShrink: 1 },
});
