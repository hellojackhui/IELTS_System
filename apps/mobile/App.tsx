import type { QuizMode } from '@ielts/core';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { Splash } from './src/components/Splash';
import { SideBar } from './src/components/SideBar';
import { TabBar, type TabItem, type TabKey } from './src/components/TabBar';
import { AuthProvider } from './src/auth';
import { AIBoard } from './src/screens/AIBoard';
import { ExamBoard } from './src/screens/ExamBoard';
import { ListeningBoard } from './src/screens/ListeningBoard';
import { MemoryBoard } from './src/screens/MemoryBoard';
import { ProfileBoard } from './src/screens/ProfileBoard';
import { Quiz } from './src/screens/Quiz';
import { ReadingExam } from './src/screens/ReadingExam';
import { WritingExam } from './src/screens/WritingExam';
import { Wordbook } from './src/screens/Wordbook';
import { boards, colors, useNative, WIDE_BREAKPOINT } from './src/theme';

// On web, make the mount point fill the viewport so flex:1 layouts expand.
// Done at module load (before first render) to avoid a corner-flash on launch.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent =
    'html,body,#root{height:100%;width:100%;margin:0;padding:0;}#root{display:flex;}';
  document.head.appendChild(style);
}

const TABS: TabItem[] = [
  { key: 'memory', label: '记忆', icon: 'book', accent: boards.memory.accent },
  { key: 'ai', label: 'AI', icon: 'sparkles', accent: boards.ai.accent },
  { key: 'listening', label: '听力', icon: 'headset', accent: boards.listening.accent },
  { key: 'exam', label: '考试', icon: 'document-text', accent: boards.exam.accent },
  { key: 'profile', label: '我的', icon: 'person', accent: boards.profile.accent },
];

type Overlay =
  | { kind: 'quiz'; mode: QuizMode; review?: boolean }
  | { kind: 'writing' }
  | { kind: 'reading'; genre: string }
  | { kind: 'wordbook' };

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [tab, setTab] = useState<TabKey>('memory');
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;

  // All boards stay mounted so switching preserves state (chat, scroll position).
  const panes = (
    <View style={styles.body}>
      <Pane visible={tab === 'memory'}>
        <MemoryBoard
          onStart={(mode) => setOverlay({ kind: 'quiz', mode })}
          onReview={() => setOverlay({ kind: 'quiz', mode: 'spelling', review: true })}
          onOpenWordbook={() => setOverlay({ kind: 'wordbook' })}
          reloadToken={reloadToken}
        />
      </Pane>
      <Pane visible={tab === 'ai'}>
        <AIBoard />
      </Pane>
      <Pane visible={tab === 'listening'}>
        <ListeningBoard onStart={(mode) => setOverlay({ kind: 'quiz', mode })} />
      </Pane>
      <Pane visible={tab === 'exam'}>
        <ExamBoard
          onStartWriting={() => setOverlay({ kind: 'writing' })}
          onStartReading={(genre) => setOverlay({ kind: 'reading', genre })}
        />
      </Pane>
      <Pane visible={tab === 'profile'}>
        <ProfileBoard reloadToken={reloadToken} />
      </Pane>
    </View>
  );

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
      <AuthProvider>
        <SafeAreaView style={styles.root} edges={['top']}>
          <StatusBar style="dark" />

          {wide ? (
            <View style={styles.wideRow}>
              <SideBar items={TABS} active={tab} onChange={setTab} />
              {panes}
            </View>
          ) : (
            <>
              {panes}
              <TabBar items={TABS} active={tab} onChange={setTab} />
            </>
          )}

          {overlay && (
            <OverlayHost
              overlay={overlay}
              onClose={() => {
                setOverlay(null);
                setReloadToken((t) => t + 1);
              }}
            />
          )}

          {!splashDone && <Splash onDone={() => setSplashDone(true)} />}
        </SafeAreaView>
      </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

/** Keeps children mounted but hidden when not active. */
function Pane({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return <View style={[styles.pane, !visible && styles.hidden]}>{children}</View>;
}

/** Full-screen overlay for the quiz / writing / reading / wordbook flows. */
function OverlayHost({ overlay, onClose }: { overlay: Overlay; onClose: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 260, useNativeDriver: useNative }).start();
  }, [anim]);

  const close = () => {
    Animated.timing(anim, { toValue: 0, duration: 190, useNativeDriver: useNative }).start(({ finished }) => {
      if (finished) onClose();
    });
  };

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });

  return (
    <Animated.View style={[styles.overlay, { opacity: anim, transform: [{ translateY }] }]}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        {overlay.kind === 'quiz' && <Quiz mode={overlay.mode} review={overlay.review} onExit={close} />}
        {overlay.kind === 'writing' && <WritingExam onExit={close} />}
        {overlay.kind === 'reading' && <ReadingExam genre={overlay.genre} onExit={close} />}
        {overlay.kind === 'wordbook' && <Wordbook onExit={close} />}
      </SafeAreaView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  flex: { flex: 1 },
  wideRow: { flex: 1, flexDirection: 'row' },
  pane: { ...StyleSheet.absoluteFillObject },
  hidden: { display: 'none' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
    zIndex: 50,
  },
});
