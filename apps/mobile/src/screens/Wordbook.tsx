import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CardGrid } from '../components/ui';
import { ensureDefinition, loadWordbook, removeWord, type WordbookEntry } from '../wordbook';
import { boards, colors, CONTENT_MAX_WIDTH, radius, shadow, space, useWide, WIDE_CONTENT_MAX } from '../theme';

const A = boards.memory.accent;

function speak(word: string) {
  Speech.stop();
  Speech.speak(word, { language: 'en-US', rate: 0.9 });
}

export function Wordbook({ onExit }: { onExit: () => void }) {
  const [list, setList] = useState<WordbookEntry[]>([]);
  const [mode, setMode] = useState<'list' | 'review'>('list');
  const wide = useWide();

  useEffect(() => {
    loadWordbook().then((l) => setList([...l]));
  }, []);

  async function remove(word: string) {
    await removeWord(word);
    setList((l) => l.filter((e) => e.word !== word));
  }

  if (mode === 'review' && list.length > 0) {
    return <Review list={list} onExit={() => setMode('list')} />;
  }

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, wide && styles.wideMax]}>
        <Pressable onPress={onExit} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={A} />
          <Text style={[styles.exit, { color: A }]}>返回</Text>
        </Pressable>
        <Text style={styles.topTitle}>生词本</Text>
        {list.length > 0 ? (
          <Pressable onPress={() => setMode('review')} hitSlop={8} style={styles.reviewBtn}>
            <Ionicons name="albums-outline" size={15} color={colors.white} />
            <Text style={styles.reviewText}>复习</Text>
          </Pressable>
        ) : (
          <View style={{ minWidth: 56 }} />
        )}
      </View>

      {list.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bookmark-outline" size={44} color={colors.textMuted} />
          <Text style={[styles.muted, { marginTop: 10, textAlign: 'center', paddingHorizontal: 40 }]}>
            还没有生词。在阅读时点句中不认识的词，就会收进这里。
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.body, wide && styles.wideMax]} showsVerticalScrollIndicator={false}>
          <CardGrid wide={wide} gap={10}>
            {list.map((e) => (
              <WordRow key={e.word} entry={e} onRemove={() => remove(e.word)} />
            ))}
          </CardGrid>
        </ScrollView>
      )}
    </View>
  );
}

function WordRow({ entry, onRemove }: { entry: WordbookEntry; onRemove: () => void }) {
  const [def, setDef] = useState(entry.definition);
  const [example, setExample] = useState(entry.example);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && !def) {
      setLoading(true);
      const updated = await ensureDefinition(entry.word);
      setLoading(false);
      if (updated) {
        setDef(updated.definition);
        setExample(updated.example);
      }
    }
  }

  return (
    <View style={[styles.row, shadow.soft]}>
      <View style={styles.rowMain}>
        <Pressable onPress={() => speak(entry.word)} hitSlop={8} style={styles.speak}>
          <Ionicons name="volume-medium-outline" size={18} color={A} />
        </Pressable>
        <Pressable style={{ flex: 1 }} onPress={toggle}>
          <Text style={styles.word}>{entry.word}</Text>
          {!!entry.source && (
            <Text style={styles.source} numberOfLines={1}>
              来自：{entry.source}
            </Text>
          )}
        </Pressable>
        <Pressable onPress={toggle} hitSlop={8} style={styles.chev}>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
        </Pressable>
        <Pressable onPress={onRemove} hitSlop={8} style={styles.del}>
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
      {expanded && (
        <View style={styles.detail}>
          {loading ? (
            <ActivityIndicator color={A} />
          ) : def ? (
            <>
              <Text style={styles.def}>{def}</Text>
              {!!example && <Text style={styles.example}>{example}</Text>}
            </>
          ) : (
            <Text style={styles.muted}>登录后可查释义</Text>
          )}
        </View>
      )}
    </View>
  );
}

function Review({ list, onExit }: { list: WordbookEntry[]; onExit: () => void }) {
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [def, setDef] = useState<string | undefined>(list[0]?.definition);
  const [example, setExample] = useState<string | undefined>(list[0]?.example);
  const [loading, setLoading] = useState(false);
  const entry = list[i];

  async function reveal() {
    setShown(true);
    if (!def) {
      setLoading(true);
      const updated = await ensureDefinition(entry.word);
      setLoading(false);
      setDef(updated?.definition);
      setExample(updated?.example);
    }
  }

  function go(delta: number) {
    const ni = Math.min(list.length - 1, Math.max(0, i + delta));
    setI(ni);
    setShown(false);
    setDef(list[ni].definition);
    setExample(list[ni].example);
  }

  return (
    <View style={styles.flex}>
      <View style={styles.topBar}>
        <Pressable onPress={onExit} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={A} />
          <Text style={[styles.exit, { color: A }]}>列表</Text>
        </Pressable>
        <Text style={styles.topTitle}>复习</Text>
        <Text style={styles.count}>
          {i + 1}/{list.length}
        </Text>
      </View>

      <View style={styles.cardArea}>
        <View style={[styles.flashCard, shadow.card]}>
          <Pressable onPress={() => speak(entry.word)} style={styles.flashSpeak} hitSlop={8}>
            <Ionicons name="volume-high" size={22} color={A} />
          </Pressable>
          <Text style={styles.flashWord}>{entry.word}</Text>

          {shown ? (
            <View style={styles.flashDetail}>
              {loading ? (
                <ActivityIndicator color={A} />
              ) : (
                <>
                  <Text style={styles.def}>{def ?? '（无释义，登录后可查）'}</Text>
                  {!!example && <Text style={styles.example}>{example}</Text>}
                </>
              )}
            </View>
          ) : (
            <Pressable style={[styles.revealBtn, { backgroundColor: A }]} onPress={reveal}>
              <Text style={styles.revealText}>显示释义</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.navRow}>
        <Pressable style={[styles.navBtn, i === 0 && styles.navDisabled]} onPress={() => go(-1)} disabled={i === 0}>
          <Ionicons name="arrow-back" size={18} color={i === 0 ? colors.textMuted : A} />
          <Text style={[styles.navText, { color: i === 0 ? colors.textMuted : A }]}>上一个</Text>
        </Pressable>
        <Pressable
          style={[styles.navBtn, i >= list.length - 1 && styles.navDisabled]}
          onPress={() => go(1)}
          disabled={i >= list.length - 1}
        >
          <Text style={[styles.navText, { color: i >= list.length - 1 ? colors.textMuted : A }]}>下一个</Text>
          <Ionicons name="arrow-forward" size={18} color={i >= list.length - 1 ? colors.textMuted : A} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wideMax: { maxWidth: WIDE_CONTENT_MAX },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
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
  backBtn: { flexDirection: 'row', alignItems: 'center', minWidth: 56 },
  exit: { fontSize: 16, fontWeight: '600' },
  topTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  count: { fontSize: 15, fontWeight: '800', color: A, minWidth: 56, textAlign: 'right' },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: A,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    minWidth: 56,
    justifyContent: 'center',
  },
  reviewText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  body: { padding: space.lg, paddingBottom: 40, gap: 10, maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center' },
  row: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14 },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  speak: { width: 34, height: 34, borderRadius: 17, backgroundColor: A + '14', alignItems: 'center', justifyContent: 'center' },
  word: { fontSize: 16, fontWeight: '700', color: colors.text },
  source: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  chev: { padding: 4 },
  del: { padding: 4 },
  detail: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, gap: 6 },
  def: { fontSize: 15, color: colors.text, lineHeight: 22 },
  example: { fontSize: 14, color: colors.textSecondary, lineHeight: 21, fontStyle: 'italic' },
  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  flashCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: 28,
    alignItems: 'center',
    gap: 16,
  },
  flashSpeak: { position: 'absolute', top: 14, right: 14, padding: 6 },
  flashWord: { fontSize: 32, fontWeight: '800', color: colors.text, marginTop: 12 },
  flashDetail: { alignItems: 'center', gap: 8, minHeight: 60, justifyContent: 'center' },
  revealBtn: { borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 28 },
  revealText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  navRow: { flexDirection: 'row', gap: 12, padding: space.lg, maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center' },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
  },
  navDisabled: { opacity: 0.5 },
  navText: { fontWeight: '700', fontSize: 14 },
});
