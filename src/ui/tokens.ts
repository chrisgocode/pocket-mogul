import type { TextStyle } from 'react-native';

export const colors = {
  background: '#16171D',
  surface: '#202229',
  surfaceMuted: '#2B2E37',
  border: '#383C48',
  text: '#F1F0EB',
  textMuted: '#AFB2BD',
  textOnAccent: '#16171D',
  accent: '#9AC6F1',
  accentSoft: '#273A4C',
  gain: '#85D6B3',
  loss: '#F3A397',
  locked: '#626775',
  highlight: '#EABB72',
  gold: '#F2B705',
  scrim: 'rgba(0, 0, 0, 0.65)',
  buttonHighlight: '#FFFFFF',
  buttonTopEdge: 'rgba(255, 255, 255, 0.28)',
  buttonLowerEdge: 'rgba(0, 0, 0, 0.24)',
  buttonShadow: '#000000',
  transparent: 'transparent',
} as const;

export const sectionColors = {
  earn: '#EABB72',
  businesses: '#76D5C0',
  markets: '#B6A5EF',
  properties: '#EDAB91',
  profile: '#9AC6F1',
} as const;

export type SectionTone = keyof typeof sectionColors;

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
  golden: colors.gold,
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const minimumTouchTarget = 44;

export const highlightWidth = 2;

export const highlightCardWidth = 4;

export const feedback = {
  pressedScale: 0.97,
  buttonPressedScale: 0.985,
  buttonPressedOffset: 2,
  buttonHighlightOpacity: 0.15,
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

export const artworkThumbnailSize = 72;
