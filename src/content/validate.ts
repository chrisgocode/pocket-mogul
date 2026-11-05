import { MICROS_PER_DOLLAR } from '@/domain/money';

import { contentSchema, TIERS, type Content } from './schema';

/**
 * Validates content at startup and in tests (spec §16): shape via Zod, then
 * the rules Zod can't express (unique IDs, references, caps, tier coverage).
 * A bad edit fails loudly with every problem listed, never silently.
 */

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

function crossChecks(c: Content): string[] {
  const issues: string[] = [];
  const fail = (message: string) => issues.push(message);
  const { economy } = c;

  // Unique IDs within each catalog. Stocks and coins share one instrument namespace.
  const catalogs: [string, string[]][] = [
    ['business', c.businesses.map((b) => b.id)],
    ['property', c.properties.map((p) => p.id)],
    ['instrument', [...c.stocks.map((s) => s.id), ...c.coins.map((k) => k.id)]],
    ['ticker', [...c.stocks.map((s) => s.ticker), ...c.coins.map((k) => k.ticker)]],
    ['goal', c.goals.map((g) => g.id)],
    ['event', c.events.map((e) => e.id)],
  ];
  for (const [kind, ids] of catalogs) {
    for (const dupe of duplicates(ids)) fail(`Duplicate ${kind} ID: ${dupe}`);
  }

  // Retired IDs are never reused.
  const retired = new Set(c.retiredIds);
  for (const [kind, ids] of catalogs) {
    if (kind === 'ticker') continue;
    for (const used of ids) if (retired.has(used)) fail(`Retired ID reused as ${kind}: ${used}`);
  }

  // Four tiers, each with businesses; unlock thresholds rise with the tier.
  for (const tier of TIERS) {
    if (!c.businesses.some((b) => b.tier === tier)) fail(`Tier ${tier} has no businesses`);
  }
  const unlocks = [economy.tierUnlocks[2], economy.tierUnlocks[3], economy.tierUnlocks[4]];
  if (!isAscending(unlocks)) fail('Tier unlock thresholds must rise from Tier 2 to Tier 4');

  // Businesses must make money at base level.
  for (const b of c.businesses) {
    if (b.costsPerMinute >= b.revenuePerMinute)
      fail(`Business ${b.id} costs must be below revenue`);
  }

  // Properties are net-positive at base level (§8 RE02).
  for (const p of c.properties) {
    if (p.upkeepPerMinute >= p.rentPerMinute) fail(`Property ${p.id} upkeep must be below rent`);
  }

  // Stock classes: penny stocks are under $1 and pay nothing; blue chips pay dividends.
  for (const s of c.stocks) {
    if (s.volatilityClass === 'penny') {
      if (s.initialPrice >= MICROS_PER_DOLLAR) fail(`Penny stock ${s.id} must start under $1`);
      if (s.dividendPerShareHour > 0n) fail(`Penny stock ${s.id} must not pay a dividend`);
    }
    if (s.volatilityClass === 'blue_chip' && s.dividendPerShareHour === 0n) {
      fail(`Blue chip ${s.id} must pay a dividend`);
    }
  }

  // Level caps and the milestones that sit on them.
  const { tap, businessRules, market } = economy;
  if (tap.artworkLevels[0] !== 0) fail('Tap artwork must start at level 0');
  if (!isAscending(tap.artworkLevels)) fail('Tap artwork levels must ascend');
  if (tap.artworkLevels.some((l) => l > tap.maxLevel))
    fail('Tap artwork level above the wallet cap');
  if (!isAscending(businessRules.branchArtCapacityLevels)) fail('Branch art levels must ascend');
  if (businessRules.branchArtCapacityLevels.some((l) => l > businessRules.maxTrackLevel)) {
    fail('Branch art level above the business track cap');
  }

  // Market randomness and clamps.
  const chances = market.regimeChancePercent;
  if (chances.bear + chances.neutral + chances.bull !== 100) fail('Regime chances must sum to 100');
  if (market.anchorClampBps > market.totalReturnClampBps)
    fail('Anchor clamp exceeds total return clamp');

  // Wealth goals rise and don't repeat a threshold.
  const peaks = c.goals.flatMap((g) => (g.kind === 'peak_net_worth' ? [g.threshold] : []));
  if (!isAscending(peaks)) fail('Peak net worth goals must ascend');

  // News: each market has a template for every scope and direction it can draw,
  // and only templates its scopes can use.
  const scopesFor = {
    stocks: ['company', 'sector', 'market'],
    crypto: ['coin', 'market'],
  } as const;
  for (const marketName of ['stocks', 'crypto'] as const) {
    const allowed: readonly string[] = scopesFor[marketName];
    for (const e of c.events.filter((x) => x.market === marketName)) {
      if (!allowed.includes(e.scope))
        fail(`Event ${e.id}: scope ${e.scope} is not used by ${marketName}`);
    }
    for (const scope of allowed) {
      for (const direction of ['up', 'down'] as const) {
        const found = c.events.some(
          (e) => e.market === marketName && e.scope === scope && e.direction === direction,
        );
        if (!found) fail(`No ${marketName} ${scope} ${direction} event template`);
      }
    }
  }
  for (const e of c.events) {
    const placeholders = e.headline.match(/\{(\w+)\}/g) ?? [];
    for (const ph of placeholders) {
      const ok =
        ph === '{name}'
          ? e.scope === 'company' || e.scope === 'coin'
          : ph === '{sector}' && e.scope === 'sector';
      if (!ok) fail(`Event ${e.id}: placeholder ${ph} does not fit scope ${e.scope}`);
    }
  }

  return issues;
}
