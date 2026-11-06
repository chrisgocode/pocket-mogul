import { divideRoundingUp, formatMoneyExact, type MoneyCents } from '@/domain/money';

import { economyV1 } from './economy-v1';
import { findContentIssues, getContent, ContentValidationError, validateContent } from './index';

const clone = () => structuredClone(economyV1);
const issuesFor = (mutate: (c: ReturnType<typeof clone>) => void) => {
  const c = clone();
  mutate(c);
  return findContentIssues(c);
};

describe('bundled content', () => {
  it('passes validation', () => {
    expect(findContentIssues(economyV1)).toEqual([]);
  });

  it('has the v1 catalog sizes', () => {
    const c = getContent();
    expect(c.businesses).toHaveLength(12);
    expect(c.stocks).toHaveLength(24);
    expect(c.coins).toHaveLength(6);
    expect(c.properties).toHaveLength(8);
    expect(c.goals).toHaveLength(13);
  });

  it('has three businesses in each of the four tiers', () => {
    const counts = [1, 2, 3, 4].map(
      (t) => getContent().businesses.filter((b) => b.tier === t).length,
    );
    expect(counts).toEqual([3, 3, 3, 3]);
  });

  it('has nine dividend payers: three standard and six blue chips', () => {
    const payers = getContent().stocks.filter((s) => s.dividendCentsPerSharePerHour > 0n);
    expect(payers.map((s) => s.ticker).toSorted()).toEqual(
      ['ATIN', 'BRIK', 'BRL', 'CLWV', 'EVGU', 'IRCL', 'PRZM', 'SMHD', 'WLBH'].toSorted(),
    );
    expect(getContent().stocks.filter((s) => s.volatilityClass === 'penny')).toHaveLength(6);
  });

  it('reproduces the wallet upgrade price fixtures from its ratio (§12)', () => {
    const { upgradeBaseCents, upgradeGrowth } = getContent().economy.tap;
    const price = (level: number) => {
      const n = BigInt(upgradeGrowth.numerator) ** BigInt(level);
      const d = BigInt(upgradeGrowth.denominator) ** BigInt(level);
      return formatMoneyExact(divideRoundingUp(upgradeBaseCents * n, d) as MoneyCents);
    };
    expect([0, 1, 2, 3].map(price)).toEqual(['$100.00', '$145.00', '$210.25', '$304.87']);
  });

  it('nets $10 per minute for a base Vending Machine (AC06 inputs)', () => {
    const vending = getContent().businesses.find((b) => b.id === 'vending')!;
    expect(vending.revenuePerMinute - vending.costsPerMinute).toBe(1000n);
  });
});

describe('validation catches bad edits', () => {
  it('duplicate IDs', () => {
    expect(issuesFor((c) => void (c.coins[0]!.id = 'prism'))).toContain(
      'Duplicate instrument ID: prism',
    );
  });

  it('duplicate tickers', () => {
    expect(issuesFor((c) => void (c.coins[0]!.ticker = 'PRZM'))).toContain(
      'Duplicate ticker ID: PRZM',
    );
  });

  it('non-positive prices', () => {
    expect(issuesFor((c) => void ((c.businesses[0]! as { price: bigint }).price = 0n))).toEqual([
      'businesses.0.price: Too small: expected bigint to be >0',
    ]);
  });

  it('illegal tiers', () => {
    expect(
      issuesFor((c) => void ((c.businesses[0] as { tier: number }).tier = 5)).length,
    ).toBeGreaterThan(0);
  });

  it('an empty tier', () => {
    const issues = issuesFor((c) => {
      for (const tierFour of c.businesses.filter((b) => b.tier === 4)) {
        (tierFour as { tier: number }).tier = 3;
      }
    });
    expect(issues).toContain('Tier 4 has no businesses');
  });

  it('missing or unknown icons', () => {
    expect(
      issuesFor(
        (c) => void ((c.stocks[0]!.logo as { glyph: string }).glyph = 'logo_of_a_real_brand'),
      ).length,
    ).toBeGreaterThan(0);
    expect(
      issuesFor((c) => void delete (c.properties[0] as { logo?: unknown }).logo).length,
    ).toBeGreaterThan(0);
  });

  it('artwork above the level cap', () => {
    expect(issuesFor((c) => void c.economy.tap.artworkLevels.push(101))).toContain(
      'Tap artwork level above the wallet cap',
    );
  });

  it('a reused retired ID', () => {
    expect(issuesFor((c) => void (c.retiredIds as string[]).push('vending'))).toContain(
      'Retired ID reused as business: vending',
    );
  });

  it('a penny stock priced at $1 or more', () => {
    expect(
      issuesFor(
        (c) =>
          void ((
            c.stocks.find((s) => s.id === 'zapcar')! as { initialPrice: bigint }
          ).initialPrice = 1_000_000n),
      ),
    ).toContain('Penny stock zapcar must start under $1');
  });

  it('a missing news template', () => {
    const issues = issuesFor((c) => {
      (c as { events: unknown[] }).events = c.events.filter(
        (e) => e.id !== 'cry_market_down_chill',
      );
    });
    expect(issues).toContain('No crypto market down event template');
  });

  it('throws a readable error listing every issue', () => {
    const c = clone();
    c.coins[0]!.id = 'prism';
    c.economy.market.regimeChancePercent.bull = 30;
    expect(() => validateContent(c)).toThrow(ContentValidationError);
    expect(() => validateContent(c)).toThrow(
      /Duplicate instrument ID: prism[\s\S]*Regime chances must sum to 100/,
    );
  });
});

describe('business rule validation rejects', () => {
  it('Efficiency that would push costs to zero', () => {
    expect(
      issuesFor((c) => void (c.economy.businessRules.levelEffectPercent.efficiencySaving = 5)),
    ).toEqual(['Efficiency at its max level must leave operating costs above zero']);
  });
});

describe('property rule validation rejects', () => {
  it('Building Systems that would push upkeep to zero', () => {
    expect(
      issuesFor((c) => void (c.economy.propertyRules.levelEffectPercent.systemsSaving = 10)),
    ).toEqual(['Building Systems at its max level must leave upkeep above zero']);
  });
});
