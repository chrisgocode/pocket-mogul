import type { CommandResult } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import {
  activeDelivery,
  contract,
  deliveryBusiness,
  deliveryFlagship,
  offersOf,
} from '@/domain/testDelivery';
import { businessRules, ownedBusiness, vendingDefinition } from '@/domain/testRules';

import {
  applyAcceptContract,
  applyDeclineContract,
  applyInstallSortingHub,
} from './deliveryCommands';
import type { ContractOffer } from './deliveryState';
import { applyUpgradeStage } from './growthCommands';
import type { OwnedBusiness } from './owned';
import { settleBusinesses } from './treasury';

const DAY_MS = 600_000;
const economy = { catalog: [deliveryFlagship, vendingDefinition], rules: businessRules };
const order = { businessId: 'delivery', economy };

const offer: ContractOffer = {
  id: '2-0',
  clientId: 'brightcart',
  parcelsPerDay: 5_000,
  rateCents: dollars('11'),
  penaltyCents: dollars('22'),
  days: 4,
  postedDay: 2,
};

function owning(business: OwnedBusiness, day = 0): GameState {
  return {
    ...freshGameState({ saveId: 'vans', economyVersion: 1, wallMs: 0 }),
    clock: { simulationMs: day * DAY_MS, lastWallCheckpointMs: 0 },
    businesses: [business],
  };
}

const businessAfter = (result: CommandResult) =>
  result.ok ? result.state.businesses[0] : undefined;

const stateAfter = (result: CommandResult) =>
  result.ok ? result.state : owning(ownedBusiness('x'));

const settle = (business: OwnedBusiness, period: { fromMs: number; elapsedMs: number }) =>
  settleBusinesses([business], { ...period, economy, seed: 'vans' });

type Played = { readonly business: OwnedBusiness; readonly toCashCents: bigint };

function playDay(sofar: Played, day: number): Played {
  const next = settle(sofar.business, { fromMs: day * DAY_MS, elapsedMs: DAY_MS });
  return {
    business: next.businesses[0] ?? sofar.business,
    toCashCents: sofar.toCashCents + next.toCashCents,
  };
}

describe('unlocking the delivery mechanic (BUS20c)', () => {
  it('opens at Local with a seeded offers board and no contracts', () => {
    const startup = ownedBusiness('delivery', { units: 3, treasuryCents: dollars('500,000') });
    const result = applyUpgradeStage(owning(startup, 3), { ...order, fromStage: 1 });
    expect(businessAfter(result)?.delivery).toMatchObject({
      status: 'active',
      contracts: [],
      history: [],
    });
    expect(offersOf(businessAfter(result)).map((each) => each.id)).toEqual(['3-0', '3-1', '3-2']);
  });

  it('rejects contracts before Local and on another business', () => {
    const accept = { ...order, offerId: '2-0' };
    expect(applyAcceptContract(owning(ownedBusiness('delivery')), accept)).toEqual({
      ok: false,
      error: 'STAGE_LOCKED',
    });
    const vending = owning(ownedBusiness('vending'));
    expect(applyAcceptContract(vending, { ...accept, businessId: 'vending' })).toEqual({
      ok: false,
      error: 'UPGRADE_UNAVAILABLE',
    });
  });
});

describe('answering offers (BUS20c)', () => {
  const state = owning(deliveryBusiness({ offers: [offer] }), 3);

  it('accepts an offer as a contract that runs for its days from today', () => {
    const accepted = businessAfter(applyAcceptContract(state, { ...order, offerId: '2-0' }));
    expect(accepted?.delivery).toMatchObject({
      offers: [],
      contracts: [{ id: '2-0', parcelsPerDay: 5_000, rateCents: dollars('11'), endsDay: 7 }],
    });
  });

  it('declines an offer, leaving the slot empty until the next day', () => {
    const declined = businessAfter(applyDeclineContract(state, { ...order, offerId: '2-0' }));
    expect(declined?.delivery).toMatchObject({ offers: [], contracts: [] });
  });

  it('refuses an offer that has gone', () => {
    expect(applyAcceptContract(state, { ...order, offerId: '1-0' })).toEqual({
      ok: false,
      error: 'STALE_QUOTE',
    });
  });
});

describe('the sorting hub (BUS20c)', () => {
  it('unlocks at Global and is paid once from the treasury as capital', () => {
    const local = owning(deliveryBusiness({}, { treasuryCents: dollars('40,000,000') }));
    expect(applyInstallSortingHub(local, order)).toEqual({ ok: false, error: 'STAGE_LOCKED' });
    const global = owning(deliveryBusiness({}, { stage: 5, treasuryCents: dollars('40,000,000') }));
    const result = applyInstallSortingHub(global, order);
    expect(businessAfter(result)).toMatchObject({
      treasuryCents: dollars('2,500,000'),
      capitalizedSpendCents: dollars('37,750,000'),
      delivery: { sortingHub: 'installed' },
    });
    expect(applyInstallSortingHub(stateAfter(result), order)).toEqual({
      ok: false,
      error: 'MAX_LEVEL',
    });
  });
});

describe('delivery days played live or offline (AC37)', () => {
  const busy = deliveryBusiness(
    { offers: [offer], contracts: [contract({ parcelsPerDay: 30_000, endsDay: 6 })] },
    { treasuryCents: dollars('100'), staff: { operations: 1, sales: 0, manager: 1 } },
  );

  it('gives identical offers, contracts, reputation and balances', () => {
    const offline = settle(busy, { fromMs: 0, elapsedMs: 30 * DAY_MS });
    const days = Array.from({ length: 30 }, (_, day) => day);
    const live = days.reduce(playDay, { business: busy, toCashCents: 0n });
    expect(live.business).toEqual(offline.businesses[0]);
    expect(live.toCashCents).toBe(offline.toCashCents);
    const delivery = activeDelivery(offline.businesses[0]);
    expect(delivery.contracts).toEqual([]);
    expect(delivery.history).toHaveLength(10);
    expect(delivery.offers.map((each) => each.id)).toEqual(['29-0', '29-1', '30-0']);
  });
});
