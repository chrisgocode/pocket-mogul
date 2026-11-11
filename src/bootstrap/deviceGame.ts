import { Platform } from 'react-native';
import { revenueCatBilling } from '@/infrastructure/revenueCatBilling';
import { nativeRevenueCat, nativeRevenueCatEvidence } from '@/infrastructure/nativeRevenueCat';
import { nativeStoreKit } from '@/infrastructure/nativeStoreKit';
import { installBillingValidationDriver } from './billingValidation';
import { randomUUID } from 'expo-crypto';

import { createGame, type OpenedGame } from '@/application/game';
import { getContent, getPastContent } from '@/content';
import { deviceClock } from '@/infrastructure/deviceClock';
import { openExpoSqliteDriver } from '@/infrastructure/expoSqliteDriver';
import { googleMobileAds } from '@/infrastructure/googleMobileAds';
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
  const billing = deviceBilling();
  const opened = await createGame({
    clock: deviceClock,
    store: await openSqlSaveStore(driver),
    content: getContent(),
    ads: googleMobileAds(),
    ...billing,
    pastContent: getPastContent(),
    createId: randomUUID,
    ...(developmentTelemetry === undefined ? {} : { telemetry: developmentTelemetry }),
  });
  if (opened.status === 'ready' && billing.purchasePolicy !== undefined)
    installBillingValidationDriver(opened.game, nativeRevenueCatEvidence);
  return opened;
}

function deviceBilling() {
  try {
    const raw = process.env.EXPO_PUBLIC_BILLING_VALIDATION;
    const config: unknown = raw === undefined ? undefined : JSON.parse(raw);
    return revenueCatBilling({
      config,
      platform: Platform.OS,
      runtime: nativeRevenueCat,
      ...(Platform.OS === 'ios' ? { storeKit: nativeStoreKit, clock: deviceClock } : {}),
    });
  } catch {
    return revenueCatBilling({
      config: undefined,
      platform: Platform.OS,
      runtime: nativeRevenueCat,
    });
  }
}

export function loadDeviceGame(): Promise<OpenedGame> {
  deviceGame ??= startDeviceGame().catch((error: unknown) => {
    deviceGame = undefined;
    throw error;
  });
  return deviceGame;
}
