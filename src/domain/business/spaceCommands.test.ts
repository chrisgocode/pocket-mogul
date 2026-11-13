import type { CommandResult } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { businessRules, ownedBusiness, vendingDefinition } from '@/domain/testRules';
import { spaceBusiness, spaceDefinition, spaceRules } from '@/domain/testSpace';

import { applyUpgradeStage } from './growthCommands';
import type { OwnedBusiness } from './owned';
import { applyAnswerPayloadOffer, applyInstallBoosters, applySetCadence } from './spaceCommands';
import { launchWeatherOn, payloadOfferOn } from './spaceWeather';
import { settleBusinesses } from './treasury';

const DAY_MS = 600_000;
const economy = { catalog: [spaceDefinition, vendingDefinition], rules: businessRules };
const order = { businessId: 'space_launch', economy };

function owning(business: OwnedBusiness, day = 0): GameState {
  return {
    ...freshGameState({ saveId: 'lift', economyVersion: 1, wallMs: 0 }),
    clock: { simulationMs: day * DAY_MS, lastWallCheckpointMs: 0 },
    businesses: [business],
  };
}

const spaceAfter = (result: CommandResult) =>
  result.ok ? result.state.businesses[0]?.space : undefined;

const businessAfter = (result: CommandResult) =>
  result.ok ? result.state.businesses[0] : undefined;

const drawIn = (state: GameState) => ({
  seed: state.market.seed,
  businessId: 'space_launch',
  rules: spaceRules,
});

describe('unlocking the launch mechanic (BUS20l)', () => {
  it('opens at Local on the Standard cadence with the seeded weather and no contracts', () => {
    const startup = ownedBusiness('space_launch', {
      units: 3,
      treasuryCents: dollars('2,000,000,000'),
    });
    const state = owning(startup, 8);
    expect(spaceAfter(applyUpgradeStage(state, { ...order, fromStage: 1 }))).toEqual({
      status: 'active',
      cadence: 'standard',
      weather: launchWeatherOn(drawIn(state), 8),
      contracts: [],
      answeredOffer: -1,
      boosters: 'none',
    });
  });

  it('opens at the next day boundary for a company that is already Local', () => {
    const local = ownedBusiness('space_launch', { stage: 2 });
    const settled = settleBusinesses([local], {
      fromMs: 0,
      elapsedMs: DAY_MS,
      economy,
      seed: 'lift',
    });
    expect(settled.businesses[0]?.space).toMatchObject({ status: 'active', weather: 'clear' });
  });

  it('refuses changes below Local, and on other businesses', () => {
    const startup = owning(ownedBusiness('space_launch'));
    expect(applySetCadence(startup, { ...order, cadence: 'rapid' })).toEqual({
      ok: false,
      error: 'STAGE_LOCKED',
    });
    const vending = owning(ownedBusiness('vending'));
    expect(applySetCadence(vending, { businessId: 'vending', economy, cadence: 'rapid' })).toEqual({
      ok: false,
      error: 'UPGRADE_UNAVAILABLE',
    });
  });
});

describe('running launches (BUS20l)', () => {
  it('changes cadence for free', () => {
    const result = applySetCadence(owning(spaceBusiness()), { ...order, cadence: 'careful' });
    expect(spaceAfter(result)).toMatchObject({ cadence: 'careful' });
    expect(result).toMatchObject({ ok: true, cashChangeCents: 0n });
  });

  it('accepts the open offer as a contract sized to the pads, with its rate and penalty', () => {
    const state = owning(spaceBusiness({}, { units: 2 }), 4);
    const offer = payloadOfferOn(drawIn(state), 4);
    const result = applyAnswerPayloadOffer(state, {
      ...order,
      offerId: offer.id,
      answer: 'accept',
    });
    expect(spaceAfter(result)).toMatchObject({
      answeredOffer: offer.id,
      contracts: [
        {
          clientId: offer.clientId,
          parcelsPerDay: offer.sizePercent,
          rateCents: BigInt(offer.rateBps) * 20_000n,
          penaltyCents: dollars('2,000,000'),
          endsDay: 4 + offer.days,
        },
      ],
    });
  });

  it('declines an offer without signing, and refuses a stale one', () => {
    const state = owning(spaceBusiness(), 4);
    const offer = payloadOfferOn(drawIn(state), 4);
    const declined = applyAnswerPayloadOffer(state, {
      ...order,
      offerId: offer.id,
      answer: 'decline',
    });
    expect(spaceAfter(declined)).toMatchObject({ answeredOffer: offer.id, contracts: [] });
    expect(applyAnswerPayloadOffer(state, { ...order, offerId: 99, answer: 'accept' })).toEqual({
      ok: false,
      error: 'STALE_QUOTE',
    });
  });
});

describe('installing reusable boosters (BUS20l)', () => {
  it('is locked below Global', () => {
    const local = owning(spaceBusiness({}, { treasuryCents: dollars('120,000,000,000') }));
    expect(applyInstallBoosters(local, order)).toEqual({ ok: false, error: 'STAGE_LOCKED' });
  });

  it('pays from the treasury as capital spending, once', () => {
    const global = spaceBusiness({}, { stage: 5, treasuryCents: dollars('120,000,000,000') });
    expect(businessAfter(applyInstallBoosters(owning(global), order))).toMatchObject({
      treasuryCents: dollars('7,500,000,000'),
      capitalizedSpendCents: dollars('113,250,000,000'),
      space: { boosters: 'installed' },
    });
    const again = applyInstallBoosters(
      owning(spaceBusiness({ boosters: 'installed' }, { stage: 5 })),
      order,
    );
    expect(again).toEqual({ ok: false, error: 'MAX_LEVEL' });
  });
});
