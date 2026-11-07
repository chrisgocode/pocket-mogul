import type { Content } from '@/content';
import { dividendPerHourCents } from '@/domain/dividends';
import type { GameState } from '@/domain/gameState';
import { moneyCents, type MoneyCents } from '@/domain/money';
import { businessIncomePerMinuteCents, rentIncomePerMinuteCents } from '@/domain/passiveIncome';
import { netWorthBreakdown, type NetWorthBreakdown } from '@/domain/progression';

import { stateWithUnsavedIncome } from './cashView';
import { passiveEconomy, progressRules } from './economy';
import type { GameSnapshot } from './game';
import { selectHoldings, type Holdings } from './holdingsView';

export type Worth = NetWorthBreakdown & { readonly assetsCents: MoneyCents };

export type IncomeRate = { readonly cents: MoneyCents; readonly per: 'minute' | 'hour' };

export type IncomeSource = {
  readonly source: string;
  readonly rate: IncomeRate | undefined;
  readonly lifetimeCents: MoneyCents;
};

export type PortfolioView = {
  readonly worth: Worth;
  readonly income: readonly IncomeSource[];
  readonly holdings: Holdings;
  readonly results: { readonly realizedCents: MoneyCents; readonly unrealizedCents: MoneyCents };
};

function dividendsPerHourCents(state: GameState, content: Content): MoneyCents {
  return moneyCents(
    state.positions.reduce<bigint>((total, position) => {
      const stock = content.stocks.find((listed) => listed.id === position.instrumentId);
      if (stock === undefined) return total;
      return total + dividendPerHourCents(position.quantity, stock.dividendCentsPerSharePerHour);
    }, 0n),
  );
}

function incomeSources(state: GameState, content: Content): IncomeSource[] {
  const economy = passiveEconomy(content);
  const { income } = state;
  return [
    { source: 'Taps', rate: undefined, lifetimeCents: state.lifetimeTapEarningsCents },
    {
      source: 'Businesses',
      rate: { cents: businessIncomePerMinuteCents(state, economy), per: 'minute' },
      lifetimeCents: income.businessEarningsCents,
    },
    {
      source: 'Rent',
      rate: { cents: rentIncomePerMinuteCents(state, economy), per: 'minute' },
      lifetimeCents: income.rentEarningsCents,
    },
    {
      source: 'Dividends',
      rate: { cents: dividendsPerHourCents(state, content), per: 'hour' },
      lifetimeCents: income.dividendEarningsCents,
    },
  ];
}

function worthOf(state: GameState, content: Content): Worth {
  const breakdown = netWorthBreakdown(state, progressRules(content));
  return {
    ...breakdown,
    assetsCents: moneyCents(breakdown.netWorthCents - breakdown.cashCents),
  };
}

export function selectPortfolio(snapshot: GameSnapshot, content: Content): PortfolioView {
  const state = stateWithUnsavedIncome(snapshot, content);
  const holdings = selectHoldings(state, content);
  const sum = (pick: (holding: Holdings['positions'][number]) => bigint) =>
    moneyCents(holdings.positions.reduce<bigint>((total, held) => total + pick(held), 0n));
  return {
    worth: worthOf(state, content),
    income: incomeSources(state, content),
    holdings,
    results: {
      realizedCents: sum((held) => held.realizedCents),
      unrealizedCents: sum((held) => held.unrealizedCents),
    },
  };
}
