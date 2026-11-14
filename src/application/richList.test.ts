import { CURRENT_ECONOMY_VERSION, getContent } from '@/content';
import type { GameCommand } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { dollars } from '@/domain/money';
import { withRichList, type RichList } from '@/domain/richList';

import { richListRules } from './economy';
import type { Game } from './game';
import { richListGapText, selectRichList, type RichListView } from './richListView';
import { startTestGameFrom, type TestGame } from './testGame';

const DAY_MS = 600_000;

const content = getContent();
const rules = richListRules(content);

const FRESH = freshGameState({
  saveId: 'rich-list',
  economyVersion: CURRENT_ECONOMY_VERSION,
  wallMs: 0,
});

const onDay = (day: number, state: GameState = FRESH): GameState => ({
  ...state,
  clock: { ...state.clock, simulationMs: day * DAY_MS },
});

const listed = (state: GameState) => withRichList(state, rules);

const STARTED = listed(FRESH).state;

const startWith = (overrides: Partial<GameState> = {}): Promise<TestGame> =>
  startTestGameFrom({ ...STARTED, ...overrides });

const run = (game: Game, command: GameCommand) =>
  game.dispatch({ id: game.createCommandId(), command });

const listOf = (game: Game) => game.getSnapshot().state.richList;

const fortunesOf = (list: RichList) => (list.status === 'active' ? list.fortunes : {});

const shown = (state: GameState) => selectRichList(state, content);

const namesOf = (view: RichListView) =>
  view.status === 'shown' ? view.rows.map((row) => row.name) : [];

const gapOf = (view: RichListView) => (view.status === 'shown' ? richListGapText(view) : '');

const grewOver = (days: number) => {
  const grown = fortunesOf(listed(onDay(days, STARTED)).state.richList);
  return rules.moguls.filter((mogul) => (grown[mogul.id] ?? 0n) > mogul.startCents);
};

describe('the Rich List (UX03d)', () => {
  it('ranks a new player last of twenty-one, behind the smallest fortune', async () => {
    const { game } = await startTestGameFrom(FRESH);
    expect(shown(game.getSnapshot().state)).toEqual({ status: 'hidden' });
    await game.checkpoint();
    const view = shown(game.getSnapshot().state);
    expect(view).toMatchObject({
      status: 'shown',
      place: 21,
      size: 21,
      ahead: { name: 'Thomas Peterfee', gapCents: dollars('2,000') },
    });
    expect(listOf(game)).toMatchObject({ passed: 0, mostPassed: 0, news: { status: 'none' } });
  });

  it('lists the moguls richest first with the player among them', () => {
    const view = shown({ ...STARTED, peakNetWorthCents: dollars('6,000') });
    expect(view).toMatchObject({ place: 19, ahead: { name: 'Chainpeng Zap' } });
    expect(namesOf(view).slice(-4)).toEqual([
      'Chainpeng Zap',
      'You',
      'Francoise Bettencurl',
      'Thomas Peterfee',
    ]);
    expect(gapOf(view)).toBe('$6.00K behind Chainpeng Zap');
  });

  it('makes passing a mogul a moment: news, an activity entry and a new place', async () => {
    const { game } = await startWith({ cashCents: dollars('6,000') });
    await game.checkpoint();
    expect(listOf(game)).toMatchObject({
      passed: 2,
      mostPassed: 2,
      news: { status: 'new', direction: 'passed', mogulId: 'mogul_bettencurl', place: 19 },
    });
    const history = await game.readActivity();
    expect(history.at(0)).toMatchObject({
      kind: 'ranking',
      direction: 'passed',
      mogulId: 'mogul_bettencurl',
      place: 19,
    });
    expect(game.getSnapshot().state.activity.lifetime.byKind.ranking).toBe(1);
    await run(game, { type: 'DismissRichListNews' });
    expect(listOf(game)).toMatchObject({ passed: 2, news: { status: 'none' } });
  });

  it('keeps the list and its activity count across a restart', async () => {
    const session = await startWith({ cashCents: dollars('6,000') });
    await session.game.checkpoint();
    const restarted = await session.restart();
    expect(listOf(restarted.game)).toEqual(listOf(session.game));
    expect(restarted.game.getSnapshot().state.activity.lifetime.byKind.ranking).toBe(1);
  });

  it('completes the goals for places on the list', async () => {
    const { game } = await startWith({ cashCents: dollars('200,000') });
    await game.checkpoint();
    expect(listOf(game)).toMatchObject({ passed: 6 });
    expect(game.getSnapshot().state.goals.completed.map((goal) => goal.goalId)).toContain(
      'rich_list_top_15',
    );
  });
});

describe('Rich List fortunes (UX03d)', () => {
  it('grows every fortune over business days, the same way for the same save', () => {
    const later = listed(onDay(200, STARTED));
    const again = listed(onDay(200, STARTED));
    expect(later.state.richList).toEqual(again.state.richList);
    const grown = fortunesOf(later.state.richList);
    expect(grewOver(200).length).toBeGreaterThanOrEqual(17);
    expect(grewOver(200)).toContain(rules.moguls[0]);
    const other = listed(onDay(200, listed({ ...FRESH, saveId: 'another-save' }).state));
    expect(fortunesOf(other.state.richList)).not.toEqual(grown);
  });

  it('sets a fortune back now and then instead of compounding without a break', () => {
    const grown = fortunesOf(listed(onDay(200, STARTED)).state.richList);
    const top = rules.moguls[0]!;
    const unbroken = Array.from({ length: 200 }).reduce<bigint>(
      (cents) => (cents * BigInt(10_000 + top.growthBps)) / 10_000n,
      top.startCents,
    );
    expect(grown[top.id]! < unbroken).toBe(true);
    expect(grown[top.id]! < top.startCents * 3n).toBe(true);
  });

  it('starts an older save from where the moguls would be by now, without news', () => {
    const late = listed(onDay(200, { ...FRESH, peakNetWorthCents: dollars('50,000') }));
    expect(late.move).toBeUndefined();
    expect(late.state.richList).toMatchObject({ day: 200, news: { status: 'none' } });
    expect(fortunesOf(late.state.richList)).toEqual(
      fortunesOf(listed(onDay(200, STARTED)).state.richList),
    );
  });

  it('shows a mogul overtaking a player who stands still, and keeps the best place', () => {
    const ahead = listed({ ...STARTED, peakNetWorthCents: dollars('2,050') });
    expect(ahead.move).toEqual({ direction: 'passed', mogulId: 'mogul_peterfee', place: 20 });
    const idle = listed(onDay(200, ahead.state));
    expect(idle.move).toEqual({ direction: 'overtaken', mogulId: 'mogul_peterfee', place: 21 });
    expect(idle.state.richList).toMatchObject({
      passed: 0,
      mostPassed: 1,
      news: { status: 'new', direction: 'overtaken' },
    });
  });
});
