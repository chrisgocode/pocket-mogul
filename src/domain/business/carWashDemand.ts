import {
  WASH_PACKAGES,
  type CarWashRules,
  type WashPackage,
  type WashPackageRule,
} from './carWashRules';
import type { ActiveCarWash } from './carWashState';
import type { BusinessPricing } from './definition';
import type { OwnedBusiness } from './owned';

export type RunningCarWash = { readonly rules: CarWashRules; readonly operation: ActiveCarWash };

export type PackageShares = Readonly<Record<WashPackage, number>>;

const PERCENT = 100n;
const BASIS_POINTS = 10_000n;

export function carWashRulesOf(pricing: BusinessPricing): CarWashRules | undefined {
  const { mechanic } = pricing.definition;
  return mechanic.kind === 'car_wash' ? mechanic.carWash : undefined;
}

export function runningCarWash(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): RunningCarWash | undefined {
  const rules = carWashRulesOf(pricing);
  const operation = business.carWash;
  if (rules === undefined || operation.status !== 'active') return undefined;
  return { rules, operation };
}

export function packageRule(rules: CarWashRules, washPackage: WashPackage): WashPackageRule {
  return washPackage === 'detailing' ? rules.detailing : rules.packages[washPackage];
}

function isOffered(operation: ActiveCarWash, washPackage: WashPackage): boolean {
  if (washPackage === 'basic') return true;
  if (washPackage === 'detailing') return operation.detailing === 'installed';
  return operation.packages[washPackage] === 'offered';
}

function defaultShare(running: RunningCarWash, washPackage: WashPackage): number {
  const { rules, operation } = running;
  const detailingShare = operation.detailing === 'installed' ? rules.detailing.sharePercent : 0;
  if (washPackage === 'detailing') return detailingShare;
  const share = rules.packages[washPackage].sharePercent;
  return washPackage === 'basic' ? share - detailingShare : share;
}

type Folding = { readonly shares: Partial<Record<WashPackage, number>>; readonly carried: number };

export function packageShares(running: RunningCarWash): PackageShares {
  const folded = WASH_PACKAGES.reduceRight<Folding>(
    (sofar, washPackage) => {
      const share = defaultShare(running, washPackage) + sofar.carried;
      const offered = isOffered(running.operation, washPackage);
      return {
        shares: { ...sofar.shares, [washPackage]: offered ? share : 0 },
        carried: offered ? 0 : share,
      };
    },
    { shares: {}, carried: 0 },
  );
  const { shares } = folded;
  return {
    basic: shares.basic ?? 0,
    deluxe: shares.deluxe ?? 0,
    ultimate: shares.ultimate ?? 0,
    detailing: shares.detailing ?? 0,
  };
}

function averageBps(running: RunningCarWash, field: 'priceBps' | 'bayBps'): bigint {
  const shares = packageShares(running);
  const total = WASH_PACKAGES.reduce<bigint>(
    (sum, washPackage) =>
      sum + BigInt(shares[washPackage]) * BigInt(packageRule(running.rules, washPackage)[field]),
    0n,
  );
  return total / PERCENT;
}

export type CarWashDay = {
  readonly demandBps: bigint;
  readonly priceBps: bigint;
  readonly bayBps: bigint;
  readonly memberBay: bigint;
  readonly memberFeesCents: bigint;
};

export function membershipFeeCents(running: RunningCarWash, pricing: BusinessPricing): bigint {
  const levelBps = BigInt(pricing.rules.priceBps[running.operation.membershipLevel]);
  return (running.rules.memberships.feeCents * levelBps) / BASIS_POINTS;
}

function memberBayOf(rules: CarWashRules, members: number): bigint {
  return (BigInt(members) * BigInt(rules.memberships.bayBps)) / BASIS_POINTS;
}

export function carWashDay(running: RunningCarWash, pricing: BusinessPricing): CarWashDay {
  const { rules, operation } = running;
  return {
    demandBps: BigInt(rules.weatherDemandBps[operation.weather]),
    priceBps: averageBps(running, 'priceBps'),
    bayBps: averageBps(running, 'bayBps'),
    memberBay: memberBayOf(rules, operation.members),
    memberFeesCents: BigInt(operation.members) * membershipFeeCents(running, pricing),
  };
}
