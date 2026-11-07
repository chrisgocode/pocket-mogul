import {
  advanceForeground,
  appOpenDecision,
  freshAdSchedule,
  interstitialDecision,
  recordAppOpen,
  recordInterstitial,
  recordRewardedView,
  startSession,
  type AdMoment,
  type AdScheduleRules,
  type AdScheduleState,
} from './adSchedule';

const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const WALL_MS = 1_800_000_000_000;

const RULES: AdScheduleRules = {
  gateAfterForegroundMs: 5 * MINUTE_MS,
  interstitialMinGapMs: 3 * MINUTE_MS,
  interstitialDailyCap: 12,
  tapIdleBeforeAdMs: 2_500,
  afterRewardedQuietMs: 2 * MINUTE_MS,
  appOpenMinSession: 3,
  appOpenMinAwayMs: 30 * MINUTE_MS,
  appOpenMinGapMs: 4 * HOUR_MS,
};

const MOMENT: AdMoment = {
  wallMs: WALL_MS,
  dayKey: 'day-1',
  tutorial: 'finished',
  boost: 'none',
  ad: 'ready',
};

const IDLE = { ...MOMENT, sinceTapMs: 10 * SECOND_MS };

const warmedUp = (): AdScheduleState => advanceForeground(freshAdSchedule(), 5 * MINUTE_MS);

const interstitial = (state: AdScheduleState, moment: Partial<typeof IDLE> = {}) =>
  interstitialDecision(state, RULES, { ...IDLE, ...moment });

describe('the automatic ad gate', () => {
  it('holds every automatic ad until the tutorial is done and 5 minutes of play', () => {
    const early = advanceForeground(freshAdSchedule(), 5 * MINUTE_MS - 1);
    expect(interstitial(early)).toEqual({ kind: 'suppressed', reason: 'warming_up' });
    expect(interstitial(warmedUp(), { tutorial: 'running' })).toEqual({
      kind: 'suppressed',
      reason: 'tutorial',
    });
    expect(interstitial(warmedUp())).toEqual({ kind: 'show' });
  });
});

describe('natural-break interstitials', () => {
  it('waits for 2.5 seconds without a tap (AC31)', () => {
    expect(interstitial(warmedUp(), { sinceTapMs: 2_499 })).toEqual({
      kind: 'suppressed',
      reason: 'recent_tap',
    });
    expect(interstitial(warmedUp(), { sinceTapMs: 2_500 })).toEqual({ kind: 'show' });
  });

  it('is suppressed by a boost, a pending grant or a recent rewarded view (AC32)', () => {
    expect(interstitial(warmedUp(), { boost: 'active' })).toEqual({
      kind: 'suppressed',
      reason: 'boost_active',
    });
    expect(interstitial(warmedUp(), { boost: 'pending' })).toEqual({
      kind: 'suppressed',
      reason: 'pending_grant',
    });
    const rewarded = recordRewardedView(warmedUp(), WALL_MS);
    expect(interstitial(rewarded, { wallMs: WALL_MS + 2 * MINUTE_MS - 1 })).toEqual({
      kind: 'suppressed',
      reason: 'recent_reward',
    });
    expect(interstitial(rewarded, { wallMs: WALL_MS + 2 * MINUTE_MS })).toEqual({ kind: 'show' });
  });

  it('is suppressed without consent, offline or with no fill', () => {
    expect(interstitial(warmedUp(), { ad: 'unavailable' })).toEqual({
      kind: 'suppressed',
      reason: 'not_loaded',
    });
  });

  it('never shows two within 3 minutes of foreground time (AC33)', () => {
    const shown = recordInterstitial(warmedUp(), 'day-1');
    expect(interstitial(shown)).toEqual({ kind: 'wait' });
    expect(interstitial(advanceForeground(shown, 3 * MINUTE_MS - 1))).toEqual({ kind: 'wait' });
    expect(interstitial(advanceForeground(shown, 3 * MINUTE_MS))).toEqual({ kind: 'show' });
  });

  it('shows at most 12 a local day, and 12 more the next day (AC33)', () => {
    const twelve = Array.from({ length: 12 }).reduce<AdScheduleState>(
      (state) => advanceForeground(recordInterstitial(state, 'day-1'), 3 * MINUTE_MS),
      warmedUp(),
    );
    expect(twelve.interstitials).toEqual({ dayKey: 'day-1', count: 12 });
    expect(interstitial(twelve)).toEqual({ kind: 'suppressed', reason: 'daily_cap' });
    expect(interstitial(twelve, { dayKey: 'day-2' })).toEqual({ kind: 'show' });
    expect(recordInterstitial(twelve, 'day-2').interstitials).toEqual({
      dayKey: 'day-2',
      count: 1,
    });
  });

  it('counts an app open ad as the last full-screen ad', () => {
    const opened = recordAppOpen(advanceForeground(warmedUp(), HOUR_MS), WALL_MS);
    expect(interstitial(opened)).toEqual({ kind: 'wait' });
  });

  it('ignores foreground time that does not move forward', () => {
    const state = warmedUp();
    expect(advanceForeground(state, 0)).toBe(state);
    expect(advanceForeground(state, -SECOND_MS)).toBe(state);
  });
});

const sessions = (count: number): AdScheduleState =>
  Array.from({ length: count }).reduce<AdScheduleState>((state) => startSession(state), warmedUp());

const appOpen = (state: AdScheduleState, moment: Partial<AdMoment & { awayMs: number }> = {}) =>
  appOpenDecision(state, RULES, { ...MOMENT, awayMs: 30 * MINUTE_MS, ...moment });

describe('app open ads', () => {
  it('waits for the third session and 30 minutes away', () => {
    expect(appOpen(sessions(2))).toEqual({ kind: 'wait' });
    expect(appOpen(sessions(3), { awayMs: 30 * MINUTE_MS - 1 })).toEqual({ kind: 'wait' });
    expect(appOpen(sessions(3))).toEqual({ kind: 'show' });
  });

  it('shows at most once every 4 hours', () => {
    const shown = recordAppOpen(sessions(3), WALL_MS);
    expect(shown.sinceFullScreenAdMs).toBe(0);
    expect(appOpen(shown, { wallMs: WALL_MS + 4 * HOUR_MS - 1 })).toEqual({ kind: 'wait' });
    expect(appOpen(shown, { wallMs: WALL_MS + 4 * HOUR_MS })).toEqual({ kind: 'show' });
  });

  it('shares the full-screen suppressions (AC32)', () => {
    expect(appOpen(sessions(3), { tutorial: 'running' })).toEqual({
      kind: 'suppressed',
      reason: 'tutorial',
    });
    expect(appOpen(sessions(3), { boost: 'pending' })).toEqual({
      kind: 'suppressed',
      reason: 'pending_grant',
    });
    expect(appOpen(sessions(3), { ad: 'loading' })).toEqual({
      kind: 'suppressed',
      reason: 'not_loaded',
    });
  });

  it('treats a wall clock set backward as long enough ago', () => {
    const shown = recordAppOpen(sessions(3), WALL_MS);
    expect(appOpen(shown, { wallMs: WALL_MS - HOUR_MS })).toEqual({ kind: 'show' });
  });
});
