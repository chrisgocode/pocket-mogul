import type { Content, Incident } from '@/content';
import { incidentImpact } from '@/domain/business/risks';
import { formatMoneyExact, type MoneyCents } from '@/domain/money';

export type IncidentStrike = {
  readonly businessId: string;
  readonly incidentId: string;
  readonly treasuryLossCents: MoneyCents;
  readonly insured: boolean;
};

const dayCount = (days: number) => (days === 1 ? '1 day' : `${days} days`);

const revenueDays = (days: number) => (days === 1 ? "a day's revenue" : `${days} days' revenue`);

function findIncident(content: Content, incidentId: string): Incident | undefined {
  return content.businesses
    .flatMap((business) => business.incidents)
    .find((incident) => incident.id === incidentId);
}

export function incidentEffectText(incident: Incident, insured: boolean): string {
  const { effect } = incident;
  if (effect.kind === 'treasury') return `Treasury loss of ${revenueDays(effect.revenueDays)}`;
  const impact = incidentImpact(effect, insured);
  const change = effect.kind === 'capacity' ? 'Capacity down' : 'Costs per customer up';
  return `${change} ${impact.percent}% for ${dayCount(impact.days)}`;
}

function strikeEffectText(incident: Incident, strike: IncidentStrike): string {
  if (incident.effect.kind !== 'treasury') return incidentEffectText(incident, strike.insured);
  return `Cost ${formatMoneyExact(strike.treasuryLossCents)} from its treasury`;
}

export function incidentStrikeText(content: Content, strike: IncidentStrike) {
  const business = content.businesses.find((each) => each.id === strike.businessId);
  const incident = findIncident(content, strike.incidentId);
  const name = business?.name ?? strike.businessId;
  if (incident === undefined) return { title: `${name}: incident`, detail: '' };
  const cover = strike.insured ? ' (insured)' : '';
  return {
    title: `${name}: ${incident.name}`,
    detail: `${strikeEffectText(incident, strike)}${cover}`,
  };
}
