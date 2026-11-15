import type { Content } from '@/content';
import type { ActivityEntry } from '@/domain/activity';
import { moneyCents } from '@/domain/money';

import { activityRow, type ActivityRow } from './activityView';

type IncidentEntry = Extract<ActivityEntry, { kind: 'incident' }>;

type Fold = { readonly entry: ActivityEntry; count: number; changeCents: bigint };

function sameStrike(fold: Fold | undefined, entry: IncidentEntry): fold is Fold {
  if (fold === undefined || fold.entry.kind !== 'incident') return false;
  const first = fold.entry;
  return (
    first.simulationMs === entry.simulationMs &&
    first.assetId === entry.assetId &&
    first.incidentId === entry.incidentId &&
    first.insured === entry.insured
  );
}

function foldedRow(fold: Fold, content: Content): ActivityRow {
  const { entry, count } = fold;
  if (entry.kind !== 'incident' || count === 1) return activityRow(entry, content);
  const total = { ...entry, treasuryChangeCents: moneyCents(fold.changeCents) };
  const row = activityRow(total, content);
  return {
    key: row.key,
    title: `${row.title} ×${count}`,
    detail: row.detail,
    cashChangeCents: row.cashChangeCents,
  };
}

export function activityRows(entries: readonly ActivityEntry[], content: Content): ActivityRow[] {
  const folds: Fold[] = [];
  for (const entry of entries) {
    const last = folds.at(-1);
    if (entry.kind === 'incident' && sameStrike(last, entry)) {
      last.count += 1;
      last.changeCents += entry.treasuryChangeCents;
    } else {
      const changeCents = entry.kind === 'incident' ? entry.treasuryChangeCents : 0n;
      folds.push({ entry, count: 1, changeCents });
    }
  }
  return folds.map((fold) => foldedRow(fold, content));
}
