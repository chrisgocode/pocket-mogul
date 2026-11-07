import { randomUUID } from 'expo-crypto';

import { createGame, type OpenedGame } from '@/application/game';
import { getContent, getPastContent } from '@/content';
import { deviceClock } from '@/infrastructure/deviceClock';
import { openExpoSqliteDriver } from '@/infrastructure/expoSqliteDriver';
import { localTelemetrySink } from '@/infrastructure/localTelemetrySink';
import { openSqlSaveStore } from '@/infrastructure/sqlSaveStore';

const SAVE_DATABASE_NAME = 'pocket-mogul.db';
const DEVELOPMENT_TELEMETRY_EVENTS_KEPT = 500;

const developmentTelemetry = __DEV__
  ? localTelemetrySink(DEVELOPMENT_TELEMETRY_EVENTS_KEPT)
  : undefined;

let deviceGame: Promise<OpenedGame> | undefined;

async function startDeviceGame(): Promise<OpenedGame> {
  const driver = await openExpoSqliteDriver(SAVE_DATABASE_NAME);
  return createGame({
    clock: deviceClock,
    store: await openSqlSaveStore(driver),
    content: getContent(),
    pastContent: getPastContent(),
    createId: randomUUID,
    ...(developmentTelemetry === undefined ? {} : { telemetry: developmentTelemetry }),
  });
}

export function loadDeviceGame(): Promise<OpenedGame> {
  deviceGame ??= startDeviceGame();
  return deviceGame;
}
