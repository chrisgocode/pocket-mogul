import type { BusinessPricing } from './definition';
import type { DeliveryRules } from './deliveryRules';
import type { ActiveDelivery, ContractTerms } from './deliveryState';
import type { OwnedBusiness } from './owned';

export type RunningDelivery = { readonly rules: DeliveryRules; readonly operation: ActiveDelivery };

export type DeliveryDay = {
  readonly capacityBps: bigint;
  readonly memberBay: bigint;
  readonly efficiencyLevel: number;
  readonly workingUnits: number;
  readonly contracts: readonly ContractTerms[];
};

export type ServedContract = { readonly delivered: number; readonly missed: number };

export type ContractsServed = {
  readonly contracts: readonly ServedContract[];
  readonly delivered: number;
  readonly missed: number;
  readonly revenueCents: bigint;
  readonly penaltiesCents: bigint;
};

const PERCENT = 100n;
const BASIS_POINTS = 10_000n;

export function deliveryRulesOf(pricing: BusinessPricing): DeliveryRules | undefined {
  const { mechanic } = pricing.definition;
  return mechanic.kind === 'delivery' ? mechanic.delivery : undefined;
}

export function runningDelivery(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): RunningDelivery | undefined {
  const rules = deliveryRulesOf(pricing);
  const operation = business.delivery;
  if (rules === undefined || operation.status !== 'active') return undefined;
  return { rules, operation };
}

export function crewedVans(business: OwnedBusiness, rules: DeliveryRules): number {
  return Math.min(business.units, business.staff.operations * rules.vansPerDriver);
}

function parcelsDue(contracts: readonly ContractTerms[]): number {
  return contracts.reduce((total, contract) => total + contract.parcelsPerDay, 0);
}

function capacityBpsOf(business: OwnedBusiness, running: RunningDelivery): bigint {
  const { rules, operation } = running;
  const routes = PERCENT + BigInt(rules.routePlannerPercent * business.levels.efficiency);
  const hubPercent = operation.sortingHub === 'installed' ? rules.sortingHub.capacityPercent : 0;
  const hub = PERCENT + BigInt(hubPercent);
  return (BASIS_POINTS * routes * hub) / (PERCENT * PERCENT);
}

export function deliveryDay(business: OwnedBusiness, running: RunningDelivery): DeliveryDay {
  const { contracts } = running.operation;
  return {
    capacityBps: capacityBpsOf(business, running),
    memberBay: BigInt(parcelsDue(contracts)),
    efficiencyLevel: 0,
    workingUnits: crewedVans(business, running.rules),
    contracts,
  };
}

type Serving = ContractsServed & { readonly left: number };

export function serveContracts(
  contracts: readonly ContractTerms[],
  parcels: bigint,
): ContractsServed {
  const start: Serving = {
    contracts: [],
    delivered: 0,
    missed: 0,
    revenueCents: 0n,
    penaltiesCents: 0n,
    left: Number(parcels),
  };
  const { left: _left, ...served } = contracts.reduce<Serving>((sofar, contract) => {
    const delivered = Math.min(contract.parcelsPerDay, sofar.left);
    const missed = contract.parcelsPerDay - delivered;
    return {
      contracts: [...sofar.contracts, { delivered, missed }],
      delivered: sofar.delivered + delivered,
      missed: sofar.missed + missed,
      revenueCents: sofar.revenueCents + BigInt(delivered) * contract.rateCents,
      penaltiesCents: sofar.penaltiesCents + BigInt(missed) * contract.penaltyCents,
      left: sofar.left - delivered,
    };
  }, start);
  return served;
}
