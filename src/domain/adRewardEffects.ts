import {
  adRewardsLeft,
  withAdRewardUsed,
  type AdOffer,
  type AdRewardEconomy,
  type DailyAdReward,
} from './adRewards';
import { changed, lookUpOwned } from './business/commands';
import { businessDayOf } from './business/definition';
import { NO_INCIDENT } from './business/owned';
import { lockOn } from './business/takeovers';
import { auctionLots, auctionPeriod, lotRedrawsOn } from './collection/auction';
import { collectionDayOf } from './collection/rules';
import type { CommandResult, GameErrorCode } from './commands';
import type { GameState } from './gameState';
import { moneyCents } from './money';
import { passiveIncomePerMinuteCents, totalIncome } from './passiveIncome';

type Claim = { readonly offer: AdOffer; readonly economy: AdRewardEconomy };
type Offer<Kind extends AdOffer['kind']> = Extract<AdOffer, { kind: Kind }>;

const UNAVAILABLE: CommandResult = { ok: false, error: 'AD_REWARD_UNAVAILABLE' };

function paid(state: GameState, cents: bigint): CommandResult {
  if (cents <= 0n) return UNAVAILABLE;
  return {
    ok: true,
    cashChangeCents: moneyCents(cents),
    state: { ...state, cashCents: moneyCents(state.cashCents + cents) },
  };
}

function doubleOffline(state: GameState): CommandResult {
  const { returnSummary, adRewards } = state;
  if (returnSummary.status === 'none' || adRewards.offlineDouble.status === 'claimed')
    return UNAVAILABLE;
  const bonus = returnSummary.summary.earnings;
  const offlineDouble = { status: 'claimed', bonus } as const;
  return paid({ ...state, adRewards: { ...adRewards, offlineDouble } }, totalIncome(bonus));
}

function rushDay(state: GameState, offer: Offer<'rush_day'>, economy: AdRewardEconomy) {
  const found = lookUpOwned(state, { ...offer, economy: economy.passive.businesses });
  if (!found.ok) return found;
  const { owned, pricing } = found;
  if (owned.status === 'closed') return { ok: false, error: 'BUSINESS_CLOSED' } as const;
  if (owned.rushDay.status === 'active') return UNAVAILABLE;
  const today = businessDayOf(state.clock.simulationMs, pricing.rules);
  const { rushDays, rushProfitBps } = economy.rules;
  return changed(state, {
    ...owned,
    rushDay: { status: 'active', endsDay: today + 1 + rushDays, profitBps: rushProfitBps },
  });
}

function endIncident(state: GameState, offer: Offer<'end_incident'>, economy: AdRewardEconomy) {
  const found = lookUpOwned(state, { ...offer, economy: economy.passive.businesses });
  if (!found.ok) return found;
  if (found.owned.incident.status === 'none') return UNAVAILABLE;
  return changed(state, { ...found.owned, incident: NO_INCIDENT });
}

function clearLock(
  state: GameState,
  offer: Offer<'clear_takeover_lock'>,
  economy: AdRewardEconomy,
): CommandResult {
  const found = lookUpOwned(state, { ...offer, economy: economy.passive.businesses });
  if (!found.ok) return found;
  const { owned, pricing } = found;
  const day = businessDayOf(state.clock.simulationMs, pricing.rules);
  if (lockOn(owned, { rivalId: offer.rivalId, day }) === undefined) return UNAVAILABLE;
  const locks = owned.takeovers.locks.filter((lock) => lock.rivalId !== offer.rivalId);
  return changed(state, { ...owned, takeovers: { ...owned.takeovers, locks } });
}

function redrawLots(state: GameState, economy: AdRewardEconomy): CommandResult {
  const { collection } = economy;
  const today = { ...collectionDayOf(state, collection.rules), economy: collection };
  const redraws = lotRedrawsOn(state.adRewards.lotRedraws, today);
  const maxTier = Math.max(...state.unlockedTiers);
  if (auctionLots({ ...today, maxTier, redraws }).length === 0) return UNAVAILABLE;
  const lotRedraws = { period: auctionPeriod(today.day, collection), count: redraws + 1 };
  return {
    ok: true,
    cashChangeCents: moneyCents(0),
    state: { ...state, adRewards: { ...state.adRewards, lotRedraws } },
  };
}

export function briefcaseCents(state: GameState, economy: AdRewardEconomy): bigint {
  return (
    passiveIncomePerMinuteCents(state, economy.passive) * BigInt(economy.rules.briefcaseMinutes)
  );
}

function rewarded(state: GameState, claim: Claim): CommandResult {
  const { offer, economy } = claim;
  if (offer.kind === 'double_offline') return doubleOffline(state);
  if (offer.kind === 'rush_day') return rushDay(state, offer, economy);
  if (offer.kind === 'end_incident') return endIncident(state, offer, economy);
  if (offer.kind === 'clear_takeover_lock') return clearLock(state, offer, economy);
  if (offer.kind === 'redraw_lots') return redrawLots(state, economy);
  return paid(state, briefcaseCents(state, economy));
}

const dailyKind = (offer: AdOffer): DailyAdReward | undefined =>
  offer.kind === 'double_offline' ? undefined : offer.kind;

export function applyClaimAdReward(state: GameState, claim: Claim): CommandResult {
  const kind = dailyKind(claim.offer);
  if (kind !== undefined && adRewardsLeft(state, { kind, rules: claim.economy.rules }) === 0)
    return { ok: false, error: 'AD_REWARD_LIMIT' };
  const result = rewarded(state, claim);
  if (!result.ok || kind === undefined) return result;
  return { ...result, state: withAdRewardUsed(result.state, kind) };
}

export function adOfferRefusal(state: GameState, claim: Claim): GameErrorCode | undefined {
  const result = applyClaimAdReward(state, claim);
  return result.ok ? undefined : result.error;
}
