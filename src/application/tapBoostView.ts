import type { Content } from '@/content';
import { boostRemainingMs } from '@/domain/boost';

import type { GameSnapshot } from './game';

const MS_PER_SECOND = 1_000;

export type TapBoostAd = 'loading' | 'ready' | 'unavailable' | 'showing';

export type TapBoostView =
  | { readonly status: 'ready'; readonly multiplier: number; readonly durationSeconds: number }
  | { readonly status: 'loading' | 'unavailable' | 'showing' | 'pending' }
  | { readonly status: 'active'; readonly multiplier: number; readonly remainingSeconds: number };

type BoostSnapshot = Pick<GameSnapshot, 'state' | 'unsavedBoostMs'>;

function remainingBoostMs(snapshot: BoostSnapshot): number {
  return Math.max(0, boostRemainingMs(snapshot.state.reward.boost) - snapshot.unsavedBoostMs);
}

export function isTapBoosted(snapshot: BoostSnapshot): boolean {
  return remainingBoostMs(snapshot) > 0;
}

export function boostExists(snapshot: BoostSnapshot): boolean {
  return snapshot.state.reward.boost.status === 'pending' || isTapBoosted(snapshot);
}

export function selectTapBoost(snapshot: GameSnapshot, content: Content): TapBoostView {
  const { tapMultiplier: multiplier, durationMs } = content.economy.boost;
  const remainingMs = remainingBoostMs(snapshot);
  if (remainingMs > 0) {
    return {
      status: 'active',
      multiplier,
      remainingSeconds: Math.ceil(remainingMs / MS_PER_SECOND),
    };
  }
  if (snapshot.state.reward.boost.status === 'pending') return { status: 'pending' };
  if (snapshot.tapBoostAd !== 'ready') return { status: snapshot.tapBoostAd };
  return { status: 'ready', multiplier, durationSeconds: durationMs / MS_PER_SECOND };
}
