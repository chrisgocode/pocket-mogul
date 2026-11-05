import { randomUUID } from 'expo-crypto';

import { createGame, type Game } from '@/application/game';
import { getContent } from '@/content';
import { deviceClock } from '@/infrastructure/deviceClock';
import { openExpoSqliteDriver } from '@/infrastructure/expoSqliteDriver';
import { openSqlSaveStore } from '@/infrastructure/sqlSaveStore';

const SAVE_DATABASE_NAME = 'pocket-mogul.db';

let deviceGame: Promise<Game> | undefined;

async function startDeviceGame(): Promise<Game> {
  const driver = await openExpoSqliteDriver(SAVE_DATABASE_NAME);
  return createGame({
    clock: deviceClock,
    store: await openSqlSaveStore(driver),
    content: getContent(),
    createId: randomUUID,
  });
}

export function loadDeviceGame(): Promise<Game> {
  deviceGame ??= startDeviceGame();
  return deviceGame;
}
