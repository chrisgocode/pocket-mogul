import type { Content } from '@/content';
import type { GameState, IncomeBySource } from '@/domain/gameState';
import { moneyCents, type MoneyCents } from '@/domain/money';

import { durationText } from './clockText';

const INCOME_SOURCES: readonly { source: keyof IncomeBySource; label: string }[] = [
  { source: 'businesses', label: 'Businesses' },
  { source: 'rent', label: 'Rent' },
  { source: 'dividends', label: 'Dividends' },
];

export type EarningsLine = { readonly label: string; readonly cents: MoneyCents };

export type ReturnSummaryView = {
  readonly awayLabel: string;
  readonly creditedLabel: string;
  readonly capLabel: string;
  readonly capReached: boolean;
  readonly earnings: readonly EarningsLine[];
  readonly totalCents: MoneyCents;
};

function earningsLines(earnings: IncomeBySource): EarningsLine[] {
  return INCOME_SOURCES.map(({ source, label }) => ({ label, cents: earnings[source] })).filter(
    (line) => line.cents > 0n,
  );
}

export function selectReturnSummary(
  state: GameState,
  content: Content,
): ReturnSummaryView | undefined {
  if (state.returnSummary.status === 'none') return undefined;
  const { summary } = state.returnSummary;
  const earnings = earningsLines(summary.earnings);
  return {
    awayLabel: durationText(summary.awayMs),
    creditedLabel: durationText(summary.creditedMs),
    capLabel: durationText(content.economy.time.offlineCapMs),
    capReached: summary.awayMs > summary.creditedMs,
    earnings,
    totalCents: moneyCents(earnings.reduce<bigint>((total, line) => total + line.cents, 0n)),
  };
}
