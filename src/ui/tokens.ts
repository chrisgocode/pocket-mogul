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
  buttonLowerEdge: 'rgba(0, 0, 0, 0.32)',
  buttonShadow: '#000000',
  stageGlow: 'rgba(234, 187, 114, 0.14)',
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

export const size = {
  hudAvatar: 38,
  hudRing: 3,
  hudPill: 34,
  railButton: 46,
  railWidth: 58,
  tabCentre: 52,
  tabCentreLift: -22,
  badge: 18,
  pip: 6,
  pipWidth: 12,
  tabIcon: 22,
  tabCentreIcon: 26,
  tileArt: 52,
  rowBadge: 38,
  iconSmall: 16,
  iconMedium: 20,
  sheetHandleWidth: 40,
  sheetHandleHeight: 4,
  progressBar: 6,
  buttonDepth: 4,
  walletStage: 190,
} as const;

export const motion = {
  tapPopMs: 650,
  tapPulse: { inputRange: [0, 0.3, 1], outputRange: [0.92, 1.05, 1] },
  tapRise: { inputRange: [0, 1], outputRange: [0, -70] },
  tapFade: { inputRange: [0, 0.15, 1], outputRange: [0, 1, 0] },
};

export const feedback = {
  pressedScale: 0.97,
  buttonPressedScale: 0.985,
  buttonPressedOffset: 3,
  buttonHighlightOpacity: 0.15,
  pressedOpacity: 0.7,
  hapticMinIntervalMs: 100,
} as const;

const numeric: TextStyle = { fontVariant: ['tabular-nums'] };

export const type = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800', ...numeric },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '800' },
  heading: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 19, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  number: { fontSize: 14, lineHeight: 19, fontWeight: '700', ...numeric },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  micro: { fontSize: 10, lineHeight: 12, fontWeight: '700', ...numeric },
} satisfies Record<string, TextStyle>;

export const artworkThumbnailSize = 72;
