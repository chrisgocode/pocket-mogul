import { CURRENT_ECONOMY_VERSION } from '@/content';
import { readFileSync } from 'node:fs';

import type { GameCommand } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

import { localTelemetrySink } from '@/infrastructure/localTelemetrySink';

import type { Game } from './game';
import { SAVE_FORMAT, type SaveFormat } from './saveFormat';
import { saveSchema } from './saveSchemas';
import type { TelemetryEvent } from './telemetry';
import { startObservedTestGame, startTestGameFrom, startTestGameFromDocument } from './testGame';

const TEN_MINUTES_MS = 600_000;
const HOUR_MS = 3_600_000;

function recorder() {
  const events: TelemetryEvent[] = [];
  const recordGameplay = (event: TelemetryEvent) => {
    if (event.name !== 'ad_requested') events.push(event);
  };
  return { events, telemetry: { record: recordGameplay } };
}

const gameplay = (events: readonly TelemetryEvent[]) =>
  events.filter((event) => event.name !== 'tutorial_step');

const names = (events: readonly TelemetryEvent[]) => gameplay(events).map((event) => event.name);

const run = (game: Game, command: GameCommand) =>
  game.dispatch({ id: game.createCommandId(), command });

function startWith(overrides: Partial<GameState>) {
  const sink = recorder();
  const started = startTestGameFrom(
    {
      ...freshGameState({
        saveId: 'secret-save-id',
        economyVersion: CURRENT_ECONOMY_VERSION,
        wallMs: 0,
      }),
      ...overrides,
    },
    { telemetry: sink.telemetry },
  );
  return { sink, started };
}

describe('telemetry', () => {
  it('records purchases and upgrades with the economy version and game state', async () => {
    const { sink, started } = startWith({ cashCents: dollars('1,000') });
    const { game } = await started;
    await run(game, { type: 'UpgradeWallet', fromLevel: 0 });
    await run(game, { type: 'BuyBusiness', businessId: 'vending' });
    await run(game, {
      type: 'DepositToTreasury',
      businessId: 'vending',
      amountCents: dollars('62.50'),
    });
    await run(game, {
      type: 'UpgradeBusiness',
      businessId: 'vending',
      track: 'quality',
      fromLevel: 0,
    });
    expect(names(sink.events)).toEqual(['wallet_upgrade', 'first_business', 'business_upgrade']);
    expect(gameplay(sink.events)[2]).toEqual({
      name: 'business_upgrade',
      economyVersion: CURRENT_ECONOMY_VERSION,
      schemaVersion: game.getSnapshot().state.schemaVersion,
      simulationMs: 0,
      details: { businessId: 'vending', track: 'quality', level: 1 },
      state: {
        walletLevel: 1,
        totalAcceptedTaps: 0,
        businessesOwned: 1,
        propertiesOwned: 0,
        rentedProperties: 0,
        positionsHeld: 0,
        highestUnlockedTier: 1,
        peakNetWorthCents: '100000',
      },
    });
  });

  it('records a second business purchase without calling it the first', async () => {
    const { sink, started } = startWith({ cashCents: dollars('2,000') });
    const { game } = await started;
    await run(game, { type: 'BuyBusiness', businessId: 'vending' });
    await run(game, { type: 'BuyBusiness', businessId: 'food_cart' });
    expect(names(sink.events)).toEqual(['first_business']);
  });

  it('records a rental and an offline settlement', async () => {
    const { sink, started } = startWith({ cashCents: dollars('20,000') });
    const { game, restart } = await started;
    await run(game, { type: 'BuyProperty', propertyId: 'studio' });
    await run(game, { type: 'SetRentalStatus', propertyId: 'studio', rented: true });
    await restart({ awayMs: 10 * HOUR_MS });
    expect(names(sink.events)).toEqual(['rental_started', 'offline_settled']);
    expect(sink.events[1]?.details).toEqual({
      awayMs: 10 * HOUR_MS,
      creditedMs: 8 * HOUR_MS,
      capped: true,
    });
  });
});

describe('telemetry for taps, saves and the development sink', () => {
  it('aggregates taps instead of recording each one', async () => {
    const { events, telemetry } = recorder();
    const { game, clock } = await startObservedTestGame({ telemetry });
    Array.from({ length: 30 }, () => game.tap());
    await game.flushTaps();
    expect(gameplay(events)).toEqual([]);
    clock.advance(TEN_MINUTES_MS);
    game.tap();
    await game.flushTaps();
    expect(names(events)).toEqual(['taps_aggregated']);
    expect(gameplay(events)[0]?.details).toEqual({ taps: 31, tapCents: '3100' });
    expect(gameplay(events)[0]?.state.totalAcceptedTaps).toBe(31);
  });

  it('records a failed save', async () => {
    const { events, telemetry } = recorder();
    const { game, faults } = await startObservedTestGame({ telemetry });
    faults.failWrites = true;
    await run(game, { type: 'AdvanceTime' });
    expect(names(events)).toEqual(['save_failed']);
    expect(events[0]?.economyVersion).toBe(CURRENT_ECONOMY_VERSION);
  });

  it('records a completed save migration', async () => {
    const { events, telemetry } = recorder();
    const fixture = readFileSync(new URL('fixtures/save-baseline.json', import.meta.url), 'utf8');
    const saveFormat: SaveFormat = {
      ...SAVE_FORMAT,
      readerVersion: 3,
      schemaVersion: 3,
      migrations: [
        { fromVersion: 2, upgrade: (raw) => ({ ...saveSchema.parse(raw), schemaVersion: 3 }) },
      ],
    };
    await startTestGameFromDocument(fixture, 1_799_990_000_000, { telemetry, saveFormat });
    expect(events[0]).toMatchObject({ name: 'migration_completed', details: { fromVersion: 2 } });
  });

  it('never includes the save id', async () => {
    const { sink, started } = startWith({ cashCents: dollars('250') });
    const { game } = await started;
    await run(game, { type: 'BuyBusiness', businessId: 'vending' });
    expect(JSON.stringify(sink.events)).not.toContain('secret-save-id');
  });

  it('keeps the most recent events in the local development sink', async () => {
    const sink = localTelemetrySink(2);
    const { game } = await startTestGameFrom(
      {
        ...freshGameState({ saveId: 'sink', economyVersion: CURRENT_ECONOMY_VERSION, wallMs: 0 }),
        cashCents: dollars('1,000'),
      },
      { telemetry: sink },
    );
    await run(game, { type: 'UpgradeWallet', fromLevel: 0 });
    await run(game, { type: 'UpgradeWallet', fromLevel: 1 });
    await run(game, { type: 'UpgradeWallet', fromLevel: 2 });
    expect(sink.events().map((event) => event.details)).toEqual([{ level: 2 }, { level: 3 }]);
  });
});
