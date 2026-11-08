import { advanceTaxTime } from './taxTime';
import type { Content } from '@/content';
import type { GameState } from '@/domain/gameState';
import { moneyCents, type MoneyCents } from '@/domain/money';
import {
  businessIncomePerMinuteCents,
  passiveIncomePerMinuteCents,
  rentIncomePerMinuteCents,
} from '@/domain/passiveIncome';
import { tapPayoutCents } from '@/domain/tapping';

import { passiveEconomy } from './economy';
import type { GameSnapshot } from './game';

export function stateWithUnsavedIncome(snapshot: GameSnapshot, content: Content): GameState {
  const { state } = snapshot;
  return advanceTaxTime(state, {
    elapsedMs: snapshot.unsavedElapsedMs,
    wallMs: state.clock.lastWallCheckpointMs,
    content,
  }).state;
}

export function selectCashCents(snapshot: GameSnapshot, content: Content): MoneyCents {
  const settled = stateWithUnsavedIncome(snapshot, content);
  const perTap = tapPayoutCents(settled.tap.walletLevel, content.economy.tap);
  const boostExtra = BigInt(content.economy.boost.tapMultiplier - 1);
  const pendingCents =
    perTap * BigInt(snapshot.pendingTaps) +
    perTap * boostExtra * BigInt(snapshot.pendingBoostedTaps);
  return moneyCents(settled.cashCents + pendingCents);
}

export function selectPassiveIncomePerMinuteCents(
  snapshot: GameSnapshot,
  content: Content,
): MoneyCents {
  return passiveIncomePerMinuteCents(snapshot.state, passiveEconomy(content));
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
