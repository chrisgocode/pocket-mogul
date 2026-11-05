import { MICROS_PER_DOLLAR } from '@/domain/money';

import { contentSchema, TIERS, type Content } from './schema';

export class ContentValidationError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Content failed validation:\n- ${issues.join('\n- ')}`);
    this.name = 'ContentValidationError';
  }
}

export type ContentCheck = { ok: true; content: Content } | { ok: false; issues: string[] };

export function checkContent(input: unknown): ContentCheck {
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

function crossChecks(content: Content): string[] {
  return [
    idsAreUniqueWithinEachCatalog,
    retiredIdsAreNeverReused,
    everyTierHasBusinessesAndRisingUnlocks,
    businessesAndPropertiesEarnAtBaseLevel,
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
      .filter((b) => b.costsPerMinute >= b.revenuePerMinute)
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

function artworkLevelsFitTheirCaps(content: Content): string[] {
  const { tap, businessRules } = content.economy;
  const branchLevels = businessRules.branchArtCapacityLevels;
  return [
    tap.artworkLevels[0] !== 0 && 'Tap artwork must start at level 0',
    !isAscending(tap.artworkLevels) && 'Tap artwork levels must ascend',
    tap.artworkLevels.some((l) => l > tap.maxLevel) && 'Tap artwork level above the wallet cap',
    !isAscending(branchLevels) && 'Branch art levels must ascend',
    branchLevels.some((l) => l > businessRules.maxTrackLevel) &&
      'Branch art level above the business track cap',
  ].filter((issue) => issue !== false);
}

function marketRandomnessIsConsistent(content: Content): string[] {
  const { market } = content.economy;
  const { bear, neutral, bull } = market.regimeChancePercent;
  return [
    bear + neutral + bull !== 100 && 'Regime chances must sum to 100',
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

const MARKETS = ['stocks', 'crypto'] as const;
const DIRECTIONS = ['up', 'down'] as const;

function everyMarketEventHasATemplate(content: Content): string[] {
  return MARKETS.flatMap((market) => {
    const scopes: readonly string[] = EVENT_SCOPES_BY_MARKET[market];
    const unusedScopes = content.events
      .filter((e) => e.market === market && !scopes.includes(e.scope))
      .map((e) => `Event ${e.id}: scope ${e.scope} is not used by ${market}`);
    const missingTemplates = scopes.flatMap((scope) =>
      DIRECTIONS.filter(
        (direction) =>
          !content.events.some(
            (e) => e.market === market && e.scope === scope && e.direction === direction,
          ),
      ).map((direction) => `No ${market} ${scope} ${direction} event template`),
    );
    return unusedScopes.concat(missingTemplates);
  });
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
