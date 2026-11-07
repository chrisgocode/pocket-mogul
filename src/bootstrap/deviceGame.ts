import { randomUUID } from 'expo-crypto';

import { createGame, type OpenedGame } from '@/application/game';
import { getContent, getPastContent } from '@/content';
import { deviceClock } from '@/infrastructure/deviceClock';
import { openExpoSqliteDriver } from '@/infrastructure/expoSqliteDriver';
import { googleMobileAds } from '@/infrastructure/googleMobileAds';
import { openSqlSaveStore } from '@/infrastructure/sqlSaveStore';

const SAVE_DATABASE_NAME = 'pocket-mogul.db';

let deviceGame: Promise<OpenedGame> | undefined;

async function startDeviceGame(): Promise<OpenedGame> {
  const driver = await openExpoSqliteDriver(SAVE_DATABASE_NAME);
  return createGame({
    clock: deviceClock,
    store: await openSqlSaveStore(driver),
    content: getContent(),
    ads: googleMobileAds(),
    pastContent: getPastContent(),
    createId: randomUUID,
  });
}

export function loadDeviceGame(): Promise<OpenedGame> {
  deviceGame ??= startDeviceGame();
  return deviceGame;
}
