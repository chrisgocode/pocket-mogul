import { STAFF_ROLES } from '@/domain/business/definition';
import { MICROS_PER_DOLLAR } from '@/domain/money';

import { inexactCoreFigures } from './businessCore';
import { contentSchema, TIERS, type Content } from './schema';
import { businessRisksFit } from './validateRisks';
import { airlineMechanicsFit } from './validateAirline';
import { spaceMechanicsFit } from './validateSpace';
import { bakeryMechanicsFit } from './validateBakery';
import { carWashMechanicsFit } from './validateCarWash';
import { coffeeKioskMechanicsFit } from './validateCoffeeKiosk';
import { deliveryMechanicsFit } from './validateDelivery';
import { factoryMechanicsFit } from './validateFactory';
import { foodCartMechanicsFit } from './validateFoodCart';
import { gymMechanicsFit } from './validateGym';
import { hotelMechanicsFit } from './validateHotel';
import { laundromatMechanicsFit } from './validateLaundromat';
import { collectionFits } from './validateCollection';
import { synergiesFit } from './validateSynergies';
import { takeoversFit } from './validateTakeovers';
import { vendingMechanicsFit } from './validateVending';

export class ContentValidationError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Content failed validation:\n- ${issues.join('\n- ')}`);
    this.name = 'ContentValidationError';
  }
}

export type ContentCheck = { ok: true; content: Content } | { ok: false; issues: string[] };

function checkContent(input: unknown): ContentCheck {
  const parsed = contentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
    };
  }
  const content = parsed.data;
  const issues = crossChecks(content);
  return issues.length ? { ok: false, issues } : { ok: true, content };
}

export function findContentIssues(input: unknown): string[] {
  const result = checkContent(input);
  return result.ok ? [] : result.issues;
}

export function validateContent(input: unknown): Content {
  const result = checkContent(input);
  if (!result.ok) throw new ContentValidationError(result.issues);
  return result.content;
}

function duplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const v of values) (seen.has(v) ? dupes : seen).add(v);
  return [...dupes];
}

function isAscending(values: readonly bigint[] | readonly number[]): boolean {
  return values.every((v, i) => i === 0 || v > values[i - 1]!);
}

function neverFalls(values: readonly number[]): boolean {
  return values.every((v, i) => i === 0 || v >= values[i - 1]!);
}

function crossChecks(content: Content): string[] {
  return [
    idsAreUniqueWithinEachCatalog,
    retiredIdsAreNeverReused,
    everyTierHasBusinessesAndRisingUnlocks,
    businessesAndPropertiesEarnAtBaseLevel,
    businessCoreFiguresAreWhole,
    businessStagesAndPayoutsFit,
    businessRisksFit,
    vendingMechanicsFit,
    carWashMechanicsFit,
    deliveryMechanicsFit,
    foodCartMechanicsFit,
    coffeeKioskMechanicsFit,
    laundromatMechanicsFit,
    bakeryMechanicsFit,
    gymMechanicsFit,
    hotelMechanicsFit,
    factoryMechanicsFit,
    airlineMechanicsFit,
    spaceMechanicsFit,
    takeoversFit,
    synergiesFit,
    collectionFits,
    efficiencyKeepsCostsPositive,
    systemsKeepUpkeepPositive,
    stockClassesFollowTheirRules,
    artworkLevelsFitTheirCaps,
    marketRandomnessIsConsistent,
    wealthGoalsRise,
    everyMarketEventHasATemplate,
    eventPlaceholdersFitTheirScope,
  ].flatMap((check) => check(content));
}

type Catalog = { kind: string; ids: string[]; retirable: boolean };

function catalogsOf(content: Content): Catalog[] {
  return [
    { kind: 'business', ids: content.businesses.map((b) => b.id), retirable: true },
    {
      kind: 'incident',
      ids: content.businesses.flatMap((b) => b.incidents.map((incident) => incident.id)),
      retirable: true,
    },
    {
      kind: 'rival',
      ids: content.businesses.flatMap((b) => b.rivals.map((rival) => rival.id)),
      retirable: true,
    },
    { kind: 'synergy', ids: content.synergies.links.map((link) => link.id), retirable: true },
    { kind: 'collectible', ids: content.collection.pieces.map((p) => p.id), retirable: true },
    { kind: 'collection set', ids: content.collection.sets.map((s) => s.id), retirable: true },
    { kind: 'property', ids: content.properties.map((p) => p.id), retirable: true },
    {
      kind: 'instrument',
      ids: [...content.stocks.map((s) => s.id), ...content.coins.map((k) => k.id)],
      retirable: true,
    },
    {
      kind: 'ticker',
      ids: [...content.stocks.map((s) => s.ticker), ...content.coins.map((k) => k.ticker)],
      retirable: false,
    },
    { kind: 'goal', ids: content.goals.map((g) => g.id), retirable: true },
    { kind: 'event', ids: content.events.map((e) => e.id), retirable: true },
  ];
}

function idsAreUniqueWithinEachCatalog(content: Content): string[] {
  return catalogsOf(content).flatMap(({ kind, ids }) =>
    duplicates(ids).map((dupe) => `Duplicate ${kind} ID: ${dupe}`),
  );
}

function retiredIdsAreNeverReused(content: Content): string[] {
  const retired = new Set(content.retiredIds);
  return catalogsOf(content)
    .filter((catalog) => catalog.retirable)
    .flatMap(({ kind, ids }) =>
      ids
        .filter((used) => retired.has(used))
        .map((used) => `Retired ID reused as ${kind}: ${used}`),
    );
}

function everyTierHasBusinessesAndRisingUnlocks(content: Content): string[] {
  const emptyTiers = TIERS.filter((tier) => !content.businesses.some((b) => b.tier === tier)).map(
    (tier) => `Tier ${tier} has no businesses`,
  );
  const { tierUnlocks } = content.economy;
  const unlocksRise = isAscending([tierUnlocks[2], tierUnlocks[3], tierUnlocks[4]]);
  return unlocksRise
    ? emptyTiers
    : [...emptyTiers, 'Tier unlock thresholds must rise from Tier 2 to Tier 4'];
}

function businessesAndPropertiesEarnAtBaseLevel(content: Content): string[] {
  return [
    ...content.businesses
      .filter((b) => b.costsPerDay >= b.revenuePerDay)
      .map((b) => `Business ${b.id} costs must be below revenue`),
    ...content.properties
      .filter((p) => p.upkeepPerMinute >= p.rentPerMinute)
      .map((p) => `Property ${p.id} upkeep must be below rent`),
  ];
}

function stockClassesFollowTheirRules(content: Content): string[] {
  return content.stocks.flatMap((s) => {
    const issues: string[] = [];
    if (s.volatilityClass === 'penny' && s.initialPrice >= MICROS_PER_DOLLAR) {
      issues.push(`Penny stock ${s.id} must start under $1`);
    }
    if (s.volatilityClass === 'penny' && s.dividendCentsPerSharePerHour > 0n) {
      issues.push(`Penny stock ${s.id} must not pay a dividend`);
    }
    if (s.volatilityClass === 'blue_chip' && s.dividendCentsPerSharePerHour === 0n) {
      issues.push(`Blue chip ${s.id} must pay a dividend`);
    }
    return issues;
  });
}

const WHOLE_PERCENT = 100;

function businessCoreFiguresAreWhole(content: Content): string[] {
  const rules = content.economy.businessRules;
  return content.businesses.flatMap((business) =>
    inexactCoreFigures(business, rules).map(
      (figure) => `Business ${business.id} ${figure} must come out whole`,
    ),
  );
}

function businessStagesAndPayoutsFit(content: Content): string[] {
  const { stages, defaultPayoutPercent, payoutStepPercent } = content.economy.businessRules;
  const staffCapsHold = STAFF_ROLES.every((role) =>
    neverFalls(stages.map((stage) => stage.staffCap[role])),
  );
  return [
    !isAscending(stages.map((stage) => stage.unitCap)) && 'Unit caps must rise with each stage',
    !staffCapsHold && 'Staff caps must never fall from one stage to the next',
    !isAscending(stages.map((stage) => stage.upgradePriceMultiple)) &&
      'Stage upgrade prices must rise with each stage',
    !neverFalls(stages.map((stage) => stage.daysOwnedToReach)) &&
      'Days owned to reach a stage must never fall',
    defaultPayoutPercent % payoutStepPercent !== 0 && 'The default payout must be a payout step',
  ].filter((issue) => issue !== false);
}

function efficiencyKeepsCostsPositive(content: Content): string[] {
  const { maxTrackLevel, efficiencySavingPercent } = content.economy.businessRules;
  return efficiencySavingPercent * maxTrackLevel < WHOLE_PERCENT
    ? []
    : ['Efficiency at its max level must leave operating costs above zero'];
}

function systemsKeepUpkeepPositive(content: Content): string[] {
  const { maxUpgradeLevel, levelEffectPercent } = content.economy.propertyRules;
  return levelEffectPercent.systemsSaving * maxUpgradeLevel < WHOLE_PERCENT
    ? []
    : ['Building Systems at its max level must leave upkeep above zero'];
}

function artworkLevelsFitTheirCaps(content: Content): string[] {
  const { tap } = content.economy;
  return [
    tap.artworkLevels[0] !== 0 && 'Tap artwork must start at level 0',
    !isAscending(tap.artworkLevels) && 'Tap artwork levels must ascend',
    tap.artworkLevels.some((l) => l > tap.maxLevel) && 'Tap artwork level above the wallet cap',
  ].filter((issue) => issue !== false);
}

function marketRandomnessIsConsistent(content: Content): string[] {
  const { market } = content.economy;
  const { bear, neutral, bull } = market.regimeChancePercent;
  const events = market.eventChancePercent;
  return [
    bear + neutral + bull !== WHOLE_PERCENT && 'Regime chances must sum to 100',
    events.asset + events.sector + events.market !== WHOLE_PERCENT &&
      'Event scope chances must sum to 100',
    market.anchorClampBps > market.totalReturnClampBps && 'Anchor clamp exceeds total return clamp',
  ].filter((issue) => issue !== false);
}

function wealthGoalsRise(content: Content): string[] {
  const thresholds = content.goals.flatMap((g) =>
    g.kind === 'peak_net_worth' ? [g.threshold] : [],
  );
  return isAscending(thresholds) ? [] : ['Peak net worth goals must ascend'];
}

const EVENT_SCOPES_BY_MARKET = {
  stocks: ['company', 'sector', 'market'],
  crypto: ['coin', 'market'],
} as const;

type Market = keyof typeof EVENT_SCOPES_BY_MARKET;

const MARKETS: readonly Market[] = ['stocks', 'crypto'];
const DIRECTIONS = ['up', 'down'] as const;

type TemplateSlot = { market: Market; scope: string; direction: string };

function hasTemplate(content: Content, slot: TemplateSlot): boolean {
  return content.events.some(
    (e) => e.market === slot.market && e.scope === slot.scope && e.direction === slot.direction,
  );
}

function missingTemplates(content: Content, market: Market): string[] {
  const scopes: readonly string[] = EVENT_SCOPES_BY_MARKET[market];
  return scopes.flatMap((scope) =>
    DIRECTIONS.filter((direction) => !hasTemplate(content, { market, scope, direction })).map(
      (direction) => `No ${market} ${scope} ${direction} event template`,
    ),
  );
}

function unusedScopes(content: Content, market: Market): string[] {
  const scopes: readonly string[] = EVENT_SCOPES_BY_MARKET[market];
  return content.events
    .filter((e) => e.market === market && !scopes.includes(e.scope))
    .map((e) => `Event ${e.id}: scope ${e.scope} is not used by ${market}`);
}

function everyMarketEventHasATemplate(content: Content): string[] {
  return MARKETS.flatMap((market) =>
    unusedScopes(content, market).concat(missingTemplates(content, market)),
  );
}

function placeholderFitsScope(placeholder: string, scope: string): boolean {
  if (placeholder === '{name}') return scope === 'company' || scope === 'coin';
  if (placeholder === '{sector}') return scope === 'sector';
  return false;
}

function eventPlaceholdersFitTheirScope(content: Content): string[] {
  return content.events.flatMap((e) =>
    (e.headline.match(/\{(\w+)\}/g) ?? [])
      .filter((placeholder) => !placeholderFitsScope(placeholder, e.scope))
      .map(
        (placeholder) => `Event ${e.id}: placeholder ${placeholder} does not fit scope ${e.scope}`,
      ),
  );
}
