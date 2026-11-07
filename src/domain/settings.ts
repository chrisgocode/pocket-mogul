import type { CommandResult } from './commands';
import type { GameState } from './gameState';
import { moneyCents, type NumberFormatting } from './money';

export const SWITCH_VALUES = ['on', 'off'] as const;
export const MOTION_PREFERENCES = ['system', 'on', 'off'] as const;
export const NUMBER_FORMATS = ['compact', 'full'] as const satisfies readonly NumberFormatting[];

export type Switch = (typeof SWITCH_VALUES)[number];
export type MotionPreference = (typeof MOTION_PREFERENCES)[number];

export type Settings = {
  readonly sound: Switch;
  readonly haptics: Switch;
  readonly reducedMotion: MotionPreference;
  readonly numberFormatting: NumberFormatting;
};

export type SettingsChange = Partial<Settings>;

export const defaultSettings = (): Settings => ({
  sound: 'on',
  haptics: 'on',
  reducedMotion: 'system',
  numberFormatting: 'compact',
});

export function applyUpdateSettings(state: GameState, change: SettingsChange): CommandResult {
  return {
    ok: true,
    state: { ...state, settings: { ...state.settings, ...change } },
    cashChangeCents: moneyCents(0),
  };
}
