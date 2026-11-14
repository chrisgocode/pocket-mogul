import { getContent } from '@/content';
import type { GameCommand } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { collectionProgress } from '@/domain/collection/sets';
import { dollars } from '@/domain/money';

import { engineStep } from './balance/engineStep';
import { selectShelf } from './collectionSetsView';
import { selectCollection } from './collectionView';
import { collectionEconomy } from './economy';
import type { GameSnapshot } from './game';
import { PURCHASE_CATALOGUE } from './purchaseCatalogue';
import { selectTapCard } from './tapCardView';
import { withoutIncidents } from './testGame';

const content = withoutIncidents(getContent());
const LOT_DAYS = content.collection.lotDays;
const DAY_MS = content.economy.businessRules.dayMs;

const VAULT = content.collection.sets.find((set) => set.id === 'collectors_vault')?.pieceIds ?? [];
const OPEN_SETS = content.collection.sets.filter((set) => set.access === 'open');
const UNLOCKED_VAULT = ['railway_share_certificate', 'brass_ticker_machine', 'bank_vault_door'];

const PASS = { collectorsPass: ['purchase-1'] };

const FRESH = freshGameState({
  saveId: 'collector',
  economyVersion: content.economyVersion,
  wallMs: 0,
});

const WEALTHY =
  engineStep(
    { ...FRESH, cashCents: dollars('50,000') },
    { content, command: { type: 'AdvanceTime' }, elapsedMs: 0 },
  ).state ?? FRESH;

const collector = (change: Partial<GameState> = {}): GameState => ({ ...WEALTHY, ...change });

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

const viewOf = (state: GameState) => selectCollection(snapshotOf(state), content);
const lotIds = (state: GameState) => viewOf(state).lots.map((lot) => lot.piece.id);
const vaultOf = (state: GameState) =>
  viewOf(state).sets.sets.find((set) => set.id === 'collectors_vault');

const ownedOn = (day: number) => (pieceId: string) => ({
  pieceId,
  acquiredDay: day,
  paidCents: dollars('500'),
});

const buyFourthLot = (state: GameState): GameCommand => {
  const lot = viewOf(state).lots[3];
  return {
    type: 'BuyCollectible',
    pieceId: lot?.piece.id ?? 'railway_share_certificate',
    priceCents: lot?.priceCents ?? dollars('0'),
  };
};

function after(state: GameState, command: GameCommand): GameState {
  const step = engineStep(state, { content, command, elapsedMs: 0 });
  expect(step.outcome).toMatchObject({ ok: true });
  return step.state!;
}

const sale = (pieceId: string | undefined): GameCommand => ({
  type: 'SellCollectible',
  pieceId: pieceId ?? '',
});

const everyOpenSet = OPEN_SETS.flatMap((set) => set.pieceIds).map(ownedOn(0));

describe('Collector’s pass (#158)', () => {
  it('is sold in the Store', () => {
    expect(PURCHASE_CATALOGUE).toContainEqual({
      productId: 'pm_collectors_pass',
      entitlements: ['collectorsPass'],
    });
  });

  it('offers three lots and shows The Vault locked without the pass', () => {
    const state = collector();
    expect(lotIds(state)).toHaveLength(3);
    expect(lotIds(state).filter((pieceId) => VAULT.includes(pieceId))).toEqual([]);
    expect(viewOf(state)).toMatchObject({ pieceCount: 60, sets: { setCount: 12 } });
    expect(vaultOf(state)).toMatchObject({
      name: 'The Vault',
      status: 'locked',
      heldCount: 0,
      perk: { kind: 'tap', percent: 5 },
    });
    expect(vaultOf(state)?.missing).toHaveLength(5);
  });

  it('adds a fourth lot from The Vault and leaves the other three as they were', () => {
    const state = collector({ entitlements: PASS });
    expect(lotIds(state).slice(0, 3)).toEqual(lotIds(collector()));
    expect(viewOf(state).lots[3]).toMatchObject({ access: 'pass', status: 'available' });
    expect(UNLOCKED_VAULT).toContain(lotIds(state)[3]);
    expect(viewOf(state)).toMatchObject({ pieceCount: 65, sets: { setCount: 13 } });
    expect(vaultOf(state)).toMatchObject({ status: 'open' });
  });

  it('sells the fourth lot to a pass holder only', () => {
    const state = collector({ entitlements: PASS });
    const order = buyFourthLot(state);
    const bought = after(state, order);
    expect(bought.collectibles.map((owned) => owned.pieceId)).toEqual(lotIds(state).slice(3));
    expect(viewOf(bought).lots[3]).toMatchObject({ status: 'owned' });
    const refused = engineStep(collector(), { content, command: order, elapsedMs: 0 });
    expect(refused.outcome).toEqual({ ok: false, error: 'STALE_QUOTE' });
  });

  it('offers a Vault piece not bought before this auction, then an ordinary fourth lot', () => {
    const later = { clock: { ...collector().clock, simulationMs: LOT_DAYS * DAY_MS } };
    const one = collector({
      ...later,
      entitlements: PASS,
      collectibles: [ownedOn(0)('railway_share_certificate')],
    });
    expect(viewOf(one).lots[3]).toMatchObject({ access: 'pass', status: 'available' });
    expect(UNLOCKED_VAULT.slice(1)).toContain(lotIds(one)[3]);
    const all = collector({
      ...later,
      entitlements: PASS,
      collectibles: UNLOCKED_VAULT.map(ownedOn(0)),
    });
    expect(lotIds(all)).toHaveLength(4);
    expect(viewOf(all).lots[3]).toMatchObject({ access: 'open' });
    expect(new Set(lotIds(all)).size).toBe(4);
  });
});

describe('The Vault (#158)', () => {
  it('keeps its perk inside the +30% cap on tap income', () => {
    const vault = VAULT.map(ownedOn(0));
    const vaultOnly = collector({ entitlements: PASS, collectibles: vault });
    expect(viewOf(vaultOnly).sets).toMatchObject({ completedCount: 1, tapBonusPercent: 5 });
    expect<bigint>(selectTapCard(snapshotOf(vaultOnly), content).perTapCents).toBe(dollars('1.05'));
    const everything = collector({
      entitlements: PASS,
      collectibles: [...everyOpenSet, ...vault],
    });
    expect(viewOf(everything).sets).toMatchObject({
      completedCount: 13,
      setCount: 13,
      tapBonusPercent: 30,
      resaleBonusPercent: 6,
    });
    expect<bigint>(selectTapCard(snapshotOf(everything), content).perTapCents).toBe(
      dollars('1.30'),
    );
  });

  it('keeps the pieces and closes the fourth lot when the pass is revoked', () => {
    const holder = collector({ entitlements: PASS });
    const fourth = lotIds(holder).slice(3);
    const revoked: GameState = { ...after(holder, buyFourthLot(holder)), entitlements: {} };
    expect(lotIds(revoked)).toEqual(lotIds(collector()));
    expect(viewOf(revoked).pieces.map((owned) => owned.piece.id)).toEqual(fourth);
    expect(viewOf(revoked)).toMatchObject({ pieceCount: 65, sets: { setCount: 13 } });
    expect(vaultOf(revoked)).toMatchObject({ status: 'locked', heldCount: 1 });
    expect(selectShelf(revoked, content)).toMatchObject({ heldCount: 1, pieceCount: 65 });
    expect(after(revoked, sale(fourth[0])).collectibles).toEqual([]);
  });

  it('leaves the Every set goal at the twelve sets everyone can finish', () => {
    const economy = collectionEconomy(content);
    const setsOf = (state: GameState) =>
      collectionProgress(state.collectibles, { economy, measure: 'sets' });
    const twelve = collector({ collectibles: everyOpenSet });
    const elevenAndVault = collector({
      entitlements: PASS,
      collectibles: [...everyOpenSet.slice(5), ...VAULT.map(ownedOn(0))],
    });
    expect(content.goals.find((goal) => goal.id === 'collection_every_set')).toMatchObject({
      count: 12,
    });
    expect(setsOf(twelve)).toBe(12);
    expect(setsOf(elevenAndVault)).toBe(11);
    expect(viewOf(elevenAndVault).sets.completedCount).toBe(12);
  });
});
