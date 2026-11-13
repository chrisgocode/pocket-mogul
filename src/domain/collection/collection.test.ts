import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { netWorthBreakdown } from '@/domain/progression';
import { DAY_MS, testCollection as economy } from '@/domain/testCollection';
import { propertyRules } from '@/domain/testRules';

import { listPriceCents, ownedValueCents } from './appraisal';
import { auctionLots, daysUntilNewLots } from './auction';
import { applyBuyCollectible, applySellCollectible } from './commands';

const seed = 'lots';
const [, , sketch, meteorite] = economy.pieces;

const onDay = (day: number, change: Partial<GameState> = {}): GameState => {
  const fresh = freshGameState({ saveId: 'collector', economyVersion: 2, wallMs: 0 });
  return {
    ...fresh,
    cashCents: dollars('5,000'),
    clock: { simulationMs: day * DAY_MS, lastWallCheckpointMs: 0 },
    market: { ...fresh.market, seed },
    ...change,
  };
};

const lotIds = (day: number, maxTier: number) =>
  auctionLots({ seed, day, economy, maxTier }).map((piece) => piece.id);

const wine = { pieceId: 'table_red', acquiredDay: 0, paidCents: dollars('500') };

const valueAt = (pieceId: string, day: number) =>
  ownedValueCents({ ...wine, pieceId }, { seed, day, economy });

const list = (piece: typeof sketch, day: number) => listPriceCents(piece!, { seed, day, economy });

const buy = (state: GameState, pieceId: string, price: string) =>
  applyBuyCollectible(state, { pieceId, priceCents: dollars(price), economy });

describe('the auction house (COL02)', () => {
  it('offers the same lots for six business days, then draws again', () => {
    expect([0, 5].map((day) => lotIds(day, 1))).toEqual([
      ['roadster', 'table_red'],
      ['roadster', 'table_red'],
    ]);
    expect(lotIds(6, 1)).toEqual(['table_red', 'sketch']);
    expect([daysUntilNewLots(0, economy), daysUntilNewLots(5, economy)]).toEqual([6, 1]);
  });

  it('only offers pieces from tiers the player has unlocked', () => {
    expect(lotIds(18, 1)).toEqual(['table_red', 'roadster']);
    expect(lotIds(18, 4)).toEqual(['meteorite', 'roadster']);
  });
});

describe('appraised value (COL03)', () => {
  it('follows the category age curve and stops at its last point', () => {
    expect([0, 5, 10, 40].map((day) => valueAt('table_red', day))).toEqual([
      dollars('500'),
      dollars('550'),
      dollars('600'),
      dollars('600'),
    ]);
    expect([4, 6, 8].map((day) => valueAt('roadster', day))).toEqual([
      dollars('800'),
      dollars('1,050'),
      dollars('1,300'),
    ]);
  });

  it('swings smoothly day to day for art and in steps for curiosities', () => {
    expect([0, 1, 2].map((day) => list(sketch, day))).toEqual([
      dollars('1,659.40'),
      dollars('1,677.80'),
      dollars('1,696.40'),
    ]);
    expect([0, 11, 12].map((day) => list(meteorite, day))).toEqual([
      dollars('9,351'),
      dollars('9,351'),
      dollars('8,736.30'),
    ]);
  });

  it('counts the collection in net worth at its appraised value', () => {
    const rules = {
      tierUnlocks: {},
      properties: { catalog: [], rules: propertyRules },
      collection: economy,
      instruments: [],
    };
    expect(netWorthBreakdown(onDay(5, { collectibles: [wine] }), rules)).toMatchObject({
      collectionCents: dollars('550'),
      netWorthCents: dollars('5,550'),
    });
  });
});

describe('buying and selling a piece (COL04)', () => {
  it('buys a lot at its list price and remembers the day and price', () => {
    expect(buy(onDay(0), 'table_red', '500')).toMatchObject({
      ok: true,
      cashChangeCents: dollars('-500'),
      state: { cashCents: dollars('4,500'), collectibles: [wine] },
    });
  });

  it('refuses a piece that is not a lot today, a stale price, a repeat and an empty wallet', () => {
    expect(buy(onDay(0), 'sketch', '1,659.40')).toEqual({ ok: false, error: 'STALE_QUOTE' });
    expect(buy(onDay(0), 'table_red', '499')).toEqual({ ok: false, error: 'STALE_QUOTE' });
    expect(buy(onDay(0), 'vase', '1')).toEqual({ ok: false, error: 'UNKNOWN_ASSET' });
    expect(buy(onDay(0, { collectibles: [wine] }), 'table_red', '500')).toEqual({
      ok: false,
      error: 'ALREADY_OWNED',
    });
    expect(buy(onDay(0, { cashCents: dollars('499') }), 'table_red', '500')).toEqual({
      ok: false,
      error: 'INSUFFICIENT_CASH',
    });
  });

  it('sells for 90 percent of the appraised value', () => {
    const holding = onDay(5, { collectibles: [wine] });
    expect(applySellCollectible(holding, { pieceId: 'table_red', economy })).toMatchObject({
      ok: true,
      cashChangeCents: dollars('495'),
      state: { cashCents: dollars('5,495'), collectibles: [] },
    });
    expect(applySellCollectible(onDay(5), { pieceId: 'table_red', economy })).toEqual({
      ok: false,
      error: 'NOT_OWNED',
    });
  });
});
