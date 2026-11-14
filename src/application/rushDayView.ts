import type { Content } from '@/content';
import { businessDayOf } from '@/domain/business/definition';

import type { GameSnapshot } from './game';

const BASIS_POINTS = 10_000;

export type RushDayView =
  | { readonly status: 'idle'; readonly multiplier: number }
  | { readonly status: 'running'; readonly multiplier: number; readonly daysLeft: number };

export function selectRushDay(
  snapshot: GameSnapshot,
  request: { readonly businessId: string; readonly content: Content },
): RushDayView {
  const { content, businessId } = request;
  const { state } = snapshot;
  const owned = state.businesses.find((business) => business.definitionId === businessId);
  const rushDay = owned?.rushDay ?? { status: 'none' };
  if (rushDay.status === 'none')
    return { status: 'idle', multiplier: content.adRewards.rushProfitBps / BASIS_POINTS };
  const today = businessDayOf(state.clock.simulationMs, content.economy.businessRules);
  return {
    status: 'running',
    multiplier: rushDay.profitBps / BASIS_POINTS,
    daysLeft: Math.max(1, rushDay.endsDay - today),
  };
}
