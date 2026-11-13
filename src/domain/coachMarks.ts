import type { CommandResult } from './commands';
import type { GameState } from './gameState';
import { moneyCents } from './money';

export const COACH_MARKS = [
  'vending',
  'car_wash',
  'delivery',
  'food_cart',
  'coffee_kiosk',
  'laundromat',
  'bakery',
  'gym',
  'hotel',
] as const;
export type CoachMark = (typeof COACH_MARKS)[number];

export function applyDismissCoachMark(state: GameState, coachMark: CoachMark): CommandResult {
  const seen = state.seenCoachMarks.includes(coachMark);
  const seenCoachMarks = seen ? state.seenCoachMarks : [...state.seenCoachMarks, coachMark];
  return { ok: true, state: { ...state, seenCoachMarks }, cashChangeCents: moneyCents(0) };
}
