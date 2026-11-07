import type { TextStyle } from 'react-native';

export const colors = {
  background: '#0C1512',
  chrome: '#08100D',
  surface: '#13201B',
  surfaceRaised: '#1A2B24',
  surfaceMuted: '#22342C',
  border: '#2A4036',
  text: '#EFE9D6',
  textMuted: '#97AB9E',
  textOnAccent: '#1F1605',
  accent: '#F4CF6B',
  accentDeep: '#B98A2E',
  accentSoft: '#2F2E1C',
  accentGlow: 'rgba(244, 207, 107, 0.35)',
  gain: '#5EE29A',
  loss: '#FF7A70',
  locked: '#62736A',
  highlight: '#6FD8FF',
  scrim: 'rgba(3, 8, 6, 0.72)',
} as const;

export const trendColors = {
  gain: colors.gain,
  loss: colors.loss,
  flat: colors.textMuted,
} as const;

export type Trend = keyof typeof trendColors;

export const walletArt = {
  starter: '#2C6B55',
  leather: '#7A4A22',
  silver: '#4F5D69',
  gold: '#8C6517',
  obsidian: '#1B1D24',
} as const;

export const glow = {
  accent: '0 6px 20px rgba(244, 207, 107, 0.28)',
  card: '0 10px 28px rgba(0, 0, 0, 0.45)',
  sheet: '0 -12px 32px rgba(0, 0, 0, 0.5)',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;

export const minimumTouchTarget = 44;

export const highlightWidth = 2;

export const highlightCardWidth = 4;

export const buttonEdgeWidth = 3;

export const moneyGlowRadius = 18;

export const feedback = {
  pressedScale: 0.97,
  pressedOpacity: 0.7,
  hapticMinIntervalMs: 100,
} as const;

const fonts = {
  display: 'Bricolage Grotesque',
  body: 'Instrument Sans',
} as const;

const numeric: TextStyle = { fontVariant: ['tabular-nums'] };

export const type = {
  display: {
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '800',
    letterSpacing: -0.5,
    ...numeric,
  },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, fontWeight: '800' },
  heading: { fontFamily: fonts.body, fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 20, fontWeight: '400' },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, fontWeight: '400' },
  label: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  number: { fontFamily: fonts.body, fontSize: 15, lineHeight: 20, fontWeight: '600', ...numeric },
} satisfies Record<string, TextStyle>;
