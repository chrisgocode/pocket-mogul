import type { Content } from '@/content';
import type { AbsenceIncident } from '@/domain/gameState';
import { moneyCents } from '@/domain/money';

import { incidentStrikeText } from './incidentText';

export type IncidentLine = {
  readonly key: string;
  readonly title: string;
  readonly detail: string;
};

type IncidentGroup = { readonly first: AbsenceIncident; count: number; lossCents: bigint };

function groupKey(incident: AbsenceIncident): string {
  return `${incident.businessId}:${incident.incidentId}:${incident.insured ? 'insured' : 'uninsured'}`;
}

function groupLine(content: Content, group: IncidentGroup): IncidentLine {
  const { first, count } = group;
  const text = incidentStrikeText(content, {
    businessId: first.businessId,
    incidentId: first.incidentId,
    insured: first.insured,
    treasuryLossCents: moneyCents(group.lossCents),
  });
  return {
    key: `${first.businessId}:${first.atMs}`,
    title: count === 1 ? text.title : `${text.title} ×${count}`,
    detail: text.detail,
  };
}

export function incidentLines(
  content: Content,
  incidents: readonly AbsenceIncident[],
): IncidentLine[] {
  const groups = new Map<string, IncidentGroup>();
  for (const incident of incidents) {
    const group = groups.get(groupKey(incident));
    if (group === undefined) {
      groups.set(groupKey(incident), {
        first: incident,
        count: 1,
        lossCents: incident.treasuryLossCents,
      });
    } else {
      group.count += 1;
      group.lossCents += incident.treasuryLossCents;
    }
  }
  return [...groups.values()].map((group) => groupLine(content, group));
}
