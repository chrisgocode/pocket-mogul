import type { TextStyle } from 'react-native';

export const colors = {
  background: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF0F3',
  border: '#E1E4E8',
  text: '#14171F',
  textMuted: '#5B6270',
  textOnAccent: '#FFFFFF',
  accent: '#2563EB',
  accentSoft: '#E3ECFD',
  gain: '#12805C',
  loss: '#C2362F',
  locked: '#8A909C',
  highlight: '#D97706',
  scrim: 'rgba(20, 23, 31, 0.45)',
} as const;

export const trendColors = {
  gain: colors.gain,
  loss: colors.loss,
  flat: colors.textMuted,
} as const;

export type Trend = keyof typeof trendColors;

export const walletArt = {
  starter: '#2563EB',
  leather: '#8A4B1F',
  silver: '#526072',
  gold: '#9A6A00',
  obsidian: '#14171F',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const minimumTouchTarget = 44;

export const highlightWidth = 2;

export const highlightCardWidth = 4;

export const feedback = {
  pressedScale: 0.97,
  pressedOpacity: 0.7,
  hapticMinIntervalMs: 100,
} as const;

const numeric: TextStyle = { fontVariant: ['tabular-nums'] };

export const type = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700', ...numeric },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  number: { fontSize: 15, lineHeight: 20, fontWeight: '600', ...numeric },
} satisfies Record<string, TextStyle>;
