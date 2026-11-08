import { divideRoundingUp, dollars, formatMoneyExact, type MoneyCents } from '@/domain/money';

import { economyV1 } from './economy-v1';
import {
  businessDefinition,
  findContentIssues,
  getContent,
  ContentValidationError,
  validateContent,
} from './index';

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
    expect(new Set(payers.map((s) => s.ticker))).toEqual(
      new Set(['ATIN', 'BRIK', 'BRL', 'CLWV', 'EVGU', 'IRCL', 'PRZM', 'SMHD', 'WLBH']),
    );
    expect(payers).toHaveLength(9);
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

  it('derives the Vending Machine core figures from its catalog row (BUS09)', () => {
    const content = getContent();
    const vending = content.businesses.find((b) => b.id === 'vending')!;
    const { mechanic, rivals, ...core } = businessDefinition(
      vending,
      content.economy.businessRules,
    );
    expect([mechanic.kind, rivals.length]).toEqual(['vending', 3]);
    expect(core).toEqual({
      id: 'vending',
      tier: 1,
      price: dollars('250'),
      pricePerCustomerCents: dollars('1.40'),
      capacityPerUnit: 100,
      baseDemand: 110,
      costPerCustomerCents: dollars('0.24'),
      upkeepPerUnitCents: dollars('16'),
      catalogRevenuePerDayCents: dollars('140'),
      demandBps: { budget: 14500, value: 12000, standard: 10000, premium: 7500, luxury: 5500 },
      incidents: vending.incidents,
    });
  });

  it('derives whole core figures for every business in the catalog', () => {
    const content = getContent();
    const figures = content.businesses.map((business) => {
      const core = businessDefinition(business, content.economy.businessRules);
      return [business.id, core.capacityPerUnit, core.baseDemand];
    });
    expect(figures).toEqual([
      ['vending', 100, 110],
      ['food_cart', 80, 88],
      ['coffee_kiosk', 500, 550],
      ['laundromat', 500, 550],
      ['car_wash', 500, 550],
      ['bakery', 1000, 1100],
      ['delivery', 10000, 11000],
      ['gym_chain', 20000, 22000],
      ['hotel_group', 8000, 8800],
      ['manufacturer', 1600, 1760],
      ['airline', 100000, 110000],
      ['space_launch', 50, 55],
    ]);
  });
});

const listing = (asset: { ticker: string; name: string }) => `${asset.ticker} ${asset.name}`;

describe('the market content', () => {
  it('rejects event scope chances that do not sum to 100', () => {
    expect(issuesFor((c) => void (c.economy.market.eventChancePercent.sector = 30))).toContain(
      'Event scope chances must sum to 100',
    );
  });

  it('lists the stocks and coins of spec §6 and §7, in order', () => {
    expect(getContent().stocks.map(listing)).toEqual([
      'PRZM Prism Labs',
      'KBYT Kilobyte Systems',
      'PVN ParcelVine',
      'CBR CartBarn',
      'VLT Voltara Motors',
      'LPR LoopRide',
      'BRIK Brickbank',
      'VCR VaultCard',
      'SGR SunGrid',
      'BRL BarrelWorks',
      'BNST Bean Street',
      'BUNV Bun Voyage',
      'SMHD Summit Holdings',
      'ATIN Atlas Insurance',
      'IRCL Ironclad Industries',
      'WLBH Willowbrook Health',
      'CLWV Clearwave Telecom',
      'EVGU Evergreen Utilities',
      'FZWB Fizzwater Beverages',
      'GLBG Glowbug Gadgets',
      'MSBT Moonshot Biotech',
      'CPMD Couch Potato Media',
      'RRXM Rocket Rex Mining',
      'ZPCR Zapcar Rentals',
    ]);
    expect(getContent().coins.map(listing)).toEqual([
      'BKC Block Crown',
      'EMB Ember Chain',
      'MOS Moss Network',
      'SPK Spark Token',
      'WAGX Wag Coin',
      'MBN Moon Bean',
    ]);
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
    expect(issuesFor((c) => void (c.economy.businessRules.efficiencySavingPercent = 5))).toEqual([
      'Efficiency at its max level must leave operating costs above zero',
    ]);
  });

  it('a catalog row whose core figures do not come out whole', () => {
    expect(issuesFor((c) => void (c.businesses[0]!.pricePerCustomer = dollars('1.30')))).toEqual([
      'Business vending capacity per unit must come out whole',
      'Business vending base demand must come out whole',
      'Business vending cost per customer must come out whole',
    ]);
  });

  it('unit caps that fall from one stage to the next', () => {
    expect(issuesFor((c) => void (c.economy.businessRules.stages[1]!.unitCap = 2))).toEqual([
      'Unit caps must rise with each stage',
    ]);
  });

  it('staff caps that fall from one stage to the next', () => {
    expect(issuesFor((c) => void (c.economy.businessRules.stages[2]!.staffCap.sales = 1))).toEqual([
      'Staff caps must never fall from one stage to the next',
    ]);
  });

  it('stage upgrade prices that do not rise', () => {
    expect(
      issuesFor((c) => void (c.economy.businessRules.stages[3]!.upgradePriceMultiple = 8)),
    ).toEqual(['Stage upgrade prices must rise with each stage']);
  });
});

describe('property rule validation rejects', () => {
  it('Building Systems that would push upkeep to zero', () => {
    expect(
      issuesFor((c) => void (c.economy.propertyRules.levelEffectPercent.systemsSaving = 10)),
    ).toEqual(['Building Systems at its max level must leave upkeep above zero']);
  });
});

describe('the automatic ad schedule', () => {
  it('holds the spec §15 numbers in content configuration', () => {
    expect(getContent().economy.ads).toEqual({
      gateAfterForegroundMs: 300_000,
      interstitialMinGapMs: 180_000,
      interstitialDailyCap: 12,
      tapIdleBeforeAdMs: 2_500,
      adBreakCardMs: 1_000,
      afterRewardedQuietMs: 120_000,
      appOpenMinSession: 3,
      appOpenMinAwayMs: 1_800_000,
      appOpenMinGapMs: 14_400_000,
    });
  });

  it('rejects a daily cap that is not a positive whole number', () => {
    const issues = issuesFor((c) => {
      c.economy.ads.interstitialDailyCap = 0;
    });
    expect(issues.length).toBeGreaterThan(0);
  });
});
