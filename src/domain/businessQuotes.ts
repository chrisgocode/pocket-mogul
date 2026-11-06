import type { OwnedBusiness } from './gameState';
import { divideRoundingUp, moneyCents, type MoneyCents } from './money';

export type BusinessDefinition = {
  readonly id: string;
  readonly tier: number;
  readonly price: MoneyCents;
  readonly revenuePerMinute: MoneyCents;
  readonly costsPerMinute: MoneyCents;
};

export type BusinessCatalog = readonly BusinessDefinition[];

export const UPGRADE_TRACKS = ['capacity', 'quality', 'efficiency'] as const;
export type UpgradeTrack = (typeof UPGRADE_TRACKS)[number];

export type BusinessRules = {
  readonly maxTrackLevel: number;
  readonly upgradeWeightBps: Readonly<Record<UpgradeTrack, number>>;
  readonly upgradeGrowth: { readonly numerator: number; readonly denominator: number };
  readonly levelEffectPercent: {
    readonly capacityRevenue: number;
    readonly qualityRevenue: number;
    readonly capacityCosts: number;
    readonly efficiencySaving: number;
  };
  readonly managerPriceMultiplier: number;
  readonly managerBonusBps: number;
  readonly milestoneEveryLevels: number;
  readonly milestoneBonusBps: number;
  readonly saleReturnPercent: number;
  readonly branchArtCapacityLevels: readonly number[];
};

export type BusinessIncomeQuote = {
  readonly revenueCents: MoneyCents;
  readonly costsCents: MoneyCents;
  readonly milestoneBonusBps: number;
  readonly managerBonusBps: number;
  readonly netPerMinuteCents: MoneyCents;
};

export type BusinessUpgradeQuote =
  | { readonly status: 'max'; readonly track: UpgradeTrack; readonly level: number }
  | {
      readonly status: 'available';
      readonly track: UpgradeTrack;
      readonly level: number;
      readonly priceCents: MoneyCents;
      readonly netPerMinuteCents: MoneyCents;
      readonly nextNetPerMinuteCents: MoneyCents;
      readonly benefitPerMinuteCents: MoneyCents;
    };

export type BusinessPricing = {
  readonly definition: BusinessDefinition;
  readonly rules: BusinessRules;
};

const WHOLE_PERCENT = 100;
const PERCENT = BigInt(WHOLE_PERCENT);
const BASIS_POINTS = 10_000;

export function unownedBusiness(definitionId: string): OwnedBusiness {
  return {
    definitionId,
    levels: { capacity: 0, quality: 0, efficiency: 0 },
    managerOwned: false,
    capitalizedSpendCents: moneyCents(0),
  };
}

function scaled(baseCents: bigint, factors: { first: number; second: number }): bigint {
  return (baseCents * BigInt(factors.first) * BigInt(factors.second)) / (PERCENT * PERCENT);
}

function totalLevels(business: OwnedBusiness): number {
  return business.levels.capacity + business.levels.quality + business.levels.efficiency;
}

export function quoteBusinessIncome(
  business: OwnedBusiness,
  pricing: BusinessPricing,
): BusinessIncomeQuote {
  const { definition, rules } = pricing;
  const effect = rules.levelEffectPercent;
  const { capacity, quality, efficiency } = business.levels;
  const revenueCents = scaled(definition.revenuePerMinute, {
    first: WHOLE_PERCENT + effect.capacityRevenue * capacity,
    second: WHOLE_PERCENT + effect.qualityRevenue * quality,
  });
  const costsCents = scaled(definition.costsPerMinute, {
    first: WHOLE_PERCENT + effect.capacityCosts * capacity,
    second: WHOLE_PERCENT - effect.efficiencySaving * efficiency,
  });
  const milestoneBonusBps =
    rules.milestoneBonusBps * Math.floor(totalLevels(business) / rules.milestoneEveryLevels);
  const managerBonusBps = business.managerOwned ? rules.managerBonusBps : 0;
  const profit = revenueCents > costsCents ? revenueCents - costsCents : 0n;
  const multiplier =
    BigInt(BASIS_POINTS + milestoneBonusBps) * BigInt(BASIS_POINTS + managerBonusBps);
  return {
    revenueCents: moneyCents(revenueCents),
    costsCents: moneyCents(costsCents),
    milestoneBonusBps,
    managerBonusBps,
    netPerMinuteCents: moneyCents((profit * multiplier) / BigInt(BASIS_POINTS * BASIS_POINTS)),
  };
}

function upgradePriceCents(
  pricing: BusinessPricing,
  upgrade: { track: UpgradeTrack; level: number },
) {
  const { definition, rules } = pricing;
  const exponent = BigInt(upgrade.level);
  const numerator =
    definition.price *
    BigInt(rules.upgradeWeightBps[upgrade.track]) *
    BigInt(rules.upgradeGrowth.numerator) ** exponent;
  const denominator = BigInt(BASIS_POINTS) * BigInt(rules.upgradeGrowth.denominator) ** exponent;
  return moneyCents(divideRoundingUp(numerator, denominator));
}

export function quoteBusinessUpgrade(
  business: OwnedBusiness,
  upgrade: BusinessPricing & { readonly track: UpgradeTrack },
): BusinessUpgradeQuote {
  const { track } = upgrade;
  const level = business.levels[track];
  if (level >= upgrade.rules.maxTrackLevel) return { status: 'max', track, level };
  const netPerMinuteCents = quoteBusinessIncome(business, upgrade).netPerMinuteCents;
  const upgraded = { ...business, levels: { ...business.levels, [track]: level + 1 } };
  const nextNetPerMinuteCents = quoteBusinessIncome(upgraded, upgrade).netPerMinuteCents;
  return {
    status: 'available',
    track,
    level,
    priceCents: upgradePriceCents(upgrade, { track, level }),
    netPerMinuteCents,
    nextNetPerMinuteCents,
    benefitPerMinuteCents: moneyCents(nextNetPerMinuteCents - netPerMinuteCents),
  };
}

export function managerPriceCents(pricing: BusinessPricing): MoneyCents {
  return moneyCents(pricing.definition.price * BigInt(pricing.rules.managerPriceMultiplier));
}

export function saleProceedsCents(business: OwnedBusiness, rules: BusinessRules): MoneyCents {
  return moneyCents((business.capitalizedSpendCents * BigInt(rules.saleReturnPercent)) / PERCENT);
}

export function branchCount(capacity: number, rules: BusinessRules): number {
  return 1 + rules.branchArtCapacityLevels.filter((level) => level <= capacity).length;
}
