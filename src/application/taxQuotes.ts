import {
  businessTaxSource,
  collectibleTaxBasis,
  instrumentTaxBasis,
  propertyTaxBasis,
} from '@/domain/tax/sources';
import type { Content } from '@/content';
import type { GameCommand } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';
import { moneyCents, type MoneyCents } from '@/domain/money';
import { currentTaxLines } from '@/domain/tax/assessment';

import { applyCommand } from './commandHandlers';

export type TaxQuote = {
  readonly basisCents: MoneyCents;
  readonly gainCents: MoneyCents;
  readonly taxChangeCents: MoneyCents;
  readonly cashChangeCents: MoneyCents;
};

function capitalProfit(state: GameState): bigint {
  return state.tax.status === 'active' ? (state.tax.pools['capital']?.profitCents ?? 0n) : 0n;
}

function dailyTax(state: GameState): bigint {
  return state.tax.status === 'active'
    ? currentTaxLines(state.tax).reduce((sum, line) => sum + line.taxCents, 0n)
    : 0n;
}

function commandBasisKey(command: GameCommand): string {
  if ('businessId' in command) return businessTaxSource(command.businessId);
  if ('propertyId' in command) return propertyTaxBasis(command.propertyId);
  if (command.type === 'SellCollectible') return collectibleTaxBasis(command.pieceId);
  if (command.type !== 'ExecuteTrade') return '';
  return instrumentTaxBasis(command.assetId);
}

function basis(state: GameState, key: string): bigint {
  return state.tax.status === 'active' ? (state.tax.basis[key] ?? 0n) : 0n;
}

export function quoteTaxCommand(
  state: GameState,
  order: { command: GameCommand; content: Content },
): TaxQuote | undefined {
  const result = applyCommand(
    state,
    { type: order.command.type, payload: order.command },
    order.content,
  );
  if (!result.ok) return undefined;
  const key = commandBasisKey(order.command);
  return {
    basisCents: moneyCents(basis(state, key) - basis(result.state, key)),
    gainCents: moneyCents(capitalProfit(result.state) - capitalProfit(state)),
    taxChangeCents: moneyCents(dailyTax(result.state) - dailyTax(state)),
    cashChangeCents: result.cashChangeCents,
  };
}
