import type { CommandResult } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { airlineBusiness, airlineDefinition, airlineRules } from '@/domain/testAirline';
import { businessRules, ownedBusiness, vendingDefinition } from '@/domain/testRules';

import { applyInstallHub, applySetNetwork } from './airlineCommands';
import { fuelOn } from './airlineFuel';
import { applyUpgradeStage } from './growthCommands';
import type { OwnedBusiness } from './owned';
import { settleBusinesses } from './treasury';

const DAY_MS = 600_000;
const economy = { catalog: [airlineDefinition, vendingDefinition], rules: businessRules };
const order = { businessId: 'airline', economy };

function owning(business: OwnedBusiness, day = 0): GameState {
  return {
    ...freshGameState({ saveId: 'fly', economyVersion: 1, wallMs: 0 }),
    clock: { simulationMs: day * DAY_MS, lastWallCheckpointMs: 0 },
    businesses: [business],
  };
}

const airlineAfter = (result: CommandResult) =>
  result.ok ? result.state.businesses[0]?.airline : undefined;

const businessAfter = (result: CommandResult) =>
  result.ok ? result.state.businesses[0] : undefined;

describe('unlocking the airline mechanic (BUS20k)', () => {
  it('opens at Local on the Regional network with the seeded fuel price', () => {
    const startup = ownedBusiness('airline', { units: 3, treasuryCents: dollars('600,000,000') });
    const state = owning(startup, 8);
    const draw = { seed: state.market.seed, businessId: 'airline', rules: airlineRules };
    expect(airlineAfter(applyUpgradeStage(state, { ...order, fromStage: 1 }))).toEqual({
      status: 'active',
      network: 'regional',
      fuel: fuelOn(draw, 8),
      fleet: 'flying',
      hub: 'none',
    });
  });

  it('opens at the next day boundary for an airline that is already Local', () => {
    const local = ownedBusiness('airline', { stage: 2 });
    const settled = settleBusinesses([local], {
      fromMs: 0,
      elapsedMs: DAY_MS,
      economy,
      seed: 'fly',
    });
    expect(settled.businesses[0]?.airline).toMatchObject({ status: 'active', fuel: 'normal' });
  });

  it('refuses a network below Local, and on other businesses', () => {
    const startup = owning(ownedBusiness('airline'));
    expect(applySetNetwork(startup, { ...order, network: 'mixed' })).toEqual({
      ok: false,
      error: 'STAGE_LOCKED',
    });
    const vending = owning(ownedBusiness('vending'));
    expect(applySetNetwork(vending, { businessId: 'vending', economy, network: 'mixed' })).toEqual({
      ok: false,
      error: 'UPGRADE_UNAVAILABLE',
    });
  });
});

describe('flying the network (BUS20k)', () => {
  it('changes network and repositions the fleet for the rest of the day', () => {
    const state = owning(airlineBusiness());
    expect(airlineAfter(applySetNetwork(state, { ...order, network: 'mixed' }))).toMatchObject({
      network: 'mixed',
      fleet: 'repositioning',
    });
  });

  it('refuses the network already flown', () => {
    const state = owning(airlineBusiness());
    expect(applySetNetwork(state, { ...order, network: 'regional' })).toEqual({
      ok: false,
      error: 'INVALID_QUANTITY',
    });
  });

  it('is back at full capacity after the next day boundary', () => {
    const moving = airlineBusiness({ network: 'mixed', fleet: 'repositioning' });
    const settled = settleBusinesses([moving], {
      fromMs: 0,
      elapsedMs: DAY_MS,
      economy,
      seed: 'fly',
    });
    expect(settled.businesses[0]?.airline).toMatchObject({ network: 'mixed', fleet: 'flying' });
  });
});

describe('installing the international hub (BUS20k)', () => {
  it('is locked below Global', () => {
    const local = owning(airlineBusiness({}, { treasuryCents: dollars('40,000,000,000') }));
    expect(applyInstallHub(local, order)).toEqual({ ok: false, error: 'STAGE_LOCKED' });
  });

  it('pays from the treasury as capital spending, once', () => {
    const global = airlineBusiness({}, { stage: 5, treasuryCents: dollars('40,000,000,000') });
    expect(businessAfter(applyInstallHub(owning(global), order))).toMatchObject({
      treasuryCents: dollars('2,500,000,000'),
      capitalizedSpendCents: dollars('37,750,000,000'),
      airline: { hub: 'installed' },
    });
    const again = applyInstallHub(
      owning(airlineBusiness({ hub: 'installed' }, { stage: 5 })),
      order,
    );
    expect(again).toEqual({ ok: false, error: 'MAX_LEVEL' });
  });
});
