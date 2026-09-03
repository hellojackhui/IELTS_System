import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { streamAssistantReply } from '../ai';
import {
  deleteConversation,
  listConversations,
  newConversation,
  saveConversation,
  type Conversation,
} from '../chat';
import { boards, colors, CONTENT_MAX_WIDTH, radius, shadow, space } from '../theme';

const A = boards.ai.accent;
const SUGGESTIONS = ['帮我练一段咖啡店点单对话', '这句话语法对吗：I very like it', '用 "nevertheless" 造个句'];

export function AIBoard() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [active, setActive] = useState<Conversation>(() => newConversation());
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [showList, setShowList] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const bufRef = useRef('');

  useEffect(() => {
    listConversations().then((list) => {
      setConvs(list);
      if (list.length) setActive(list[0]);
    });
  }, []);

  const refreshList = () => listConversations().then(setConvs);
  const scrollSoon = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 40);

  function openConversation(c: Conversation) {
    setActive(c);
    setShowList(false);
    setError(null);
  }
  function startNew() {
    setActive(newConversation());
    setShowList(false);
    setError(null);
  }
  async function removeConversation(id: string) {
    await deleteConversation(id);
    const list = await listConversations();
    setConvs(list);
    if (active.id === id) setActive(list[0] ?? newConversation());
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;
    setError(null);
    const withUser: Conversation = { ...active, messages: [...active.messages, { role: 'user', content }] };
    setActive(withUser);
    setInput('');
    const saved = await saveConversation(withUser);
    setActive(saved);
    refreshList();

    setStreaming(true);
    setStreamText('');
    bufRef.current = '';
    scrollSoon();
    try {
      await streamAssistantReply(saved.messages, (t) => {
        bufRef.current += t;
        setStreamText(bufRef.current);
        scrollSoon();
      });
      if (bufRef.current) {
        const withReply: Conversation = {
          ...saved,
          messages: [...saved.messages, { role: 'assistant', content: bufRef.current }],
        };
        const saved2 = await saveConversation(withReply);
        setActive(saved2);
        refreshList();
      }
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setStreaming(false);
      setStreamText('');
      scrollSoon();
    }
  }

  function speak(text: string) {
    Speech.stop();
    Speech.speak(text, { language: 'en-US', rate: 0.95 });
  }

  const empty = active.messages.length === 0 && !streaming;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.column}>
        <View style={styles.topBar}>
          <Pressable style={styles.iconBtn} onPress={() => setShowList(true)} hitSlop={8}>
            <Ionicons name="menu" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.topTitle} numberOfLines={1}>
            {active.messages.length ? active.title : 'AI 助手'}
          </Text>
          <Pressable style={styles.iconBtn} onPress={startNew} hitSlop={8}>
            <Ionicons name="create-outline" size={22} color={A} />
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {empty ? (
            <View style={styles.welcome}>
              <View style={[styles.welcomeIcon, { backgroundColor: A + '16' }]}>
                <Ionicons name="sparkles" size={30} color={A} />
              </View>
              <Text style={styles.welcomeTitle}>和 AI 一起练英语</Text>
              <Text style={styles.welcomeText}>练对话 · 纠语法 · 造句。试着发一句看看 👇</Text>
              <View style={styles.chips}>
                {SUGGESTIONS.map((s) => (
                  <Pressable key={s} style={[styles.chip, { borderColor: A + '55' }]} onPress={() => send(s)}>
                    <Text style={[styles.chipText, { color: A }]}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            active.messages.map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content} onSpeak={() => speak(m.content)} />
            ))
          )}
          {streaming && <Bubble role="assistant" content={streamText || '…'} streaming />}
          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="warning-outline" size={16} color={colors.wrong} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="说点什么…"
            placeholderTextColor={colors.textMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
            multiline
            editable={!streaming}
          />
          <Pressable
            style={[styles.sendBtn, { backgroundColor: input.trim() && !streaming ? A : colors.border }]}
            onPress={() => send(input)}
            disabled={!input.trim() || streaming}
          >
            <Ionicons name="arrow-up" size={20} color={colors.white} />
          </Pressable>
        </View>
      </View>

      {showList && (
        <ConversationDrawer
          convs={convs}
          activeId={active.id}
          onClose={() => setShowList(false)}
          onOpen={openConversation}
          onNew={startNew}
          onDelete={removeConversation}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function Bubble({
  role,
  content,
  streaming,
  onSpeak,
}: {
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
  onSpeak?: () => void;
}) {
  const isUser = role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser ? styles.rowRight : styles.rowLeft]}>
      <View style={[styles.bubble, isUser ? [styles.userBubble, { backgroundColor: A }] : [styles.aiBubble, shadow.soft]]}>
        <Text style={isUser ? styles.userText : styles.aiText}>{content}</Text>
        {!isUser && !streaming && onSpeak && (
          <Pressable style={styles.speakBtn} onPress={onSpeak} hitSlop={8}>
            <Ionicons name="volume-medium-outline" size={16} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function ConversationDrawer({
  convs,
  activeId,
  onClose,
  onOpen,
  onNew,
  onDelete,
}: {
  convs: Conversation[];
  activeId: string;
  onClose: () => void;
  onOpen: (c: Conversation) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <View style={styles.drawerWrap}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.drawer, shadow.card]}>
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>会话</Text>
          <Pressable onPress={onNew} style={[styles.newBtn, { backgroundColor: A }]} hitSlop={6}>
            <Ionicons name="add" size={16} color={colors.white} />
            <Text style={styles.newBtnText}>新对话</Text>
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {convs.length === 0 && <Text style={styles.drawerEmpty}>还没有会话</Text>}
          {convs.map((c) => {
            const last = c.messages[c.messages.length - 1];
            return (
              <Pressable
                key={c.id}
                style={[styles.convRow, c.id === activeId && { backgroundColor: A + '12' }]}
                onPress={() => onOpen(c)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.convTitle} numberOfLines={1}>
                    {c.title}
                  </Text>
                  {!!last && (
                    <Text style={styles.convPreview} numberOfLines={1}>
                      {last.content}
                    </Text>
                  )}
                </View>
                <Pressable onPress={() => onDelete(c.id)} hitSlop={8} style={styles.delBtn}>
                  <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                </Pressable>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  column: { flex: 1, width: '100%', maxWidth: CONTENT_MAX_WIDTH, alignSelf: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconBtn: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  topTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: colors.text },
  messages: { padding: space.lg, gap: 10, flexGrow: 1 },
  welcome: { alignItems: 'center', paddingTop: 40, gap: 10 },
  welcomeIcon: { width: 68, height: 68, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  welcomeTitle: { fontSize: 19, fontWeight: '800', color: colors.text, marginTop: 6 },
  welcomeText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  chips: { gap: 8, marginTop: 16, alignSelf: 'stretch' },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  chipText: { fontSize: 14, fontWeight: '600' },
  bubbleRow: { flexDirection: 'row' },
  rowLeft: { justifyContent: 'flex-start' },
  rowRight: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '85%', borderRadius: 18, paddingVertical: 10, paddingHorizontal: 14 },
  userBubble: { borderBottomRightRadius: 6 },
  aiBubble: { backgroundColor: colors.card, borderBottomLeftRadius: 6 },
  userText: { color: colors.white, fontSize: 15, lineHeight: 21 },
  aiText: { color: colors.text, fontSize: 15, lineHeight: 21 },
  speakBtn: { marginTop: 6, alignSelf: 'flex-start' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingVertical: 6 },
  errorText: { color: colors.wrong, fontSize: 13 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: space.lg,
    paddingTop: 8,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 42,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.card,
  },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  drawerWrap: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', zIndex: 20 },
  drawer: { width: 280, maxWidth: '82%', backgroundColor: colors.card, paddingTop: 16, paddingHorizontal: 12 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingHorizontal: 4 },
  drawerTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  newBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 7, paddingHorizontal: 12, borderRadius: radius.pill },
  newBtnText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  drawerEmpty: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 20 },
  convRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: radius.md },
  convTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  convPreview: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  delBtn: { padding: 4 },
});
