import { dollars } from './money';
import { quoteWalletUpgrade, walletArtworkStage, type WalletRules } from './wallet';

const rules: WalletRules = {
  baseCents: dollars('1'),
  perLevelCents: dollars('0.50'),
  maxLevel: 100,
  upgradeBaseCents: dollars('100'),
  upgradeGrowth: { numerator: 145, denominator: 100 },
  artworkLevels: [0, 10, 25, 50, 100],
};

describe('wallet upgrade quotes', () => {
  it.each([
    [0, '100'],
    [1, '145'],
    [2, '210.25'],
    [3, '304.87'],
  ])('prices the upgrade from level %p at $%p', (level, price) => {
    expect(quoteWalletUpgrade(level, rules)).toMatchObject({
      status: 'available',
      priceCents: dollars(price),
    });
  });

  it('quotes current and next earnings per tap from level 0 (AC03)', () => {
    expect(quoteWalletUpgrade(0, rules)).toEqual({
      status: 'available',
      level: 0,
      payoutCents: 100n,
      nextPayoutCents: 150n,
      priceCents: 10_000n,
    });
  });

  it('offers no upgrade at level 100 (MAX_LEVEL)', () => {
    expect(quoteWalletUpgrade(100, rules)).toEqual({
      status: 'max',
      level: 100,
      payoutCents: 5_100n,
    });
  });
});

describe('wallet card artwork', () => {
  it.each([
    [0, 0],
    [9, 0],
    [10, 1],
    [24, 1],
    [25, 2],
    [49, 2],
    [50, 3],
    [99, 3],
    [100, 4],
  ])('shows artwork stage %p at level %p', (level, stage) => {
    expect(walletArtworkStage(level, rules.artworkLevels)).toBe(stage);
  });
});
