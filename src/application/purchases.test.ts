import { scriptedBilling } from './scriptedBilling';
import { startObservedTestGame, startTestGame } from './testGame';

it('keeps purchases disabled across free play, resume and restart', async () => {
  const session = await startTestGame();
  const { game, clock } = session;
  expect(await game.purchases.products()).toEqual({ status: 'disabled', products: [] });
  expect(await game.purchases.purchase('unconfigured')).toEqual({ status: 'disabled' });
  expect(await game.purchases.restore()).toEqual({ status: 'disabled' });
  game.tap();
  await game.flushTaps();
  expect(game.getSnapshot().state.cashCents).toBe(100n);
  await game.pause();
  clock.advance(60_000);
  await game.resume();
  const restarted = await session.restart();
  expect(await restarted.game.purchases.restore()).toEqual({ status: 'disabled' });
  expect(restarted.game.getSnapshot().state.cashCents).toBe(100n);
});

it('preserves localized test prices and ordinary cancellation without changing the save', async () => {
  const billing = scriptedBilling({
    products: [{ productId: 'test-unlock', displayName: 'Test unlock', displayPrice: '1,99 €' }],
    purchases: [{ status: 'cancelled' }],
  });
  const session = await startObservedTestGame({ billing });
  const before = session.saveDocument();
  expect(await session.game.purchases.initialize()).toEqual({ status: 'ready' });
  expect(await session.game.purchases.products()).toEqual({
    status: 'available',
    products: [{ productId: 'test-unlock', displayName: 'Test unlock', displayPrice: '1,99 €' }],
  });
  expect(await session.game.purchases.purchase('test-unlock')).toEqual({ status: 'cancelled' });
  expect(session.saveDocument()).toBe(before);
});

it.each([
  { status: 'declined' },
  { status: 'pending', productId: 'test-unlock' },
  { status: 'verificationFailed' },
  { status: 'unavailable' },
] as const)('keeps $status distinct from a failed save', async (outcome) => {
  const billing = scriptedBilling({ purchases: [outcome] });
  const session = await startObservedTestGame({ billing });
  const before = session.game.getSnapshot();
  const document = session.saveDocument();
  session.faults.failWrites = true;
  expect(await session.game.purchases.purchase('test-unlock')).toEqual(outcome);
  expect(session.game.getSnapshot()).toBe(before);
  expect(session.saveDocument()).toBe(document);
});

it('owns disposable scripted event observations through the Game port', async () => {
  const billing = scriptedBilling();
  const session = await startObservedTestGame({ billing });
  const events: string[] = [];
  const unsubscribe = session.game.purchases.subscribe((event) => events.push(event.type));
  billing.emit({ type: 'ownershipChanged' });
  unsubscribe();
  billing.emit({ type: 'ownershipChanged' });
  session.game.purchases.subscribe((event) => events.push(event.type));
  session.game.purchases.dispose();
  billing.emit({ type: 'ownershipChanged' });
  expect(events).toEqual(['ownershipChanged']);
  expect(billing.operations).toEqual([]);
});

it('does no provider work during startup, resume or restart', async () => {
  const billing = scriptedBilling();
  const session = await startObservedTestGame({ billing });
  await session.game.pause();
  session.clock.advance(60_000);
  await session.game.resume();
  await session.restart();
  expect(billing.operations).toEqual([]);
});
