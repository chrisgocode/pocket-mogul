import { economyV2 } from './economy-v2';
import { findContentIssues, getContent } from './index';
import type { ContentInput } from './schema';

const issuesFor = (mutate: (content: ContentInput) => void) => {
  const content: ContentInput = structuredClone(economyV2);
  mutate(content);
  return findContentIssues(content);
};

type Goals = ReturnType<typeof getContent>['goals'];

const stageGoals = (goals: Goals) =>
  goals.flatMap((goal) => (goal.kind === 'business_stage' ? [goal] : []));

const peakGoals = (goals: Goals) =>
  goals.flatMap((goal) => (goal.kind === 'peak_net_worth' ? [goal] : []));

describe('goals in content (UX03)', () => {
  const { goals, businesses, ranks } = getContent();

  it('lists sixty-five goals, each with a cash reward', () => {
    const kinds = ['first_action', 'peak_net_worth', 'collection', 'business_stage', 'milestone'];
    expect(kinds.map((kind) => goals.filter((goal) => goal.kind === kind).length)).toEqual([
      6, 7, 4, 24, 24,
    ]);
    expect(goals.filter((goal) => goal.reward <= 0n)).toEqual([]);
  });

  it('gives every business a Local goal and a Global goal sized to its price', () => {
    const rewards = businesses.map((business) =>
      stageGoals(goals)
        .filter((goal) => goal.businessId === business.id)
        .map((goal) => [goal.stage, goal.reward]),
    );
    expect(rewards).toEqual(
      businesses.map((business) => [
        [2, business.price / 10n],
        [5, business.price * 2n],
      ]),
    );
  });

  it('pays five percent of each peak net worth goal', () => {
    const paid = peakGoals(goals).map((goal) => goal.threshold / goal.reward);
    expect(paid).toEqual(Array(7).fill(20n));
  });

  it('ranks from Hustler to Mogul by peak net worth', () => {
    expect(ranks.map((rank) => rank.title)).toEqual([
      'Hustler',
      'Operator',
      'Entrepreneur',
      'Millionaire',
      'Magnate',
      'Tycoon',
      'Mogul',
    ]);
    expect(ranks.map((rank) => rank.threshold)).toEqual([
      0n,
      10n ** 6n,
      10n ** 7n,
      10n ** 8n,
      10n ** 9n,
      10n ** 10n,
      10n ** 11n,
    ]);
  });

  it('rejects goals and ranks that do not fit', () => {
    expect(
      issuesFor((content) => {
        const [local, global] = content.goals.filter((goal) => goal.kind === 'business_stage');
        Object.assign(local!, { businessId: 'casino' });
        Object.assign(global!, { stage: 6 });
        content.ranks![0]!.threshold = 1n;
        content.ranks![2]!.threshold = 5n;
      }),
    ).toEqual([
      'Goal vending_local names an unknown business',
      'Goal vending_global names a stage that does not exist',
      'The first rank must start at a net worth of zero',
      'Rank thresholds must ascend',
    ]);
  });

  it('offers briefing tasks that fit every player, paying 2% to 10% of peak net worth (UX03c)', () => {
    const { briefing } = getContent();
    expect(briefing.tasksPerDay).toBe(3);
    expect(new Set(briefing.templates.map((template) => template.measure)).size).toBe(6);
    expect(briefing.templates.filter((template) => template.rewardBps < 200)).toEqual([]);
    expect(briefing.templates.filter((template) => template.rewardBps > 1000)).toEqual([]);
    expect(briefing.bonusBps).toBe(1000);
    expect(
      issuesFor((content) => {
        content.briefing!.templates = content.briefing!.templates.filter(
          (template) => template.needs !== 'nothing',
        );
      }),
    ).toEqual(['The daily briefing needs a task that every player can do']);
  });
});
