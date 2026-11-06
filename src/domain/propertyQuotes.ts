import type { OwnedProperty, PropertyLevels } from './gameState';
import { divideRoundingUp, moneyCents, type MoneyCents } from './money';

export type PropertyDefinition = {
  readonly id: string;
  readonly price: MoneyCents;
  readonly rentPerMinute: MoneyCents;
  readonly upkeepPerMinute: MoneyCents;
  readonly expansionAllowed: boolean;
};

export type PropertyCatalog = readonly PropertyDefinition[];

export const PROPERTY_TRACKS = ['renovation', 'furnishings', 'systems', 'expansion'] as const;
export type PropertyTrack = (typeof PROPERTY_TRACKS)[number];

export type PropertyRules = {
  readonly maxUpgradeLevel: number;
  readonly maxExpansionLevel: number;
  readonly upgradeWeightBps: Readonly<Record<PropertyTrack, number>>;
  readonly upgradeGrowth: { readonly numerator: number; readonly denominator: number };
  readonly levelEffectPercent: {
    readonly renovationRent: number;
    readonly furnishingsRent: number;
    readonly systemsSaving: number;
    readonly expansionRentAndUpkeep: number;
  };
  readonly valueUpgradePercent: number;
  readonly saleValuePercent: number;
};

export type PropertyPricing = {
  readonly definition: PropertyDefinition;
  readonly rules: PropertyRules;
};

export type PropertyIncomeQuote = {
  readonly rentCents: MoneyCents;
  readonly upkeepCents: MoneyCents;
  readonly netPerMinuteCents: MoneyCents;
};

export type PropertyUpgradeQuote =
  | { readonly status: 'max'; readonly track: PropertyTrack; readonly level: number }
  | { readonly status: 'unavailable'; readonly track: 'expansion'; readonly level: number }
  | {
      readonly status: 'available';
      readonly track: PropertyTrack;
      readonly level: number;
      readonly priceCents: MoneyCents;
      readonly rentCents: MoneyCents;
      readonly nextRentCents: MoneyCents;
      readonly upkeepCents: MoneyCents;
      readonly nextUpkeepCents: MoneyCents;
      readonly netPerMinuteCents: MoneyCents;
      readonly nextNetPerMinuteCents: MoneyCents;
      readonly valueCents: MoneyCents;
      readonly nextValueCents: MoneyCents;
    };

const WHOLE_PERCENT = 100;
const PERCENT = BigInt(WHOLE_PERCENT);
const BASIS_POINTS = 10_000n;

export function levelZeroProperty(definitionId: string): OwnedProperty {
  return {
    definitionId,
    levels: { renovation: 0, furnishings: 0, systems: 0, expansion: 0 },
    rented: false,
    upgradeSpendCents: moneyCents(0),
  };
}

function scaled(baseCents: bigint, factors: { first: number; second: number }): MoneyCents {
  return moneyCents(
    (baseCents * BigInt(factors.first) * BigInt(factors.second)) / (PERCENT * PERCENT),
  );
}

export function quotePropertyIncome(
  property: OwnedProperty,
  pricing: PropertyPricing,
): PropertyIncomeQuote {
  const { definition, rules } = pricing;
  const effect = rules.levelEffectPercent;
  const { renovation, furnishings, systems, expansion } = property.levels;
  const expansionFactor = WHOLE_PERCENT + effect.expansionRentAndUpkeep * expansion;
  const rentCents = scaled(definition.rentPerMinute, {
    first:
      WHOLE_PERCENT + effect.renovationRent * renovation + effect.furnishingsRent * furnishings,
    second: expansionFactor,
  });
  const upkeepCents = scaled(definition.upkeepPerMinute, {
    first: WHOLE_PERCENT - effect.systemsSaving * systems,
    second: expansionFactor,
  });
  const profit = rentCents > upkeepCents ? rentCents - upkeepCents : 0n;
  return {
    rentCents,
    upkeepCents,
    netPerMinuteCents: moneyCents(property.rented ? profit : 0n),
  };
}

export function estimatedValueCents(property: OwnedProperty, pricing: PropertyPricing): MoneyCents {
  const upgradeValue =
    (property.upgradeSpendCents * BigInt(pricing.rules.valueUpgradePercent)) / PERCENT;
  return moneyCents(pricing.definition.price + upgradeValue);
}

export function propertySaleProceedsCents(
  property: OwnedProperty,
  pricing: PropertyPricing,
): MoneyCents {
  const value = estimatedValueCents(property, pricing);
  return moneyCents((value * BigInt(pricing.rules.saleValuePercent)) / PERCENT);
}

function upgradePriceCents(
  pricing: PropertyPricing,
  upgrade: { track: PropertyTrack; level: number },
) {
  const { definition, rules } = pricing;
  const exponent = BigInt(upgrade.level);
  const numerator =
    definition.price *
    BigInt(rules.upgradeWeightBps[upgrade.track]) *
    BigInt(rules.upgradeGrowth.numerator) ** exponent;
  const denominator = BASIS_POINTS * BigInt(rules.upgradeGrowth.denominator) ** exponent;
  return moneyCents(divideRoundingUp(numerator, denominator));
}

export function maxTrackLevel(track: PropertyTrack, pricing: PropertyPricing): number {
  if (track !== 'expansion') return pricing.rules.maxUpgradeLevel;
  return pricing.definition.expansionAllowed ? pricing.rules.maxExpansionLevel : 0;
}

export function upgradedProperty(
  property: OwnedProperty,
  change: { track: PropertyTrack; priceCents: MoneyCents },
): OwnedProperty {
  const levels: PropertyLevels = {
    ...property.levels,
    [change.track]: property.levels[change.track] + 1,
  };
  return {
    ...property,
    levels,
    upgradeSpendCents: moneyCents(property.upgradeSpendCents + change.priceCents),
  };
}

export function quotePropertyUpgrade(
  property: OwnedProperty,
  upgrade: PropertyPricing & { readonly track: PropertyTrack },
): PropertyUpgradeQuote {
  const { track } = upgrade;
  const level = property.levels[track];
  if (track === 'expansion' && !upgrade.definition.expansionAllowed) {
    return { status: 'unavailable', track, level };
  }
  if (level >= maxTrackLevel(track, upgrade)) return { status: 'max', track, level };
  const priceCents = upgradePriceCents(upgrade, { track, level });
  const next = upgradedProperty(property, { track, priceCents });
  const now = quotePropertyIncome(property, upgrade);
  const then = quotePropertyIncome(next, upgrade);
  return {
    status: 'available',
    track,
    level,
    priceCents,
    rentCents: now.rentCents,
    nextRentCents: then.rentCents,
    upkeepCents: now.upkeepCents,
    nextUpkeepCents: then.upkeepCents,
    netPerMinuteCents: now.netPerMinuteCents,
    nextNetPerMinuteCents: then.netPerMinuteCents,
    valueCents: estimatedValueCents(property, upgrade),
    nextValueCents: estimatedValueCents(next, upgrade),
  };
}
