import { getContent } from '@/content';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollarPrice, dollars, units } from '@/domain/money';

import type { GameSnapshot } from './game';
import { presetQuantity, readEntry, selectTradeTicket, type TradeEntry } from './tradeTicket';

const content = getContent();

function snapshotWith(overrides: Partial<GameState>): GameSnapshot {
  const state = {
    ...freshGameState({ saveId: 'ticket', economyVersion: 1, wallMs: 0 }),
    tradingUnlocked: true,
    ...overrides,
  };
  return {
    state,
    pendingTaps: 0,
    pendingBoostedTaps: 0,
    unsavedElapsedMs: 0,
    unsavedBoostMs: 0,
    tapBoostAd: 'loading',
    automaticAd: 'none',
    notice: { kind: 'none' },
  };
}

const holding = (quantity: string) => ({
  positions: [
    {
      instrumentId: 'prism',
      quantity: units(quantity),
      remainingBasisCents: dollars('0'),
      realizedProfitCents: dollars('0'),
    },
  ],
});

const ticket = (snapshot: GameSnapshot, entry: TradeEntry) =>
  selectTradeTicket(snapshot, {
    assetId: 'prism',
    side: entry.side,
    order: readEntry(snapshot, { assetId: 'prism', entry, content }),
    content,
  });

describe('trade ticket', () => {
  it('quotes an entered share count at the current tick', () => {
    const result = ticket(snapshotWith({ cashCents: dollars('1,000') }), {
      side: 'buy',
      mode: 'quantity',
      text: '4',
    });
    expect(result).toMatchObject({
      status: 'ready',
      tick: 0,
      quote: { quantity: units('4'), cashChangeCents: dollars('-100.25') },
    });
  });

  it('converts a dollar amount to the most shares it pays for, fee included', () => {
    const result = ticket(snapshotWith({ cashCents: dollars('1,000') }), {
      side: 'buy',
      mode: 'dollars',
      text: '100.25',
    });
    expect(result).toMatchObject({ status: 'ready', quote: { quantity: units('4') } });
  });

  it('keeps the shares a dollar amount bought when the price moves', () => {
    const typedAt = snapshotWith({ cashCents: dollars('1,000') });
    const entry = { side: 'buy', mode: 'dollars', text: '100.25' } as const;
    const order = readEntry(typedAt, { assetId: 'prism', entry, content });
    const moved = snapshotWith({
      cashCents: dollars('1,000'),
      market: { ...typedAt.state.market, tick: 1, quotes: { prism: dollarPrice('26') } },
    });
    expect(
      selectTradeTicket(moved, { assetId: 'prism', side: 'buy', order, content }),
    ).toMatchObject({
      status: 'ready',
      tick: 1,
      quote: { quantity: units('4'), cashChangeCents: dollars('-104.26') },
    });
  });

  it('explains an entry it cannot read', () => {
    const snapshot = snapshotWith({ cashCents: dollars('1,000') });
    expect(ticket(snapshot, { side: 'buy', mode: 'quantity', text: '1.0000001' })).toEqual({
      status: 'invalid',
      tick: 0,
      error: 'INVALID_QUANTITY',
    });
    expect(ticket(snapshot, { side: 'buy', mode: 'quantity', text: '' })).toEqual({
      status: 'empty',
      tick: 0,
    });
  });

  it('refuses with the same errors as the trade command', () => {
    const snapshot = snapshotWith({ cashCents: dollars('100'), ...holding('2') });
    expect(ticket(snapshot, { side: 'buy', mode: 'quantity', text: '4' })).toMatchObject({
      status: 'refused',
      error: 'INSUFFICIENT_CASH',
      quote: { cashChangeCents: dollars('-100.25') },
    });
    expect(ticket(snapshot, { side: 'sell', mode: 'quantity', text: '3' })).toMatchObject({
      status: 'refused',
      error: 'INSUFFICIENT_HOLDING',
    });
  });
});

const preset = (snapshot: GameSnapshot, side: 'buy' | 'sell', percent: number) =>
  presetQuantity(snapshot, { assetId: 'prism', side, percent, content });

describe('trade presets', () => {
  it('buys with a share of cash, fee included', () => {
    const snapshot = snapshotWith({ cashCents: dollars('401') });
    expect(preset(snapshot, 'buy', 100)).toBe(units('16'));
    expect(preset(snapshot, 'buy', 25)).toBe(units('4'));
  });

  it('sells a share of the holding, all of it at 100%', () => {
    const snapshot = snapshotWith(holding('10.000003'));
    expect(preset(snapshot, 'sell', 50)).toBe(units('5.000001'));
    expect(preset(snapshot, 'sell', 100)).toBe(units('10.000003'));
  });
});
