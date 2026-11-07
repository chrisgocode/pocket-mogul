export type AdScheduleRules = {
  readonly gateAfterForegroundMs: number;
  readonly interstitialMinGapMs: number;
  readonly interstitialDailyCap: number;
  readonly tapIdleBeforeAdMs: number;
  readonly afterRewardedQuietMs: number;
  readonly appOpenMinSession: number;
  readonly appOpenMinAwayMs: number;
  readonly appOpenMinGapMs: number;
};

export type AdScheduleState = {
  readonly foregroundMs: number;
  readonly sinceFullScreenAdMs: number;
  readonly interstitials: { readonly dayKey: string; readonly count: number };
  readonly lastRewardedWallMs: number | null;
  readonly sessions: number;
  readonly lastAppOpenWallMs: number | null;
};

export type NaturalBreak = 'left_home' | 'sheet_closed' | 'goal_completed';

export type SuppressionReason =
  | 'tutorial'
  | 'warming_up'
  | 'boost_active'
  | 'pending_grant'
  | 'recent_reward'
  | 'not_loaded'
  | 'daily_cap'
  | 'recent_tap';

export type AdMoment = {
  readonly wallMs: number;
  readonly dayKey: string;
  readonly tutorial: 'running' | 'finished';
  readonly boost: 'none' | 'pending' | 'active';
  readonly ad: 'loading' | 'ready' | 'unavailable';
};

export type InterstitialMoment = AdMoment & { readonly sinceTapMs: number };

export type AppOpenMoment = AdMoment & { readonly awayMs: number };

export type AdDecision =
  | { readonly kind: 'show' }
  | { readonly kind: 'wait' }
  | { readonly kind: 'suppressed'; readonly reason: SuppressionReason };

const SHOW: AdDecision = { kind: 'show' };
const WAIT: AdDecision = { kind: 'wait' };

export const freshAdSchedule = (): AdScheduleState => ({
  foregroundMs: 0,
  sinceFullScreenAdMs: 0,
  interstitials: { dayKey: '', count: 0 },
  lastRewardedWallMs: null,
  sessions: 0,
  lastAppOpenWallMs: null,
});

export function advanceForeground(state: AdScheduleState, elapsedMs: number): AdScheduleState {
  if (elapsedMs <= 0) return state;
  return {
    ...state,
    foregroundMs: state.foregroundMs + elapsedMs,
    sinceFullScreenAdMs: state.sinceFullScreenAdMs + elapsedMs,
  };
}

export const startSession = (state: AdScheduleState): AdScheduleState => ({
  ...state,
  sessions: state.sessions + 1,
});

export const recordRewardedView = (state: AdScheduleState, wallMs: number): AdScheduleState => ({
  ...state,
  lastRewardedWallMs: wallMs,
});

function interstitialsToday(state: AdScheduleState, dayKey: string): number {
  return state.interstitials.dayKey === dayKey ? state.interstitials.count : 0;
}

export function recordInterstitial(state: AdScheduleState, dayKey: string): AdScheduleState {
  return {
    ...state,
    sinceFullScreenAdMs: 0,
    interstitials: { dayKey, count: interstitialsToday(state, dayKey) + 1 },
  };
}

export const recordAppOpen = (state: AdScheduleState, wallMs: number): AdScheduleState => ({
  ...state,
  sinceFullScreenAdMs: 0,
  lastAppOpenWallMs: wallMs,
});

function elapsedSince(sinceWallMs: number | null, wallMs: number): number {
  if (sinceWallMs === null || wallMs < sinceWallMs) return Number.POSITIVE_INFINITY;
  return wallMs - sinceWallMs;
}

function gateReason(
  state: AdScheduleState,
  rules: AdScheduleRules,
  moment: Pick<AdMoment, 'tutorial'>,
): SuppressionReason | undefined {
  if (moment.tutorial === 'running') return 'tutorial';
  if (state.foregroundMs < rules.gateAfterForegroundMs) return 'warming_up';
  return undefined;
}

function fullScreenReason(
  state: AdScheduleState,
  rules: AdScheduleRules,
  moment: AdMoment,
): SuppressionReason | undefined {
  const gate = gateReason(state, rules, moment);
  if (gate !== undefined) return gate;
  if (moment.boost === 'active') return 'boost_active';
  if (moment.boost === 'pending') return 'pending_grant';
  if (elapsedSince(state.lastRewardedWallMs, moment.wallMs) < rules.afterRewardedQuietMs)
    return 'recent_reward';
  return moment.ad === 'ready' ? undefined : 'not_loaded';
}

const decided = (reason: SuppressionReason | undefined): AdDecision =>
  reason === undefined ? SHOW : { kind: 'suppressed', reason };

export function interstitialDecision(
  state: AdScheduleState,
  rules: AdScheduleRules,
  moment: InterstitialMoment,
): AdDecision {
  if (state.sinceFullScreenAdMs < rules.interstitialMinGapMs) return WAIT;
  const reason = fullScreenReason(state, rules, moment);
  if (reason !== undefined) return decided(reason);
  if (interstitialsToday(state, moment.dayKey) >= rules.interstitialDailyCap)
    return decided('daily_cap');
  return decided(moment.sinceTapMs < rules.tapIdleBeforeAdMs ? 'recent_tap' : undefined);
}

export function appOpenDecision(
  state: AdScheduleState,
  rules: AdScheduleRules,
  moment: AppOpenMoment,
): AdDecision {
  const due =
    state.sessions >= rules.appOpenMinSession &&
    moment.awayMs >= rules.appOpenMinAwayMs &&
    elapsedSince(state.lastAppOpenWallMs, moment.wallMs) >= rules.appOpenMinGapMs;
  return due ? decided(fullScreenReason(state, rules, moment)) : WAIT;
}
