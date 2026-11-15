import type { Content } from '@/content';
import type { ActivityEntry } from '@/domain/activity';
import { moneyCents } from '@/domain/money';

import { activityRow, type ActivityRow } from './activityView';

type IncidentEntry = Extract<ActivityEntry, { kind: 'incident' }>;

type Fold = { readonly entry: ActivityEntry; count: number; changeCents: bigint };

function foldKey(entry: IncidentEntry): string {
  return [entry.simulationMs, entry.assetId, entry.incidentId, String(entry.insured)].join(':');
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

function addIncident(entry: IncidentEntry, folds: { list: Fold[]; byKey: Map<string, Fold> }) {
  const fold = folds.byKey.get(foldKey(entry));
  if (fold === undefined) {
    const created: Fold = { entry, count: 1, changeCents: entry.treasuryChangeCents };
    folds.list.push(created);
    folds.byKey.set(foldKey(entry), created);
    return;
  }
  fold.count += 1;
  fold.changeCents += entry.treasuryChangeCents;
}

export function activityRows(entries: readonly ActivityEntry[], content: Content): ActivityRow[] {
  const folds = { list: [] as Fold[], byKey: new Map<string, Fold>() };
  for (const entry of entries) {
    if (entry.kind === 'incident') addIncident(entry, folds);
    else folds.list.push({ entry, count: 1, changeCents: 0n });
  }
  return folds.list.map((fold) => foldedRow(fold, content));
}
