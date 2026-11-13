import { CURRENT_ECONOMY_VERSION, getContent } from '@/content';
import { withBriefing, type Briefing, type BriefingTask } from '@/domain/briefing';
import type { GameCommand } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { ownedBusiness } from '@/domain/testRules';

import { selectBriefing } from './briefingView';
import { briefingRules } from './economy';
import type { Game } from './game';
import { startTestGameFrom, type TestGame } from './testGame';

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

const FRESH = freshGameState({
  saveId: 'briefing',
  economyVersion: CURRENT_ECONOMY_VERSION,
  wallMs: 0,
});

const startWith = (overrides: Partial<GameState> = {}): Promise<TestGame> =>
  startTestGameFrom({ ...FRESH, ...overrides });

const run = (game: Game, command: GameCommand) =>
  game.dispatch({ id: game.createCommandId(), command });

const briefingOf = (game: Game) => game.getSnapshot().state.briefing;

const tasksOf = (briefing: Briefing): readonly BriefingTask[] =>
  briefing.status === 'active' ? briefing.tasks : [];

const measuresOf = (briefing: Briefing) => new Set(tasksOf(briefing).map((task) => task.measure));

const task = (
  measure: BriefingTask['measure'],
  change: Partial<BriefingTask> = {},
): BriefingTask => ({
  templateId: `brief_${measure}`,
  measure,
  target: 5,
  progress: 5,
  rewardCents: dollars('10'),
  claim: 'unclaimed',
  ...change,
});

const active = (tasks: readonly BriefingTask[], dayKey = 'day-0'): Briefing => ({
  status: 'active',
  dayKey,
  tasks,
  bonusCents: dollars('25'),
  bonus: 'unclaimed',
});

const drawnOver = (state: GameState, days: number) =>
  new Set(
    Array.from({ length: days }).flatMap((_unused, day) =>
      tasksOf(
        withBriefing(state, {
          before: state,
          dayKey: `day-${day}`,
          rules: briefingRules(getContent()),
          play: 'ignored',
        }).briefing,
      ).map((drawn) => drawn.measure),
    ),
  );

const NEW_PLAYER_MEASURES = new Set(['play_minutes', 'taps', 'wallet_upgrades']);

describe('daily briefing (UX03c)', () => {
  it('gives a new player three tasks they can do with nothing owned', async () => {
    const { game } = await startWith();
    expect(briefingOf(game)).toEqual({ status: 'none' });
    await game.checkpoint();
    expect(measuresOf(briefingOf(game))).toEqual(NEW_PLAYER_MEASURES);
    expect(briefingOf(game)).toMatchObject({ dayKey: 'day-0', bonusCents: dollars('25') });
  });

  it('draws the same tasks for the same save and day', async () => {
    const first = await startWith();
    const second = await startWith();
    await first.game.checkpoint();
    await second.game.checkpoint();
    expect(briefingOf(second.game)).toEqual(briefingOf(first.game));
  });

  it('never asks for something the player cannot do yet', () => {
    expect(drawnOver(FRESH, 60)).toEqual(NEW_PLAYER_MEASURES);
    const owner = { ...FRESH, tradingUnlocked: true, businesses: [ownedBusiness('vending')] };
    expect(drawnOver(owner, 60)).toEqual(
      new Set([...NEW_PLAYER_MEASURES, 'improvements', 'trades']),
    );
  });

  it('counts taps and play time towards the tasks, up to the target', async () => {
    const tasks = [
      task('taps', { progress: 0, target: 200 }),
      task('play_minutes', { progress: 0 }),
    ];
    const { game, clock } = await startWith({ briefing: active(tasks) });
    await run(game, { type: 'TapBatch', taps: 150 });
    expect(tasksOf(briefingOf(game)).map((open) => open.progress)).toEqual([150, 0]);
    clock.advance(7 * MINUTE_MS);
    await run(game, { type: 'TapBatch', taps: 150 });
    expect(tasksOf(briefingOf(game)).map((open) => open.progress)).toEqual([200, 5]);
  });

  it('pays each finished task once, and the bonus when all are finished', async () => {
    const tasks = [task('taps'), task('trades', { progress: 1 })];
    const { game } = await startWith({ briefing: active(tasks) });
    const claim = { type: 'ClaimBriefing' } as const;
    expect(await run(game, claim)).toMatchObject({ ok: true, cashChangeCents: dollars('10') });
    expect(await run(game, claim)).toEqual({ ok: false, error: 'BRIEFING_NOT_CLAIMABLE' });
    expect(briefingOf(game)).toMatchObject({ bonus: 'unclaimed' });

    const finished = await startWith({ briefing: active([task('taps'), task('trades')]) });
    expect(await run(finished.game, claim)).toMatchObject({
      ok: true,
      cashChangeCents: dollars('45'),
    });
    expect(finished.game.getSnapshot().state.cashCents).toBe(dollars('45'));
    expect(briefingOf(finished.game)).toMatchObject({ bonus: 'claimed' });
    expect(await run(finished.game, claim)).toEqual({ ok: false, error: 'BRIEFING_NOT_CLAIMABLE' });
  });
});

describe('daily briefing rewards and days (UX03c)', () => {
  it('sizes rewards to peak net worth, with a floor', async () => {
    const poor = await startWith();
    await poor.game.checkpoint();
    expect(tasksOf(briefingOf(poor.game)).map((drawn) => drawn.rewardCents)).toEqual([
      dollars('10'),
      dollars('10'),
      dollars('10'),
    ]);
    const rich = await startWith({ cashCents: dollars('1,000,000') });
    await rich.game.checkpoint();
    const rewards = tasksOf(briefingOf(rich.game)).map((drawn) => drawn.rewardCents);
    expect(rewards.filter((reward) => reward < dollars('1,000'))).toEqual([]);
    expect(rewards.filter((reward) => reward > dollars('2,500'))).toEqual([]);
    expect(briefingOf(rich.game)).toMatchObject({ bonusCents: dollars('5,000') });
  });

  it('clears unfinished tasks when the day changes, with no penalty', async () => {
    const stale = active([task('taps', { progress: 3 })]);
    const { game, clock } = await startWith({ briefing: stale, cashCents: dollars('40') });
    clock.advance(DAY_MS);
    await game.checkpoint();
    expect(briefingOf(game)).toMatchObject({ dayKey: 'day-1' });
    expect(tasksOf(briefingOf(game)).map((drawn) => drawn.progress)).toEqual([0, 0, 0]);
    expect(game.getSnapshot().state.cashCents).toBe(dollars('40'));
  });

  it('keeps a finished reward until it is claimed, then moves to the new day', async () => {
    const { game, clock } = await startWith({ briefing: active([task('taps')]) });
    clock.advance(DAY_MS);
    await game.checkpoint();
    expect(briefingOf(game)).toMatchObject({ dayKey: 'day-0' });
    await run(game, { type: 'ClaimBriefing' });
    await game.checkpoint();
    expect(briefingOf(game)).toMatchObject({ dayKey: 'day-1' });
    expect(game.getSnapshot().state.cashCents).toBe(dollars('35'));
  });

  it('keeps the briefing across a restart', async () => {
    const session = await startWith();
    await run(session.game, { type: 'TapBatch', taps: 20 });
    const before = briefingOf(session.game);
    const restarted = await session.restart();
    expect(briefingOf(restarted.game)).toEqual(before);
  });
});

describe('daily briefing card', () => {
  it('is hidden until tasks are drawn', () => {
    expect(selectBriefing(FRESH)).toEqual({ status: 'hidden' });
  });

  it('describes each task, its progress and what can be claimed', () => {
    const tasks = [
      task('taps', { target: 1000, progress: 1000 }),
      task('trades', { target: 1, progress: 0 }),
      task('play_minutes', { claim: 'claimed' }),
    ];
    expect(selectBriefing({ ...FRESH, briefing: active(tasks) })).toMatchObject({
      status: 'shown',
      doneCount: 2,
      bonus: 'locked',
      claimableCents: dollars('10'),
      tasks: [
        { title: 'Tap 1,000 times', progressLabel: '1,000 of 1,000', status: 'claimable' },
        { title: 'Make a trade', progressLabel: '0 of 1', status: 'open' },
        { title: 'Play for 5 minutes', progressLabel: '5 of 5', status: 'claimed' },
      ],
    });
  });
});
