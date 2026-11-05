import { dollars } from '@/domain/money';

import { nextPublish, startTestGame } from './testGame';

describe('tap batching', () => {
  it('commits taps as one batch once 250 ms have passed since the first', async () => {
    const { game, clock } = await startTestGame();
    game.tap();
    game.tap();
    clock.advance(200);
    game.tap();
    clock.advance(49);
    expect(game.getSnapshot().state.revision).toBe(0);
    const published = nextPublish(game);
    clock.advance(1);
    await published;
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('3'));
    expect(game.getSnapshot().state.revision).toBe(1);
  });

  it('opens a new batch for taps after the first batch closes', async () => {
    const { game, clock } = await startTestGame();
    game.tap();
    clock.advance(250);
    game.tap();
    game.tap();
    await game.flushTaps();
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('3'));
    expect(game.getSnapshot().state.revision).toBe(2);
  });

  it('counts unsaved taps as pending until their batch commits', async () => {
    const { game } = await startTestGame();
    game.tap();
    game.tap();
    expect(game.getSnapshot().pendingTaps).toBe(2);
    await game.flushTaps();
    expect(game.getSnapshot().pendingTaps).toBe(0);
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('2'));
  });

  it('rolls pending taps back when their batch fails to save', async () => {
    const { game, faults } = await startTestGame();
    faults.failWrites = true;
    game.tap();
    await game.flushTaps();
    expect(game.getSnapshot().pendingTaps).toBe(0);
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('0'));
  });

  it('loses nothing but the open batch when the app is killed', async () => {
    const { game, clock, restart } = await startTestGame();
    game.tap();
    clock.advance(250);
    await nextPublish(game);
    game.tap();
    const restarted = await restart();
    expect<bigint>(restarted.game.getSnapshot().state.cashCents).toBe(dollars('1'));
  });

  it('tells subscribers about every change and stops after unsubscribing', async () => {
    const { game } = await startTestGame();
    const seen: number[] = [];
    const unsubscribe = game.subscribe(() => seen.push(game.getSnapshot().pendingTaps));
    game.tap();
    await game.flushTaps();
    unsubscribe();
    game.tap();
    expect(seen).toEqual([1, 0]);
  });
});
