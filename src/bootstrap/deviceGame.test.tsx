import { loadDeviceGame } from '@/bootstrap/deviceGame';
import { createGame } from '@/application/game';
import { openExpoSqliteDriver } from '@/infrastructure/expoSqliteDriver';

jest.mock('@/infrastructure/expoSqliteDriver', () => ({ openExpoSqliteDriver: jest.fn() }));
jest.mock('@/infrastructure/sqlSaveStore', () => ({ openSqlSaveStore: jest.fn() }));
jest.mock('@/infrastructure/googleMobileAds', () => ({ googleMobileAds: jest.fn() }));
jest.mock('@/application/game', () => ({ createGame: jest.fn() }));

it('retries failed initialization and shares the successful game promise', async () => {
  const failure = new Error('database temporarily unavailable');
  jest.mocked(openExpoSqliteDriver).mockRejectedValueOnce(failure);
  await expect(loadDeviceGame()).rejects.toThrow(failure);
  const ready = { status: 'stopped', reason: 'DAMAGED_SAVE' } as const;
  jest.mocked(createGame).mockResolvedValueOnce(ready);
  const retry = loadDeviceGame();
  expect(loadDeviceGame()).toBe(retry);
  await expect(retry).resolves.toEqual(ready);
  expect(loadDeviceGame()).toBe(retry);
  expect(openExpoSqliteDriver).toHaveBeenCalledTimes(2);
});
