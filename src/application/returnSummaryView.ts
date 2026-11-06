import type { Content } from '@/content';
import type { GameState, IncomeBySource } from '@/domain/gameState';
import { moneyCents, type MoneyCents } from '@/domain/money';

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;

const INCOME_SOURCES: readonly { source: keyof IncomeBySource; label: string }[] = [
  { source: 'businesses', label: 'Businesses' },
  { source: 'rent', label: 'Rent' },
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

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / MS_PER_MINUTE);
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

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
    awayLabel: formatDuration(summary.awayMs),
    creditedLabel: formatDuration(summary.creditedMs),
    capLabel: formatDuration(content.economy.time.offlineCapMs),
    capReached: summary.awayMs > summary.creditedMs,
    earnings,
    totalCents: moneyCents(earnings.reduce<bigint>((total, line) => total + line.cents, 0n)),
  };
}
