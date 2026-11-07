import { drawInt, type InclusiveRange } from '@/domain/marketRandom';
import { moneyCents, type MoneyCents } from '@/domain/money';

import { premiumCents } from './core';
import {
  INCIDENT_CATEGORIES,
  type BusinessPricing,
  type IncidentCategory,
  type IncidentEffect,
  type IncidentType,
} from './definition';
import {
  NO_INCIDENT,
  type ActiveIncident,
  type Insurance,
  type OwnedBusiness,
  type PolicyStatus,
} from './owned';

export type StruckIncident = {
  readonly businessId: string;
  readonly incidentId: string;
  readonly atMs: number;
  readonly treasuryLossCents: MoneyCents;
  readonly insured: boolean;
};

export type DayStart = {
  readonly pricing: BusinessPricing;
  readonly seed: string;
  readonly day: number;
};

export type StartedDay = {
  readonly business: OwnedBusiness;
  readonly incidents: readonly StruckIncident[];
};

type LastingEffect = Exclude<IncidentEffect, { kind: 'treasury' }>;

const PERCENT = 100n;
const BASIS_POINTS = 10_000;
const BPS_PER_PERCENT = 100;
const INSURED_SHARE = 2;
const SHORTEST_INCIDENT_DAYS = 1;
const INCIDENT_STREAM = 'incident';
const ROLL: InclusiveRange = [0, BASIS_POINTS - 1];

function rolledIncident(business: OwnedBusiness, start: DayStart): IncidentType | undefined {
  const roll = drawInt(
    { seed: start.seed, tick: start.day, scope: business.definitionId, stream: INCIDENT_STREAM },
    ROLL,
  );
  const { incidents } = start.pricing.definition;
  const reached = incidents.map((_, index) =>
    incidents.slice(0, index + 1).reduce((total, each) => total + each.chanceBps, 0),
  );
  return incidents[reached.findIndex((threshold) => roll < threshold)];
}

function canStrike(business: OwnedBusiness, start: DayStart): boolean {
  if (business.status === 'closed' || business.incident.status === 'active') return false;
  const daysOwned = start.day - business.purchasedDay;
  return daysOwned >= start.pricing.rules.risks.safeDaysAfterPurchase;
}

function withoutEndedIncident(business: OwnedBusiness, day: number): OwnedBusiness {
  const { incident } = business;
  if (incident.status === 'none' || incident.endsDay > day) return business;
  return { ...business, incident: NO_INCIDENT };
}

const softened = (amount: number, insured: boolean) =>
  insured ? Math.floor(amount / INSURED_SHARE) : amount;

export function incidentImpact(effect: LastingEffect, insured: boolean) {
  return {
    percent: softened(effect.percent, insured),
    days: Math.max(SHORTEST_INCIDENT_DAYS, softened(effect.days, insured)),
  };
}

function lastingIncident(
  incident: { readonly id: string; readonly effect: LastingEffect },
  strike: { readonly insured: boolean; readonly day: number },
): ActiveIncident {
  const { effect } = incident;
  const impact = incidentImpact(effect, strike.insured);
  const changeBps = impact.percent * BPS_PER_PERCENT;
  return {
    status: 'active',
    incidentId: incident.id,
    endsDay: strike.day + impact.days,
    capacityBps: effect.kind === 'capacity' ? BASIS_POINTS - changeBps : BASIS_POINTS,
    costBps: effect.kind === 'cost' ? BASIS_POINTS + changeBps : BASIS_POINTS,
  };
}

function treasuryLossCents(
  business: OwnedBusiness,
  loss: { readonly pricing: BusinessPricing; readonly revenueDays: number; insured: boolean },
): bigint {
  const { definition, rules } = loss.pricing;
  const full = definition.catalogRevenuePerDayCents * BigInt(loss.revenueDays);
  const cap = (business.treasuryCents * BigInt(rules.risks.treasuryLossCapPercent)) / PERCENT;
  const capped = full < cap ? full : cap;
  if (!loss.insured) return capped;
  return capped - (capped * BigInt(rules.risks.coveredLossPercent)) / PERCENT;
}

function struck(business: OwnedBusiness, incident: IncidentType, start: DayStart): StartedDay {
  const insured = business.insurance[incident.category] === 'active';
  const { effect } = incident;
  const lossCents =
    effect.kind === 'treasury'
      ? treasuryLossCents(business, {
          pricing: start.pricing,
          revenueDays: effect.revenueDays,
          insured,
        })
      : 0n;
  const hit: OwnedBusiness =
    effect.kind === 'treasury'
      ? { ...business, treasuryCents: moneyCents(business.treasuryCents - lossCents) }
      : {
          ...business,
          incident: lastingIncident({ id: incident.id, effect }, { insured, day: start.day }),
        };
  const record: StruckIncident = {
    businessId: business.definitionId,
    incidentId: incident.id,
    atMs: start.day * start.pricing.rules.dayMs,
    treasuryLossCents: moneyCents(lossCents),
    insured,
  };
  return { business: hit, incidents: [record] };
}

type Renewal = { readonly insurance: Insurance; readonly committedCents: bigint };

export function renewedInsurance(
  business: OwnedBusiness,
  renewal: { readonly pricing: BusinessPricing; readonly renewing: readonly PolicyStatus[] },
): OwnedBusiness {
  const premium = premiumCents(renewal.pricing);
  const renewed = INCIDENT_CATEGORIES.reduce<Renewal>(
    (sofar, category) => {
      const status = business.insurance[category];
      if (!renewal.renewing.includes(status)) return sofar;
      const affordable = business.treasuryCents >= sofar.committedCents + premium;
      const next: PolicyStatus = affordable ? 'active' : 'lapsed';
      return {
        insurance: { ...sofar.insurance, [category]: next },
        committedCents: sofar.committedCents + (affordable ? premium : 0n),
      };
    },
    { insurance: business.insurance, committedCents: 0n },
  );
  return { ...business, insurance: renewed.insurance };
}

export function startBusinessDay(business: OwnedBusiness, start: DayStart): StartedDay {
  const current = withoutEndedIncident(business, start.day);
  if (current.status === 'closed') return { business: current, incidents: [] };
  const incident = canStrike(current, start) ? rolledIncident(current, start) : undefined;
  const day =
    incident === undefined
      ? { business: current, incidents: [] }
      : struck(current, incident, start);
  const renewing: readonly PolicyStatus[] = ['active'];
  return { ...day, business: renewedInsurance(day.business, { pricing: start.pricing, renewing }) };
}

export type InsuranceQuote =
  | { readonly status: 'locked'; readonly category: IncidentCategory; readonly unlockStage: number }
  | {
      readonly status: 'available';
      readonly category: IncidentCategory;
      readonly policy: PolicyStatus;
      readonly premiumCents: MoneyCents;
    };

export function quoteInsurance(
  business: OwnedBusiness,
  quoting: BusinessPricing & { readonly category: IncidentCategory },
): InsuranceQuote {
  const { category, rules } = quoting;
  const unlockStage = rules.risks.insuranceFromStage;
  if (business.stage < unlockStage) return { status: 'locked', category, unlockStage };
  return {
    status: 'available',
    category,
    policy: business.insurance[category],
    premiumCents: premiumCents(quoting),
  };
}
