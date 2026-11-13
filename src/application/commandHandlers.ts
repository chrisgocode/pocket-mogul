import { revalueChangedListings } from './listingMarket';
import { withCommandTax } from '@/domain/tax/commandAccounting';
import { fileTaxReturn } from '@/domain/tax/filing';
import { collectTaxDebt, taxRestricted } from '@/domain/tax/collection';
import { applyGoPublic } from '@/domain/business/listingCommands';
import type { Content } from '@/content';
import { applyActivateBoost, applyRecordAdReward } from '@/domain/boost';
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
  applyInstallDetailing,
  applySetMemberCap,
  applySetMembershipPrice,
  applySetWashPackage,
} from '@/domain/business/carWashCommands';
import {
  applyAcceptContract,
  applyDeclineContract,
  applyInstallSortingHub,
} from '@/domain/business/deliveryCommands';
import {
  applyInstallSecondWindow,
  applySetCartSpot,
  applySetMenuItem,
} from '@/domain/business/foodCartCommands';
import {
  applyFireStaff,
  applyHireStaff,
  applyUpgradeStage,
} from '@/domain/business/growthCommands';
import { applySetInsurance } from '@/domain/business/riskCommands';
import { applyMakeTakeoverOffer } from '@/domain/business/takeoverCommands';
import {
  applyInstallCardReaders,
  applyMoveVendingMachine,
  applyRestockVending,
  applySetVendingMix,
} from '@/domain/business/vendingCommands';
import { applyDismissCoachMark } from '@/domain/coachMarks';
import type { CommandResult, GameCommand } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';
import { applyPinGoal } from '@/domain/goals';
import { moneyCents } from '@/domain/money';
import {
  applyBuyProperty,
  applySellProperty,
  applySetRentalStatus,
  applyUpgradeProperty,
} from '@/domain/properties';
import { applyTapBatch } from '@/domain/tapping';
import { applyUpdateSettings } from '@/domain/settings';
import { applyExecuteTrade, applySetWatchlist } from '@/domain/trades';
import { applySkipTutorial } from '@/domain/tutorial';
import { applyWalletUpgrade } from '@/domain/wallet';

import { businessEconomy, goalRules, propertyEconomy, tradeEconomy } from './economy';

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
    const multiplier = command.boosted === true ? content.economy.boost.tapMultiplier : 1;
    const paid = applyTapBatch(state, {
      taps: command.taps,
      rules: content.economy.tap,
      multiplier,
    });
    return { ok: true, state: paid.state, cashChangeCents: paid.earnedCents };
  },
  UpgradeWallet: (state, command, content) =>
    applyWalletUpgrade(state, { fromLevel: command.fromLevel, rules: content.economy.tap }),
  BuyBusiness: (state, command, content) =>
    applyBuyBusiness(state, { ...command, economy: businessEconomy(content) }),
  BuyUnit: (state, command, content) =>
    applyBuyUnit(state, { ...command, economy: businessEconomy(content) }),
  UpgradeBusiness: (state, command, content) =>
    applyImproveBusiness(state, { ...command, economy: businessEconomy(content) }),
  SetPriceLevel: (state, command, content) =>
    applySetPriceLevel(state, { ...command, economy: businessEconomy(content) }),
  HireStaff: (state, command, content) =>
    applyHireStaff(state, { ...command, economy: businessEconomy(content) }),
  FireStaff: (state, command, content) =>
    applyFireStaff(state, { ...command, economy: businessEconomy(content) }),
  UpgradeStage: (state, command, content) =>
    applyUpgradeStage(state, { ...command, economy: businessEconomy(content) }),
  SetInsurance: (state, command, content) =>
    applySetInsurance(state, { ...command, economy: businessEconomy(content) }),
  MoveVendingMachine: (state, command, content) =>
    applyMoveVendingMachine(state, { ...command, economy: businessEconomy(content) }),
  SetVendingMix: (state, command, content) =>
    applySetVendingMix(state, { ...command, economy: businessEconomy(content) }),
  RestockVending: (state, command, content) =>
    applyRestockVending(state, { ...command, economy: businessEconomy(content) }),
  InstallCardReaders: (state, command, content) =>
    applyInstallCardReaders(state, { ...command, economy: businessEconomy(content) }),
  SetWashPackage: (state, command, content) =>
    applySetWashPackage(state, { ...command, economy: businessEconomy(content) }),
  SetMembershipPrice: (state, command, content) =>
    applySetMembershipPrice(state, { ...command, economy: businessEconomy(content) }),
  SetMemberCap: (state, command, content) =>
    applySetMemberCap(state, { ...command, economy: businessEconomy(content) }),
  InstallDetailing: (state, command, content) =>
    applyInstallDetailing(state, { ...command, economy: businessEconomy(content) }),
  SetCartSpot: (state, command, content) =>
    applySetCartSpot(state, { ...command, economy: businessEconomy(content) }),
  SetMenuItem: (state, command, content) =>
    applySetMenuItem(state, { ...command, economy: businessEconomy(content) }),
  InstallSecondWindow: (state, command, content) =>
    applyInstallSecondWindow(state, { ...command, economy: businessEconomy(content) }),
  AcceptContract: (state, command, content) =>
    applyAcceptContract(state, { ...command, economy: businessEconomy(content) }),
  DeclineContract: (state, command, content) =>
    applyDeclineContract(state, { ...command, economy: businessEconomy(content) }),
  InstallSortingHub: (state, command, content) =>
    applyInstallSortingHub(state, { ...command, economy: businessEconomy(content) }),
  MakeTakeoverOffer: (state, command, content) =>
    applyMakeTakeoverOffer(state, { ...command, economy: businessEconomy(content) }),
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
  SetPayout: (state, command, content) =>
    applySetPayout(state, { ...command, economy: businessEconomy(content) }),
  DepositToTreasury: (state, command, content) =>
    applyDepositToTreasury(state, { ...command, economy: businessEconomy(content) }),
  WithdrawFromTreasury: (state, command, content) =>
    applyWithdrawFromTreasury(state, { ...command, economy: businessEconomy(content) }),
  SellBusiness: (state, command, content) =>
    applySellBusiness(state, { ...command, economy: businessEconomy(content) }),
  BuyProperty: (state, command, content) =>
    applyBuyProperty(state, { ...command, economy: propertyEconomy(content) }),
  UpgradeProperty: (state, command, content) =>
    applyUpgradeProperty(state, { ...command, economy: propertyEconomy(content) }),
  SetRentalStatus: (state, command, content) =>
    applySetRentalStatus(state, { ...command, economy: propertyEconomy(content) }),
  SellProperty: (state, command, content) =>
    applySellProperty(state, { ...command, economy: propertyEconomy(content) }),
  ExecuteTrade: (state, command, content) =>
    applyExecuteTrade(state, { ...command, economy: tradeEconomy(content, state) }),
  SetWatchlist: (state, command, content) =>
    applySetWatchlist(state, { ...command, economy: tradeEconomy(content, state) }),
  RecordAdReward: (state, command) => applyRecordAdReward(state, command),
  ActivateBoost: (state, _command, content) => applyActivateBoost(state, content.economy.boost),
  PinGoal: (state, command, content) =>
    applyPinGoal(state, { goalId: command.goalId, rules: goalRules(content) }),
  AdvanceTime: (state) => ({ ok: true, state, cashChangeCents: moneyCents(0) }),
  SettleOffline: (state) => ({ ok: true, state, cashChangeCents: moneyCents(0) }),
  AcknowledgeReturnSummary: (state) => ({
    ok: true,
    state: {
      ...state,
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
  'BuyUnit',
  'UpgradeBusiness',
  'UpgradeProperty',
  'UpgradeStage',
  'UpgradeWallet',
  'HireStaff',
  'GoPublic',
  'MakeTakeoverOffer',
  'InstallCardReaders',
  'InstallDetailing',
  'InstallSortingHub',
  'InstallSecondWindow',
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
