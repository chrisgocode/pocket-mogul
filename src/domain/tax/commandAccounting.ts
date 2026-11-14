import { requireTaxBasis } from './basis';

import {
  AD_REWARD_TAX_SOURCE,
  businessTaxSource,
  collectibleTaxBasis,
  instrumentTaxBasis,
  propertyTaxBasis,
} from '@/domain/tax/sources';
import { checkTrade, positionOf } from '@/domain/trades';
import type { TradeEconomy } from '@/domain/trades';
import type { TaxRules } from './types';

import type { CommandResult, GameCommand } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';
import { moneyCents } from '@/domain/money';
import { recoverTaxDebt } from '@/domain/tax/collection';
import { recordTaxReceipt, recordWholeTaxReceipt } from '@/domain/tax/ledger';
import { TAX_SHARES } from '@/domain/tax/types';

export type TaxCommandEconomy = {
  readonly dayMs: number;
  readonly trades: TradeEconomy;
  readonly rules: TaxRules | undefined;
};

function setBasis(state: GameState, change: { source: string; amount: bigint }): GameState {
  if (state.tax.status !== 'active') return state;
  return {
    ...state,
    tax: {
      ...state.tax,
      basis: { ...state.tax.basis, [change.source]: moneyCents(change.amount) },
    },
  };
}

function capitalReceipt(
  state: GameState,
  receipt: { gross: bigint; net: bigint; basis: bigint },
): GameState {
  if (state.tax.status !== 'active') return state;
  return {
    ...state,
    tax: recordWholeTaxReceipt(state.tax, {
      source: 'capital',
      grossCents: receipt.gross,
      profitCents: receipt.net - receipt.basis,
    }),
  };
}

function businessTransfer(
  state: GameState,
  step: {
    before: GameState;
    command: Extract<GameCommand, { type: 'DepositToTreasury' | 'WithdrawFromTreasury' }>;
  },
): GameState {
  const source = businessTaxSource(step.command.businessId);
  const change = state.cashCents - step.before.cashCents;
  const basis = state.tax.status === 'active' ? basisBalance(state, source) : 0n;
  const next = basis - change;
  if (next >= 0n) return setBasis(state, { source, amount: next });
  return capitalReceipt(setBasis(state, { source, amount: 0n }), {
    gross: 0n - next,
    net: 0n - next,
    basis: 0n,
  });
}

function businessCommand(
  state: GameState,
  step: { before: GameState; command: GameCommand; economy: TaxCommandEconomy },
): GameState {
  const { command, before } = step;
  if (!('businessId' in command) || state.tax.status !== 'active') return state;
  const source = businessTaxSource(command.businessId);
  if (command.type === 'DepositToTreasury' || command.type === 'WithdrawFromTreasury')
    return businessTransfer(state, { before, command });
  if (command.type === 'BuyBusiness')
    return setBasis(state, { source, amount: before.cashCents - state.cashCents });
  const basis = basisBalance(state, source);
  if (command.type === 'SellBusiness') {
    const proceeds = state.cashCents - before.cashCents;
    return capitalReceipt(setBasis(state, { source, amount: 0n }), {
      gross: proceeds,
      net: proceeds,
      basis,
    });
  }
  if (command.type === 'GoPublic') return state;
  return businessOperatingCommand(state, step);
}

function businessOperatingCommand(
  state: GameState,
  step: { before: GameState; command: GameCommand; economy: TaxCommandEconomy },
): GameState {
  const { command, before } = step;
  if (!('businessId' in command) || state.tax.status !== 'active') return state;
  const source = businessTaxSource(command.businessId);
  const basis = basisBalance(state, source);
  const old = before.businesses.find((b) => b.definitionId === command.businessId);
  const next = state.businesses.find((b) => b.definitionId === command.businessId);
  if (old === undefined || next === undefined) return state;
  const profit =
    next.treasuryCents - old.treasuryCents + next.capitalizedSpendCents - old.capitalizedSpendCents;
  const shares = old.listing.status === 'listed' ? old.listing.sharesHeld : TAX_SHARES;
  const denominator = TAX_SHARES * BigInt(step.economy.dayMs);
  const tax = recordTaxReceipt(state.tax, {
    source,
    denominator,
    grossNumerator: 0n,
    profitNumerator: ((profit * denominator) / TAX_SHARES) * shares,
  });
  const ownerProfit = poolProfit(tax, source) - poolProfit(state.tax, source);
  return setBasis({ ...state, tax }, { source, amount: basis + ownerProfit });
}

function propertyCommand(
  state: GameState,
  step: { before: GameState; command: GameCommand },
): GameState {
  const { command, before } = step;
  if (!('propertyId' in command) || state.tax.status !== 'active') return state;
  const source = propertyTaxBasis(command.propertyId);
  if (command.type === 'BuyProperty')
    return setBasis(state, { source, amount: before.cashCents - state.cashCents });
  const basis = basisBalance(state, source);
  if (command.type === 'UpgradeProperty')
    return setBasis(state, { source, amount: basis + before.cashCents - state.cashCents });
  if (command.type !== 'SellProperty') return state;
  const proceeds = state.cashCents - before.cashCents;
  return capitalReceipt(setBasis(state, { source, amount: 0n }), {
    gross: proceeds,
    net: proceeds,
    basis,
  });
}

function collectibleCommand(
  state: GameState,
  step: { before: GameState; command: GameCommand },
): GameState {
  const { command, before } = step;
  if (state.tax.status !== 'active') return state;
  if (command.type === 'BuyCollectible')
    return setBasis(state, {
      source: collectibleTaxBasis(command.pieceId),
      amount: before.cashCents - state.cashCents,
    });
  if (command.type !== 'SellCollectible') return state;
  const source = collectibleTaxBasis(command.pieceId);
  const proceeds = state.cashCents - before.cashCents;
  return capitalReceipt(setBasis(state, { source, amount: 0n }), {
    gross: proceeds,
    net: proceeds,
    basis: basisBalance(state, source),
  });
}

function tradeCommand(
  state: GameState,
  step: {
    before: GameState;
    command: Extract<GameCommand, { type: 'ExecuteTrade' }>;
    economy: TaxCommandEconomy;
  },
): GameState {
  if (state.tax.status !== 'active') return state;
  const { command, before } = step;
  const source = instrumentTaxBasis(command.assetId);
  const position = positionOf(before, command.assetId);
  const basis =
    position.quantity === 0n ? (state.tax.basis[source] ?? 0n) : requireTaxBasis(state.tax, source);
  const cash = state.cashCents - before.cashCents;
  if (command.side === 'buy') return setBasis(state, { source, amount: basis - cash });
  const quantity = before.positions.find((p) => p.instrumentId === command.assetId)!.quantity;
  const allocated = command.quantity === quantity ? basis : (basis * command.quantity) / quantity;
  const settled = setBasis(state, { source, amount: basis - allocated });
  const quoted = checkTrade(before, { ...command, economy: step.economy.trades });
  return capitalReceipt(settled, {
    gross: quoted.ok ? quoted.quote.notionalCents : cash,
    net: cash,
    basis: allocated,
  });
}

function rewardCommand(state: GameState, before: GameState): GameState {
  const paid = state.cashCents - before.cashCents;
  if (state.tax.status !== 'active' || paid <= 0n) return state;
  return {
    ...state,
    tax: recordWholeTaxReceipt(state.tax, {
      source: AD_REWARD_TAX_SOURCE,
      grossCents: paid,
      profitCents: paid,
    }),
  };
}

function classified(
  state: GameState,
  step: { before: GameState; command: GameCommand; economy: TaxCommandEconomy },
): GameState {
  if (step.command.type === 'ClaimAdReward') return rewardCommand(state, step.before);
  if (step.command.type === 'ExecuteTrade')
    return tradeCommand(state, {
      before: step.before,
      command: step.command,
      economy: step.economy,
    });
  return collectibleCommand(propertyCommand(businessCommand(state, step), step), step);
}

export function withCommandTax(
  before: GameState,
  change: { result: CommandResult; command: GameCommand; economy: TaxCommandEconomy },
): CommandResult {
  const { result, command, economy } = change;
  if (!result.ok || result.state.tax.status !== 'active') return result;
  const recorded = classified(result.state, { before, command, economy });
  const rules = economy.rules;
  const eligible = result.cashChangeCents > 0n && command.type !== 'TapBatch';
  const recovered =
    rules === undefined || !eligible
      ? recorded
      : recoverTaxDebt(recorded, { incomingCents: result.cashChangeCents, rules });
  return {
    ...result,
    state: recovered,
    cashChangeCents: moneyCents(recovered.cashCents - before.cashCents),
  };
}

function basisBalance(state: GameState, source: string): bigint {
  return state.tax.status === 'active' ? requireTaxBasis(state.tax, source) : 0n;
}

function poolProfit(tax: GameState['tax'], source: string): bigint {
  return tax.status === 'active' ? (tax.pools[source]?.profitCents ?? 0n) : 0n;
}
