import { revalueChangedListings } from './listingMarket';
import { withCommandTax } from '@/domain/tax/commandAccounting';
import { fileTaxReturn } from '@/domain/tax/filing';
import { collectTaxDebt, taxRestricted } from '@/domain/tax/collection';
import { applyGoPublic } from '@/domain/business/listingCommands';
import type { Content } from '@/content';
import { applyClaimAdReward } from '@/domain/adRewardEffects';
import { withOfflineDoubleCleared } from '@/domain/adRewards';
import { applyActivateBoost, applyRecordAdReward } from '@/domain/boost';
import { applyClaimBriefing } from '@/domain/briefing';
import {
  applyBuyBusiness,
  applyBuyUnit,
  applyDepositToTreasury,
  applyImproveBusiness,
  applySellBusiness,
  applySetPayout,
  applySetPriceLevel,
  applyWithdrawFromTreasury,
} from '@/domain/business/commands';
import {
  applyFireStaff,
  applyHireStaff,
  applyUpgradeStage,
} from '@/domain/business/growthCommands';
import { applySetInsurance } from '@/domain/business/riskCommands';
import { applyMakeTakeoverOffer } from '@/domain/business/takeoverCommands';
import {
  applyBuyCollectible,
  applySellCollectible,
  applySetShowpiece,
} from '@/domain/collection/commands';
import { applyDismissCoachMark } from '@/domain/coachMarks';
import type { CommandResult, GameCommand } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';
import { applyPinGoal } from '@/domain/goals';
import { applyClaimGoals } from '@/domain/goalRewards';
import { moneyCents } from '@/domain/money';
import {
  applyBuyProperty,
  applySellProperty,
  applySetRentalStatus,
  applyUpgradeProperty,
} from '@/domain/properties';
import { applyDismissRichListNews } from '@/domain/richList';
import { applyTapBatch } from '@/domain/tapping';

import { tapBonusPercent } from './collectionSetsView';
import { applyUpdateSettings } from '@/domain/settings';
import { applyExecuteTrade, applySetWatchlist } from '@/domain/trades';
import { applySkipTutorial } from '@/domain/tutorial';
import { applyWalletUpgrade } from '@/domain/wallet';

import {
  adRewardEconomy,
  briefingRules,
  businessEconomy,
  collectionEconomy,
  goalRules,
  propertyEconomy,
  tradeEconomy,
} from './economy';
import { tapMultiplier } from './purchaseEffects';
import { FLAGSHIP_HANDLERS, FLAGSHIP_INVESTMENTS, withEconomy } from './flagshipHandlers';

type CommandsByType = { [Type in GameCommand['type']]: Extract<GameCommand, { type: Type }> };

type CommandHandlers = {
  readonly [Type in keyof CommandsByType]: (
    state: GameState,
    command: CommandsByType[Type],
    content: Content,
  ) => CommandResult;
};

const COMMAND_HANDLERS: CommandHandlers = {
  FileTaxReturn: (state, command, content) =>
    content.economy.taxes === undefined
      ? { ok: false, error: 'TAX_RETURN_UNAVAILABLE' }
      : fileTaxReturn(state, { ...command, rules: content.economy.taxes }),
  PayTaxDebt: (state, command) => {
    const paid = collectTaxDebt(state, command.amountCents);
    return { ok: true, state: paid, cashChangeCents: moneyCents(paid.cashCents - state.cashCents) };
  },
  TapBatch: (state, command, content) => {
    const paid = applyTapBatch(state, {
      taps: command.taps,
      rules: content.economy.tap,
      multiplier: tapMultiplier(state, { content, boosted: command.boosted === true }),
      bonusPercent: tapBonusPercent(state, content),
    });
    return { ok: true, state: paid.state, cashChangeCents: paid.earnedCents };
  },
  UpgradeWallet: (state, command, content) =>
    applyWalletUpgrade(state, { fromLevel: command.fromLevel, rules: content.economy.tap }),
  BuyBusiness: withEconomy(applyBuyBusiness),
  BuyUnit: withEconomy(applyBuyUnit),
  UpgradeBusiness: withEconomy(applyImproveBusiness),
  SetPriceLevel: withEconomy(applySetPriceLevel),
  HireStaff: withEconomy(applyHireStaff),
  FireStaff: withEconomy(applyFireStaff),
  UpgradeStage: withEconomy(applyUpgradeStage),
  SetInsurance: withEconomy(applySetInsurance),
  ...FLAGSHIP_HANDLERS,
  MakeTakeoverOffer: withEconomy(applyMakeTakeoverOffer),
  GoPublic: (state, command, content) =>
    applyGoPublic(state, {
      ...command,
      economy: businessEconomy(content),
      reservedTickers: [
        ...content.stocks.map((stock) => stock.ticker),
        ...content.coins.map((coin) => coin.ticker),
        ...state.businesses.flatMap((owned) =>
          owned.listing.status === 'listed' ? [owned.listing.ticker] : [],
        ),
      ],
    }),
  DismissCoachMark: (state, command) => applyDismissCoachMark(state, command.coachMark),
  SetPayout: withEconomy(applySetPayout),
  DepositToTreasury: withEconomy(applyDepositToTreasury),
  WithdrawFromTreasury: withEconomy(applyWithdrawFromTreasury),
  SellBusiness: withEconomy(applySellBusiness),
  BuyProperty: (state, command, content) =>
    applyBuyProperty(state, { ...command, economy: propertyEconomy(content) }),
  UpgradeProperty: (state, command, content) =>
    applyUpgradeProperty(state, { ...command, economy: propertyEconomy(content) }),
  SetRentalStatus: (state, command, content) =>
    applySetRentalStatus(state, { ...command, economy: propertyEconomy(content) }),
  SellProperty: (state, command, content) =>
    applySellProperty(state, { ...command, economy: propertyEconomy(content) }),
  BuyCollectible: (state, command, content) =>
    applyBuyCollectible(state, { ...command, economy: collectionEconomy(content) }),
  SellCollectible: (state, command, content) =>
    applySellCollectible(state, { ...command, economy: collectionEconomy(content) }),
  SetShowpiece: (state, command) => applySetShowpiece(state, command),
  ExecuteTrade: (state, command, content) =>
    applyExecuteTrade(state, { ...command, economy: tradeEconomy(content, state) }),
  SetWatchlist: (state, command, content) =>
    applySetWatchlist(state, { ...command, economy: tradeEconomy(content, state) }),
  RecordAdReward: (state, command) => applyRecordAdReward(state, command),
  ActivateBoost: (state, _command, content) => applyActivateBoost(state, content.economy.boost),
  ClaimGoals: (state, command, content) =>
    applyClaimGoals(state, { goalIds: command.goalIds, rules: goalRules(content) }),
  ClaimBriefing: (state, _command, content) => applyClaimBriefing(state, briefingRules(content)),
  ClaimAdReward: (state, command, content) =>
    applyClaimAdReward(state, { offer: command.offer, economy: adRewardEconomy(content) }),
  DismissRichListNews: (state) => applyDismissRichListNews(state),
  PinGoal: (state, command, content) =>
    applyPinGoal(state, { goalId: command.goalId, rules: goalRules(content) }),
  AdvanceTime: (state) => ({ ok: true, state, cashChangeCents: moneyCents(0) }),
  SettleOffline: (state) => ({ ok: true, state, cashChangeCents: moneyCents(0) }),
  AcknowledgeReturnSummary: (state) => ({
    ok: true,
    state: {
      ...withOfflineDoubleCleared(state),
      returnSummary: { status: 'none' },
      tax:
        state.tax.status === 'notStarted'
          ? state.tax
          : { ...state.tax, absence: { status: 'none' } },
    },
    cashChangeCents: moneyCents(0),
  }),
  SkipTutorial: (state) => applySkipTutorial(state),
  UpdateSettings: (state, command) => applyUpdateSettings(state, command.change),
};

export function applyCommand<Type extends keyof CommandsByType>(
  state: GameState,
  command: { type: Type; payload: CommandsByType[Type] },
  content: Content,
): CommandResult {
  if (staleTaxQuote(state, command.payload)) return { ok: false, error: 'STALE_QUOTE' };
  if (taxRestricted(state.tax) && restrictedInvestment(command.payload))
    return { ok: false, error: 'TAX_ACTION_REQUIRED' };
  const result = withCommandTax(state, {
    result: COMMAND_HANDLERS[command.type](state, command.payload, content),
    command: command.payload,
    economy: {
      dayMs: content.economy.businessRules.dayMs,
      trades: tradeEconomy(content, state),
      rules: content.economy.taxes,
    },
  });
  return result.ok
    ? { ...result, state: revalueChangedListings(state, result.state, content) }
    : result;
}

const INVESTMENTS = new Set<GameCommand['type']>([
  'BuyBusiness',
  'BuyProperty',
  'BuyCollectible',
  'BuyUnit',
  'UpgradeBusiness',
  'UpgradeProperty',
  'UpgradeStage',
  'UpgradeWallet',
  'HireStaff',
  'GoPublic',
  'MakeTakeoverOffer',
  ...FLAGSHIP_INVESTMENTS,
]);

function restrictedInvestment(command: GameCommand): boolean {
  return (
    INVESTMENTS.has(command.type) || (command.type === 'ExecuteTrade' && command.side === 'buy')
  );
}

function staleTaxQuote(state: GameState, command: GameCommand): boolean {
  return (
    'quotedRevision' in command &&
    command.quotedRevision !== undefined &&
    command.quotedRevision !== state.revision
  );
}
