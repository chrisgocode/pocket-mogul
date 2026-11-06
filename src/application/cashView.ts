import type { Content } from '@/content';
import type { GameState } from '@/domain/gameState';
import { moneyCents, type MoneyCents } from '@/domain/money';
import { advanceTime, businessIncomePerMinuteCents } from '@/domain/passiveIncome';
import { tapPayoutCents } from '@/domain/tapping';

import type { GameSnapshot } from './game';

function stateWithUnsavedIncome(snapshot: GameSnapshot, content: Content): GameState {
  const { state } = snapshot;
  return advanceTime(state, {
    elapsedMs: snapshot.unsavedElapsedMs,
    wallMs: state.clock.lastWallCheckpointMs,
    catalog: content.businesses,
  }).state;
}

export function selectCashCents(snapshot: GameSnapshot, content: Content): MoneyCents {
  const settled = stateWithUnsavedIncome(snapshot, content);
  const perTap = tapPayoutCents(settled.tap.walletLevel, content.economy.tap);
  return moneyCents(settled.cashCents + perTap * BigInt(snapshot.pendingTaps));
}

export function selectIncomePerMinuteCents(snapshot: GameSnapshot, content: Content): MoneyCents {
  return businessIncomePerMinuteCents(snapshot.state, content.businesses);
}
