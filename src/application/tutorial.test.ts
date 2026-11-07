import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { isTutorialFinished } from '@/domain/tutorial';

import type { Game } from './game';
import { selectTutorial } from './tutorialView';
import { encodeSave } from './saveFormat';
import { migratedState, startTestGame, startTestGameFrom } from './testGame';

const tap = (taps: number) => ({ id: `tap-${taps}`, command: { type: 'TapBatch', taps } }) as const;
const upgradeWallet = { id: 'wallet', command: { type: 'UpgradeWallet', fromLevel: 0 } } as const;
const buyVending = { id: 'buy', command: { type: 'BuyBusiness', businessId: 'vending' } } as const;
const skip = { id: 'skip', command: { type: 'SkipTutorial' } } as const;

async function playOpening(game: Game): Promise<void> {
  await game.dispatch(tap(400));
  await game.dispatch(upgradeWallet);
  await game.dispatch(buyVending);
}

const unlocks = ({ cashCents, unlockedTiers, tradingUnlocked, businesses }: GameState) => ({
  cashCents,
  unlockedTiers,
  tradingUnlocked,
  businesses,
});

describe('the first-session tutorial', () => {
  it('starts on the tap step for a fresh save (AC01)', async () => {
    const { game } = await startTestGame();
    expect(selectTutorial(game.getSnapshot())).toEqual({
      status: 'showing',
      step: 'tap',
      number: 1,
      total: 3,
    });
    expect(isTutorialFinished(game.getSnapshot().state.tutorial)).toBe(false);
  });

  it('moves to the wallet upgrade once a tap is committed', async () => {
    const { game } = await startTestGame();
    await game.dispatch(tap(1));
    expect(selectTutorial(game.getSnapshot())).toMatchObject({ step: 'upgradeWallet', number: 2 });
  });

  it('completes each step from the real action and finishes after the first business', async () => {
    const { game } = await startTestGame();
    await game.dispatch(tap(400));
    await game.dispatch(upgradeWallet);
    expect(selectTutorial(game.getSnapshot())).toMatchObject({ step: 'buyBusiness', number: 3 });
    await game.dispatch(buyVending);
    expect(selectTutorial(game.getSnapshot())).toEqual({ status: 'finished' });
    expect(game.getSnapshot().state.tutorial).toEqual({
      completedSteps: ['tap', 'upgradeWallet', 'buyBusiness'],
      explanations: 'shown',
    });
    expect(isTutorialFinished(game.getSnapshot().state.tutorial)).toBe(true);
  });

  it('keeps completed steps across a restart', async () => {
    const first = await startTestGame();
    await first.game.dispatch(tap(150));
    await first.game.dispatch(upgradeWallet);
    const { game } = await first.restart();
    expect(selectTutorial(game.getSnapshot())).toMatchObject({ step: 'buyBusiness' });
  });

  it('records a business bought before the wallet upgrade and still asks for the upgrade', async () => {
    const funded = {
      ...freshGameState({ saveId: 'early-buyer', economyVersion: 1, wallMs: 1_800_000_000_000 }),
      cashCents: dollars('300'),
    };
    const { game } = await startTestGameFrom(funded);
    await game.dispatch(buyVending);
    expect(game.getSnapshot().state.tutorial.completedSteps).toEqual(['buyBusiness']);
    expect(selectTutorial(game.getSnapshot())).toMatchObject({ step: 'tap' });
  });
});

describe('skipping the tutorial', () => {
  it('hides the explanations for good and counts as finished', async () => {
    const first = await startTestGame();
    await first.game.dispatch(skip);
    const { game } = await first.restart();
    expect(selectTutorial(game.getSnapshot())).toEqual({ status: 'finished' });
    expect(isTutorialFinished(game.getSnapshot().state.tutorial)).toBe(true);
  });

  it('leaves unlock rules unchanged', async () => {
    const skipped = await startTestGame();
    await skipped.game.dispatch(skip);
    const guided = await startTestGame();
    await playOpening(skipped.game);
    await playOpening(guided.game);
    expect(unlocks(skipped.game.getSnapshot().state)).toEqual(
      unlocks(guided.game.getSnapshot().state),
    );
    expect(skipped.game.getSnapshot().state.tutorial.completedSteps).toEqual([
      'tap',
      'upgradeWallet',
      'buyBusiness',
    ]);
  });
});

const activeBoost = {
  boost: { status: 'active', grantId: 'grant-1', remainingMs: 30_000 },
  processedRewardIds: ['grant-1'],
} as const;

function schemaV6Save(change: Partial<GameState>): string {
  const fresh = freshGameState({ saveId: 'before-tutorial', economyVersion: 1, wallMs: 0 });
  const { tutorial: _tutorial, settings: _settings, ...rest } = { ...fresh, ...change };
  return JSON.stringify({ ...JSON.parse(encodeSave(rest as GameState)), schemaVersion: 6 });
}

describe('saves from before the tutorial', () => {
  it('migrate from schema 6 with default settings, the steps already done and the boost kept', () => {
    const state = migratedState(
      schemaV6Save({ tap: { walletLevel: 2, totalAcceptedTaps: 900 }, reward: activeBoost }),
    );
    expect(state.schemaVersion).toBe(7);
    expect(state.reward).toEqual(activeBoost);
    expect(state.tutorial).toEqual({
      completedSteps: ['tap', 'upgradeWallet'],
      explanations: 'shown',
    });
    expect(state.settings).toEqual({
      sound: 'on',
      haptics: 'on',
      reducedMotion: 'system',
      numberFormatting: 'compact',
    });
  });
});
