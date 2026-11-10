import { CURRENT_ECONOMY_VERSION, getContent } from '@/content';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';
import { revenueCatBilling } from '@/infrastructure/revenueCatBilling';
import { revenueCatRuntime } from '@/infrastructure/revenueCatRuntime';
import { revenueCatFake, validationConfig } from '@/infrastructure/revenueCatTesting';
import { startTestGameFrom, withoutIncidents } from './testGame';

it('keeps ordinary Offline settlement and Return summary unchanged during RevenueCat outages', async () => {
  const state = {
    ...freshGameState({
      saveId: 'offline-validation',
      economyVersion: CURRENT_ECONOMY_VERSION,
      wallMs: 1_800_000_000_000,
    }),
    businesses: [ownedBusiness('vending')],
  };
  const content = withoutIncidents(getContent());
  const sdk = revenueCatFake();
  const runtime = revenueCatRuntime(() =>
    Promise.resolve({ ...sdk, getCustomerInfo: () => Promise.reject(new Error('offline')) }),
  );
  const select = () => revenueCatBilling({ config: validationConfig, platform: 'ios', runtime });
  const ordinary = await startTestGameFrom(state, { content });
  const validation = await startTestGameFrom(state, { content, ...select() });
  const ordinaryBack = await ordinary.restart({ awayMs: 36_000_000 });
  const validationBack = await validation.restart({ awayMs: 36_000_000, ...select() });
  expect(validationBack.game.getSnapshot().state.cashCents).toBe(dollars('2400'));
  expect(validationBack.game.getSnapshot().state.returnSummary).toEqual(
    ordinaryBack.game.getSnapshot().state.returnSummary,
  );
  const before = validationBack.game.getSnapshot().state.returnSummary;
  await validationBack.game.purchases.recover();
  sdk.emit();
  await validationBack.game.purchases.recover();
  await validationBack.game.purchases.restore();
  await validationBack.game.pause();
  await validationBack.game.resume();
  expect(validationBack.game.getSnapshot().state.cashCents).toBe(dollars('2400'));
  expect(validationBack.game.getSnapshot().state.businesses[0]?.treasuryCents).toBe(
    dollars('2400'),
  );
  expect(validationBack.game.getSnapshot().state.returnSummary).toEqual(before);
});
