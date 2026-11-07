import {
  NO_EARNINGS,
  recordActivity,
  type ActivityEntry,
  type ActivityEvent,
  type Earned,
} from '@/domain/activity';
import type { StruckIncident } from '@/domain/business/risks';
import type { BusinessClosure } from '@/domain/business/treasury';
import { commandActivity } from '@/domain/commandActivity';
import type { GameCommand } from '@/domain/commands';
import type { GameState, IncomeBySource, ReturnSummary } from '@/domain/gameState';
import { moneyCents, type MoneyCents } from '@/domain/money';
import { totalIncome } from '@/domain/passiveIncome';

export type PassedTime = {
  readonly earnings: IncomeBySource;
  readonly absence: ReturnSummary | undefined;
  readonly closures: readonly BusinessClosure[];
  readonly incidents: readonly StruckIncident[];
};

type ActivityChange = {
  readonly command: GameCommand;
  readonly time: PassedTime;
  readonly before: GameState;
  readonly after: GameState;
  readonly commandCashCents: MoneyCents;
};

function incomeEvents(time: PassedTime): readonly ActivityEvent[] {
  const { absence, earnings } = time;
  if (absence !== undefined) {
    if (totalIncome(absence.earnings) === 0n) return [];
    return [{ kind: 'offline', ...absence }];
  }
  return earnings.dividends > 0n ? [{ kind: 'dividend', cashChangeCents: earnings.dividends }] : [];
}

function timeEvents(time: PassedTime): readonly ActivityEvent[] {
  const closures = time.closures.map((closure): ActivityEvent => ({
    kind: 'closure',
    assetId: closure.businessId,
    closedAtMs: closure.atMs,
  }));
  const incidents = time.incidents.map((incident): ActivityEvent => ({
    kind: 'incident',
    assetId: incident.businessId,
    incidentId: incident.incidentId,
    treasuryChangeCents: moneyCents(0n - incident.treasuryLossCents),
    insured: incident.insured,
  }));
  return [...incomeEvents(time), ...incidents, ...closures];
}

function earnedOf(change: ActivityChange): Earned {
  const { time, command } = change;
  const passive =
    time.absence === undefined
      ? { ...NO_EARNINGS, businessCents: time.earnings.businesses, rentCents: time.earnings.rent }
      : NO_EARNINGS;
  if (command.type !== 'TapBatch') return passive;
  return {
    ...passive,
    taps: command.taps,
    tapCents: moneyCents(passive.tapCents + change.commandCashCents),
  };
}

export function withCommittedActivity(change: ActivityChange): {
  state: GameState;
  entries: readonly ActivityEntry[];
} {
  const { after } = change;
  const events = [
    ...timeEvents(change.time),
    ...commandActivity(change.command, {
      before: change.before,
      after,
      cashChangeCents: change.commandCashCents,
    }),
  ];
  const recorded = recordActivity(after.activity, {
    earned: earnedOf(change),
    events,
    atMs: after.clock.simulationMs,
  });
  return { state: { ...after, activity: recorded.log }, entries: recorded.entries };
}
