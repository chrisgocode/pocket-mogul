import { getContent } from '@/content';
import type { GameCommand } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

import { engineStep } from './balance/engineStep';
import { selectCashCents } from './cashView';
import { selectShelf } from './collectionSetsView';
import { selectCollection } from './collectionView';
import type { GameSnapshot } from './game';
import { selectGoals } from './goalsView';
import { encodeSave } from './saveFormat';
import { selectTapCard } from './tapCardView';
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

const showDinghy: GameCommand = { type: 'SetShowpiece', pieceId: 'puffin_dinghy' };

const HARBOUR_FLEET = [
  'puffin_dinghy',
  'sandpiper_daysailer',
  'osprey_bay_cruiser',
  'larkspur_32_sloop',
  'corsair_sport_fisher',
];

const ownedAt = (pieceId: string) => ({ pieceId, acquiredDay: 0, paidCents: dollars('500') });

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

  it('round-trips the showpiece', () => {
    const shown = run(run(collector(), buyDinghy), showDinghy);
    expect(currentState(encodeSave(shown)).showpiece).toBe('puffin_dinghy');
  });
});

describe('sets, perks and the showpiece (COL07, COL08)', () => {
  const fleet = collector({ collectibles: HARBOUR_FLEET.map(ownedAt) });

  it('lists each set with what is held and what is missing', () => {
    const { sets } = selectCollection(snapshotOf(run(collector(), buyDinghy)), content);
    expect(sets).toMatchObject({ completedCount: 0, tapBonusPercent: 0, resaleBonusPercent: 0 });
    expect(sets.sets).toHaveLength(12);
    expect(sets.sets.find((set) => set.id === 'harbour_fleet')).toMatchObject({
      name: 'The Harbour Fleet',
      categoryName: 'Yachts',
      perk: { kind: 'tap', percent: 2 },
      status: 'open',
      heldCount: 1,
      pieceCount: 5,
      missing: [
        'Sandpiper Daysailer',
        'Osprey Bay Cruiser',
        'Larkspur 32 Sloop',
        'Corsair Sport Fisher',
      ],
    });
  });

  it('pays the tap perk of a finished set on taps, saved and pending', () => {
    expect(selectCollection(snapshotOf(fleet), content).sets).toMatchObject({
      completedCount: 1,
      tapBonusPercent: 2,
    });
    expect(selectTapCard(snapshotOf(fleet), content).perTapCents).toBe(dollars('1.02'));
    expect(run(fleet, { type: 'TapBatch', taps: 10 }).cashCents).toBe(dollars('3,010.20'));
    const pending = { ...snapshotOf(fleet), pendingTaps: 10, pendingBoostedTaps: 4 };
    expect(selectCashCents(pending, content)).toBe(dollars('3,026.52'));
  });

  it('ends the perk when a piece of the set is sold', () => {
    const sold = run(fleet, { type: 'SellCollectible', pieceId: 'puffin_dinghy' });
    expect(selectTapCard(snapshotOf(sold), content).perTapCents).toBe(dollars('1'));
  });

  it('puts a piece on show for Earn and the Profile shelf', () => {
    const shown = run(run(collector(), buyDinghy), showDinghy);
    expect(selectCollection(snapshotOf(shown), content).pieces).toMatchObject([
      { display: 'on_show' },
    ]);
    expect(selectShelf(shown, content)).toEqual({
      heldCount: 1,
      pieceCount: 60,
      completedSets: 0,
      setCount: 12,
      showpiece: { name: 'Puffin Dinghy', note: 'Three-metre sailing dinghy' },
    });
    expect(selectShelf(collector(), content).showpiece).toBeUndefined();
  });
});

describe('collection goals (COL09)', () => {
  it('reaches First piece on the first purchase and shows progress on the rest', () => {
    const bought = run(collector(), buyDinghy);
    const goals = selectGoals(bought, content).goals.filter((goal) =>
      goal.id.startsWith('collection_'),
    );
    expect(goals).toMatchObject([
      { status: 'reached', title: 'First piece' },
      { status: 'open', progressLabel: 'Categories collected 1 of 6' },
      { status: 'open', progressLabel: 'Sets finished 0 of 1' },
      { status: 'open', progressLabel: 'Sets finished 0 of 12' },
    ]);
  });
});
