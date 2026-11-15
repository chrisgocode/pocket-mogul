import { advanceTaxTime } from './taxTime';
import type { Content } from '@/content';
import type { GameState } from '@/domain/gameState';
import { moneyCents, type MoneyCents } from '@/domain/money';
import { businessIncomePerMinuteCents, rentIncomePerMinuteCents } from '@/domain/passiveIncome';
import { boostedTapCents, tapPayoutCents } from '@/domain/tapping';

import { tapBonusPercent } from './collectionSetsView';
import { passiveEconomy } from './economy';
import type { GameSnapshot } from './game';
import { tapMultiplier } from './purchaseEffects';

type CashProjection = {
  readonly committed: GameState;
  readonly elapsedMs: number;
  readonly projected: GameState;
};

const projections = new WeakMap<Content, CashProjection>();

export function stateWithUnsavedIncome(snapshot: GameSnapshot, content: Content): GameState {
  const { state, unsavedElapsedMs } = snapshot;
  const previous = projections.get(content);
  if (previous?.committed === state && previous.elapsedMs === unsavedElapsedMs)
    return previous.projected;
  const projected = advanceTaxTime(state, {
    elapsedMs: unsavedElapsedMs,
    wallMs: state.clock.lastWallCheckpointMs,
    content,
  }).state;
  projections.set(content, { committed: state, elapsedMs: unsavedElapsedMs, projected });
  return projected;
}

export function selectCashCents(snapshot: GameSnapshot, content: Content): MoneyCents {
  const settled = stateWithUnsavedIncome(snapshot, content);
  const perTap = tapPayoutCents(settled.tap.walletLevel, content.economy.tap);
  const bonusPercent = tapBonusPercent(settled, content);
  const plain = boostedTapCents(perTap, {
    multiplier: tapMultiplier(settled, { content, boosted: false }),
    bonusPercent,
  });
  const boosted = boostedTapCents(perTap, {
    multiplier: tapMultiplier(settled, { content, boosted: true }),
    bonusPercent,
  });
  const pendingCents =
    plain * BigInt(snapshot.pendingTaps - snapshot.pendingBoostedTaps) +
    boosted * BigInt(snapshot.pendingBoostedTaps);
  return moneyCents(settled.cashCents + pendingCents);
}

export function selectBusinessIncomePerMinuteCents(
  snapshot: GameSnapshot,
  content: Content,
): MoneyCents {
  return businessIncomePerMinuteCents(snapshot.state, passiveEconomy(content));
}

export function selectRentIncomePerMinuteCents(
  snapshot: GameSnapshot,
  content: Content,
): MoneyCents {
  return rentIncomePerMinuteCents(snapshot.state, passiveEconomy(content));
}
