import { getContent } from '@/content';
import type { GameCommand } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

import { engineStep } from './balance/engineStep';
import { selectCollection } from './collectionView';
import type { GameSnapshot } from './game';
import { encodeSave } from './saveFormat';
import { quoteTaxCommand } from './taxQuotes';
import { currentState, withoutIncidents } from './testGame';

const content = withoutIncidents(getContent());
const DAY_MS = content.economy.businessRules.dayMs;

const collector = (change: Partial<GameState> = {}): GameState => ({
  ...freshGameState({ saveId: 'collector', economyVersion: content.economyVersion, wallMs: 0 }),
  cashCents: dollars('3,000'),
  ...change,
});

const snapshotOf = (state: GameState): GameSnapshot => ({
  state,
  pendingTaps: 0,
  pendingBoostedTaps: 0,
  unsavedElapsedMs: 0,
  unsavedBoostMs: 0,
  tapBoostAd: 'loading',
  automaticAd: 'none',
  notice: { kind: 'none' },
});

function run(state: GameState, command: GameCommand, elapsedMs = 0): GameState {
  const step = engineStep(state, { content, command, elapsedMs });
  expect(step.outcome).toMatchObject({ ok: true });
  return step.state!;
}

const buyDinghy: GameCommand = {
  type: 'BuyCollectible',
  pieceId: 'puffin_dinghy',
  priceCents: dollars('941.67'),
};

describe('the Collection (COL01)', () => {
  it('offers three first-tier lots to a new player and says which they can afford', () => {
    const view = selectCollection(snapshotOf(collector()), content);
    expect(view).toMatchObject({ pieceCount: 60, daysUntilNewLots: 6, lotDays: 6, pieces: [] });
    expect(
      view.lots.map((lot) => [lot.piece.name, lot.categoryName, lot.priceCents, lot.affordable]),
    ).toEqual([
      ['Puffin Dinghy', 'Yachts', dollars('941.67'), true],
      ['Osprey Bay Cruiser', 'Yachts', dollars('3,814.40'), false],
      ['Sandpiper Daysailer', 'Yachts', dollars('2,501.50'), true],
    ]);
  });

  it('buys a lot, counts it in net worth and marks the lot as owned', () => {
    const bought = run(collector(), buyDinghy);
    const view = selectCollection(snapshotOf(bought), content);
    expect(bought).toMatchObject({
      cashCents: dollars('2,058.33'),
      peakNetWorthCents: dollars('3,000'),
      collectibles: [{ pieceId: 'puffin_dinghy', acquiredDay: 0, paidCents: dollars('941.67') }],
    });
    expect(view).toMatchObject({
      valueCents: dollars('941.67'),
      lots: [{ status: 'owned' }, { status: 'available' }, { status: 'available' }],
      pieces: [{ gainCents: dollars('0'), saleCents: dollars('847.50'), daysHeld: 0 }],
    });
  });

  it('logs the purchase and the sale in the activity history', () => {
    const sold = run(run(collector(), buyDinghy), {
      type: 'SellCollectible',
      pieceId: 'puffin_dinghy',
    });
    expect(sold.activity.lifetime).toMatchObject({
      byKind: { purchase: 1, sale: 1 },
      spentCents: dollars('941.67'),
      proceedsCents: dollars('847.50'),
    });
  });

  it('refuses a price quoted on an earlier day', () => {
    const later = engineStep(collector(), { content, command: buyDinghy, elapsedMs: DAY_MS });
    expect(later.outcome).toEqual({ ok: false, error: 'STALE_QUOTE' });
  });
});

describe('collectibles and tax (TAX01)', () => {
  it('records the price paid as basis and the sale as a capital loss or gain', () => {
    const bought = run(collector(), buyDinghy);
    expect(bought.tax).toMatchObject({
      basis: { 'collectible:puffin_dinghy': dollars('941.67') },
    });
    const command = {
      type: 'SellCollectible',
      pieceId: 'puffin_dinghy',
      quotedRevision: bought.revision,
    } as const;
    expect(quoteTaxCommand(bought, { command, content })).toMatchObject({
      basisCents: dollars('941.67'),
      gainCents: dollars('-94.17'),
      cashChangeCents: dollars('847.50'),
    });
    const sold = run(bought, command);
    expect(sold).toMatchObject({ cashCents: dollars('2,905.83'), collectibles: [] });
    expect(sold.tax).toMatchObject({ basis: { 'collectible:puffin_dinghy': dollars('0') } });
  });

  it('gives a piece owned before taxes start a basis of what selling would pay', () => {
    const owned = { pieceId: 'puffin_dinghy', acquiredDay: 0, paidCents: dollars('941.67') };
    const started = run(collector({ collectibles: [owned] }), { type: 'AdvanceTime' });
    expect(started.tax).toMatchObject({
      basis: { 'collectible:puffin_dinghy': dollars('847.50') },
    });
  });
});

describe('the saved collection (COL05)', () => {
  it('round-trips owned pieces with the day and price paid', () => {
    const bought = run(collector(), buyDinghy);
    expect(currentState(encodeSave(bought)).collectibles).toEqual(bought.collectibles);
  });
});
