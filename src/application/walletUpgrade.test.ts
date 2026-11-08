import { CURRENT_ECONOMY_VERSION } from '@/content';
import { freshGameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';

import type { Game } from './game';
import { startTestGame, startTestGameFrom } from './testGame';

const earn = (game: Game, taps: number) =>
  game.dispatch({ id: `earn-${taps}`, command: { type: 'TapBatch', taps } });

const upgrade = (game: Game, fromLevel: number) =>
  game.dispatch({ id: `upgrade-${fromLevel}`, command: { type: 'UpgradeWallet', fromLevel } });

describe('upgrading the wallet', () => {
  it('spends $100 once from level 0 and raises the payout to $1.50 (AC03)', async () => {
    const { game } = await startTestGame();
    await earn(game, 130);
    expect(await upgrade(game, 0)).toEqual({
      ok: true,
      revision: 2,
      cashChangeCents: dollars('-100'),
    });
    expect(await upgrade(game, 0)).toEqual({
      ok: true,
      revision: 2,
      cashChangeCents: dollars('-100'),
    });
    const { state } = game.getSnapshot();
    expect<bigint>(state.cashCents).toBe(dollars('30'));
    expect(state.tap.walletLevel).toBe(1);
    await game.dispatch({ id: 'after', command: { type: 'TapBatch', taps: 2 } });
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('33'));
  });

  it('keeps the new level across a restart', async () => {
    const first = await startTestGame();
    await earn(first.game, 100);
    await upgrade(first.game, 0);
    const { game } = await first.restart();
    expect(game.getSnapshot().state.tap.walletLevel).toBe(1);
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('0'));
  });

  it('spends nothing and changes nothing when cash is short (AC05)', async () => {
    const { game } = await startTestGame();
    await earn(game, 99);
    expect(await upgrade(game, 0)).toEqual({ ok: false, error: 'INSUFFICIENT_CASH' });
    const { state } = game.getSnapshot();
    expect<bigint>(state.cashCents).toBe(dollars('99'));
    expect(state.tap.walletLevel).toBe(0);
    expect(state.revision).toBe(1);
  });

  it('refuses a quote made for a different level', async () => {
    const { game } = await startTestGame();
    await earn(game, 500);
    expect(await upgrade(game, 3)).toEqual({ ok: false, error: 'STALE_QUOTE' });
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('500'));
  });

  it('refuses to go past level 100 (MAX_LEVEL)', async () => {
    const fresh = freshGameState({
      saveId: 'maxed',
      economyVersion: CURRENT_ECONOMY_VERSION,
      wallMs: 0,
    });
    const { game } = await startTestGameFrom({
      ...fresh,
      cashCents: dollars('1000000000'),
      tap: { ...fresh.tap, walletLevel: 100 },
    });
    expect(await upgrade(game, 100)).toEqual({ ok: false, error: 'MAX_LEVEL' });
    expect(game.getSnapshot().state.tap.walletLevel).toBe(100);
  });
});

describe('pending taps and wallet upgrades', () => {
  it('commits pending taps before the upgrade', async () => {
    const { game } = await startTestGame();
    await earn(game, 99);
    game.tap();
    expect(await upgrade(game, 0)).toEqual({
      ok: true,
      revision: 3,
      cashChangeCents: dollars('-100'),
    });
    expect(game.getSnapshot().pendingTaps).toBe(0);
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('0'));
  });

  it('never lets pending taps fund the upgrade when they fail to save', async () => {
    const { game, faults } = await startTestGame();
    await earn(game, 99);
    game.tap();
    faults.failWrites = true;
    const unsubscribe = game.subscribe(() => {
      faults.failWrites = false;
    });
    const outcome = await upgrade(game, 0);
    unsubscribe();
    expect(outcome).toEqual({ ok: false, error: 'INSUFFICIENT_CASH' });
    expect(game.getSnapshot().pendingTaps).toBe(0);
    expect<bigint>(game.getSnapshot().state.cashCents).toBe(dollars('99'));
    expect(game.getSnapshot().state.tap.walletLevel).toBe(0);
  });
});
