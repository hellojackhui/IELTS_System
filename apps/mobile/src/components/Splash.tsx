import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import { colors, useNative } from '../theme';

const serif = Platform.select({ ios: 'Georgia', default: undefined });

/** Animated launch screen: mark scales/fades in, holds, then fades the whole overlay out. */
export function Splash({ onDone }: { onDone: () => void }) {
  const markScale = useRef(new Animated.Value(0.8)).current;
  const markOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(markOpacity, { toValue: 1, duration: 420, useNativeDriver: useNative }),
        Animated.spring(markScale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: useNative }),
      ]),
      Animated.timing(textOpacity, { toValue: 1, duration: 360, useNativeDriver: useNative }),
      Animated.delay(650),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 420,
        easing: Easing.in(Easing.quad),
        useNativeDriver: useNative,
      }),
    ]).start(({ finished }) => {
      if (finished) onDone();
    });
  }, [markOpacity, markScale, textOpacity, overlayOpacity, onDone]);

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} pointerEvents="none">
      <Animated.View style={{ opacity: markOpacity, transform: [{ scale: markScale }] }}>
        <View style={styles.mark}>
          <Text style={styles.markText}>词</Text>
        </View>
      </Animated.View>
      <Animated.View style={{ opacity: textOpacity, alignItems: 'center' }}>
        <Text style={styles.title}>IELTS 词汇</Text>
        <Text style={styles.tagline}>记忆 · 听力 · AI 助手</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    zIndex: 100,
  },
  mark: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: {
    fontSize: 52,
    color: colors.white,
    fontWeight: '700',
    fontFamily: serif,
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.white, letterSpacing: 1 },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 6, letterSpacing: 2 },
});
