import type { TaxAbsence } from '@/domain/tax/types';
import type { Content } from '@/content';
import type { AbsenceIncident, GameState, IncomeBySource } from '@/domain/gameState';
import { moneyCents, type MoneyCents } from '@/domain/money';
import { totalIncome } from '@/domain/passiveIncome';

import { durationText } from './clockText';
import { incidentStrikeText } from './incidentText';

const INCOME_SOURCES: readonly { source: keyof IncomeBySource; label: string }[] = [
  { source: 'businesses', label: 'Businesses' },
  { source: 'rent', label: 'Rent' },
  { source: 'dividends', label: 'Dividends' },
];

export type IncidentLine = {
  readonly key: string;
  readonly title: string;
  readonly detail: string;
};

export type EarningsLine = { readonly label: string; readonly cents: MoneyCents };

export type ReturnSummaryView = {
  readonly taxes: TaxAbsence | undefined;
  readonly awayLabel: string;
  readonly creditedLabel: string;
  readonly capLabel: string;
  readonly capReached: boolean;
  readonly earnings: readonly EarningsLine[];
  readonly totalCents: MoneyCents;
  readonly adBonusCents: MoneyCents | undefined;
  readonly closedBusinesses: readonly string[];
  readonly incidents: readonly IncidentLine[];
};

function incidentLine(content: Content, incident: AbsenceIncident): IncidentLine {
  const text = incidentStrikeText(content, incident);
  return { key: `${incident.businessId}:${incident.atMs}`, title: text.title, detail: text.detail };
}

function earningsLines(earnings: IncomeBySource): EarningsLine[] {
  return INCOME_SOURCES.map(({ source, label }) => ({ label, cents: earnings[source] })).filter(
    (line) => line.cents > 0n,
  );
}

function adBonusCents(state: GameState): MoneyCents | undefined {
  const { offlineDouble } = state.adRewards;
  return offlineDouble.status === 'none' ? undefined : totalIncome(offlineDouble.bonus);
}

export function selectReturnSummary(
  state: GameState,
  content: Content,
): ReturnSummaryView | undefined {
  if (state.returnSummary.status === 'none') return undefined;
  const { summary } = state.returnSummary;
  const earnings = earningsLines(summary.earnings);
  return {
    taxes:
      state.tax.status !== 'notStarted' && state.tax.absence.status === 'pending'
        ? state.tax.absence.summary
        : undefined,
    awayLabel: durationText(summary.awayMs),
    creditedLabel: durationText(summary.creditedMs),
    capLabel: durationText(content.economy.time.offlineCapMs),
    capReached: summary.awayMs > summary.creditedMs,
    earnings,
    totalCents: moneyCents(earnings.reduce<bigint>((total, line) => total + line.cents, 0n)),
    adBonusCents: adBonusCents(state),
    closedBusinesses: summary.closures.map(
      (businessId) =>
        content.businesses.find((business) => business.id === businessId)?.name ?? businessId,
    ),
    incidents: summary.incidents.map((incident) => incidentLine(content, incident)),
  };
}
