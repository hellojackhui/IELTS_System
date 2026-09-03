import { Platform } from 'react-native';

export const colors = {
  // Brand
  accent: '#2D6A7A',
  accentLight: '#3A8A9D',
  accentFaint: '#EAF1F3',

  // Surfaces
  bg: '#F7F6F3',
  bgElevated: '#FBFAF8',
  card: '#FFFFFF',

  // Text
  text: '#1A1D2E',
  textSecondary: '#5A5D6E',
  textMuted: '#8A8D9E',

  border: '#E7E5DF',

  // Semantic
  correct: '#2A7A4B',
  correctBg: '#E7F1EB',
  wrong: '#C4473A',
  wrongBg: '#F7E7E5',

  white: '#FFFFFF',
};

/** Each board carries its own accent so the three sections read as distinct places. */
export const boards = {
  memory: { accent: '#2D6A7A', tint: '#EAF1F3', icon: 'book' as const },
  ai: { accent: '#5B57A6', tint: '#ECEBF6', icon: 'sparkles' as const },
  listening: { accent: '#B4703A', tint: '#F6EEE4', icon: 'headset' as const },
  exam: { accent: '#A6505E', tint: '#F5E9EC', icon: 'document-text' as const },
  profile: { accent: '#5A6472', tint: '#ECEEF1', icon: 'person' as const },
};

/** Layout breakpoint: at or above this width we use the desktop sidebar layout. */
export const WIDE_BREAKPOINT = 900;
export const CONTENT_MAX_WIDTH = 720;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 };

export const shadow = {
  card:
    Platform.OS === 'web'
      ? ({ boxShadow: '0 1px 3px rgba(26,29,46,0.06), 0 6px 20px rgba(26,29,46,0.05)' } as any)
      : {
          shadowColor: '#1A1D2E',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 4 },
          elevation: 3,
        },
  soft:
    Platform.OS === 'web'
      ? ({ boxShadow: '0 1px 2px rgba(26,29,46,0.05)' } as any)
      : {
          shadowColor: '#1A1D2E',
          shadowOpacity: 0.05,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 1,
        },
};

export const useNative = Platform.OS !== 'web';
