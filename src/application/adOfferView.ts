import type { Content } from '@/content';
import { adOfferRefusal, briefcaseCents } from '@/domain/adRewardEffects';
import { adRewardsLeft, type AdOffer } from '@/domain/adRewards';
import { moneyCents, type MoneyCents } from '@/domain/money';

import { adRewardEconomy } from './economy';
import type { GameSnapshot } from './game';
import type { TapBoostAd } from './tapBoostView';

type DailyUse = { readonly left: number; readonly limit: number };

export type AdOfferView =
  | { readonly status: 'hidden' }
  | { readonly status: 'used_up'; readonly limit: number }
  | { readonly status: TapBoostAd; readonly daily: DailyUse | undefined };

function dailyUse(snapshot: GameSnapshot, content: Content, offer: AdOffer): DailyUse | undefined {
  if (offer.kind === 'double_offline') return undefined;
  const rules = content.adRewards;
  return {
    left: adRewardsLeft(snapshot.state, { kind: offer.kind, rules }),
    limit: rules.dailyLimits[offer.kind],
  };
}

export function selectAdOffer(
  snapshot: GameSnapshot,
  offering: { readonly content: Content; readonly offer: AdOffer },
): AdOfferView {
  const { content, offer } = offering;
  const daily = dailyUse(snapshot, content, offer);
  const refusal = adOfferRefusal(snapshot.state, { offer, economy: adRewardEconomy(content) });
  if (refusal === 'AD_REWARD_LIMIT' && daily !== undefined)
    return { status: 'used_up', limit: daily.limit };
  if (refusal !== undefined) return { status: 'hidden' };
  return { status: snapshot.tapBoostAd, daily };
}

export function selectBriefcaseCents(snapshot: GameSnapshot, content: Content): MoneyCents {
  return moneyCents(briefcaseCents(snapshot.state, adRewardEconomy(content)));
}

export type AdOfferText = {
  readonly buttonLabel: string;
  readonly note: string | undefined;
  readonly enabled: boolean;
};

const WAITING: Readonly<Record<Exclude<TapBoostAd, 'ready'>, Omit<AdOfferText, 'note'>>> = {
  loading: { buttonLabel: 'Loading ad…', enabled: false },
  showing: { buttonLabel: 'Ad playing…', enabled: false },
  unavailable: { buttonLabel: 'No ad available · Try again', enabled: true },
};

export function adOfferText(
  view: Exclude<AdOfferView, { status: 'hidden' }>,
  reward: string,
): AdOfferText {
  if (view.status === 'used_up')
    return {
      buttonLabel: 'Back tomorrow',
      note: `All ${view.limit} used today`,
      enabled: false,
    };
  const note =
    view.daily === undefined ? undefined : `${view.daily.left} of ${view.daily.limit} left today`;
  if (view.status === 'ready') return { buttonLabel: `Watch ad · ${reward}`, note, enabled: true };
  return { ...WAITING[view.status], note };
}
