import type { Business, Incident } from '@/content';
import { businessDayOf, type BusinessPricing } from '@/domain/business/definition';
import type { OwnedBusiness } from '@/domain/business/owned';
import { quoteInsurance, type InsuranceQuote } from '@/domain/business/risks';

import { incidentEffectText } from './incidentText';

const BASIS_POINTS = 10_000;
const BPS_PER_PERCENT = 100;

export type RiskOption = {
  readonly incident: Incident;
  readonly effect: string;
  readonly insurance: InsuranceQuote;
};

export type ActiveIncidentView = {
  readonly name: string;
  readonly effect: string;
  readonly daysLeft: number;
};

export type BusinessRisks = {
  readonly options: readonly RiskOption[];
  readonly active: ActiveIncidentView | undefined;
  readonly safeDaysLeft: number;
};

type RiskContext = {
  readonly business: Business;
  readonly owned: OwnedBusiness;
  readonly pricing: BusinessPricing;
  readonly simulationMs: number;
};

function activeEffect(capacityBps: number, costBps: number): string {
  if (capacityBps < BASIS_POINTS) {
    return `Capacity down ${(BASIS_POINTS - capacityBps) / BPS_PER_PERCENT}%`;
  }
  return `Costs per customer up ${(costBps - BASIS_POINTS) / BPS_PER_PERCENT}%`;
}

function activeIncident(context: RiskContext, today: number): ActiveIncidentView | undefined {
  const { incident } = context.owned;
  if (incident.status === 'none') return undefined;
  const named = context.business.incidents.find((each) => each.id === incident.incidentId);
  return {
    name: named?.name ?? incident.incidentId,
    effect: activeEffect(incident.capacityBps, incident.costBps),
    daysLeft: Math.max(0, incident.endsDay - today),
  };
}

export function selectBusinessRisks(context: RiskContext): BusinessRisks {
  const { owned, pricing, business } = context;
  const today = businessDayOf(context.simulationMs, pricing.rules);
  const safeUntil = owned.purchasedDay + pricing.rules.risks.safeDaysAfterPurchase;
  return {
    options: business.incidents.map((incident) => ({
      incident,
      effect: incidentEffectText(incident, false),
      insurance: quoteInsurance(owned, { ...pricing, category: incident.category }),
    })),
    active: activeIncident(context, today),
    safeDaysLeft: Math.max(0, safeUntil - today),
  };
}
