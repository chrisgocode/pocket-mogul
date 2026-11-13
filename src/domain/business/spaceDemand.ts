import type { BusinessPricing } from './definition';
import type { ContractTerms } from './deliveryState';
import type { OwnedBusiness } from './owned';
import type { ActiveSpace, SpaceRules } from './spaceRules';

export type RunningSpace = { readonly rules: SpaceRules; readonly operation: ActiveSpace };

const PERCENT = 100n;
const BASIS_POINTS = 10_000n;

export function spaceRulesOf(pricing: BusinessPricing): SpaceRules | undefined {
  const { mechanic } = pricing.definition;
  return mechanic.kind === 'space' ? mechanic.space : undefined;
}

export function runningSpace(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): RunningSpace | undefined {
  const rules = spaceRulesOf(pricing);
  const operation = business.space;
  if (rules === undefined || operation.status !== 'active') return undefined;
  return { rules, operation };
}

export type SpaceDay = {
  readonly capacityBps: bigint;
  readonly memberBay: bigint;
  readonly contracts: readonly ContractTerms[];
};

export function spaceDay(running: RunningSpace): SpaceDay {
  const { rules, operation } = running;
  const cadence = rules.cadences[operation.cadence];
  const reusable = operation.boosters === 'installed';
  const boosters = PERCENT + BigInt(reusable ? rules.boosters.capacityPercent : 0);
  const launched = BigInt(cadence.capacityBps) * BigInt(cadence.launchedBps[operation.weather]);
  return {
    capacityBps: (launched * boosters) / (BASIS_POINTS * PERCENT),
    memberBay: operation.contracts.reduce(
      (total, contract) => total + BigInt(contract.parcelsPerDay),
      0n,
    ),
    contracts: operation.contracts,
  };
}
