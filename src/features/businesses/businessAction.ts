import type {
  AvailableHire,
  AvailableImprovement,
  AvailableUnit,
  BusinessSale,
  ReadyStage,
} from '@/application/businessDetailView';
import type { AvailableDetailing } from '@/application/carWashView';
import type { AvailableSortingHub, OfferView } from '@/application/deliveryView';
import type { AvailableCardReaders } from '@/application/vendingView';
import type { Business } from '@/content';
import type { StaffRole } from '@/domain/business/definition';
import type { GameCommand } from '@/domain/commands';
import { formatMoneyExact, type MoneyCents } from '@/domain/money';
import type { ActionSheetText } from '@/features/game/ActionSheet';
import { formatCashChange } from '@/features/game/priceFormat';

import { profitChange, spent, TRACK_NAMES } from './businessFormat';
import { fireText, hireText, stageText } from './growthActionText';
import { detailingText } from './carWashActionText';
import { contractText, sortingHubText } from './deliveryActionText';
import { takeoverText } from './takeoverActionText';
import type { TakeoverChoice } from './takeoverFormat';
import { cardReaderText } from './vendingActionText';

export type BusinessAction =
  | {
      readonly kind: 'listing';
      readonly business: Business;
      readonly floatPercent: number;
      readonly ticker: string;
      readonly proceedsCents: MoneyCents;
    }
  | { readonly kind: 'unit'; readonly business: Business; readonly unit: AvailableUnit }
  | {
      readonly kind: 'improve';
      readonly business: Business;
      readonly improvement: AvailableImprovement;
    }
  | { readonly kind: 'hire'; readonly business: Business; readonly hire: AvailableHire }
  | {
      readonly kind: 'fire';
      readonly business: Business;
      readonly role: StaffRole;
      readonly count: number;
    }
  | { readonly kind: 'stage'; readonly business: Business; readonly stage: ReadyStage }
  | {
      readonly kind: 'card_readers';
      readonly business: Business;
      readonly readers: AvailableCardReaders;
    }
  | {
      readonly kind: 'detailing';
      readonly business: Business;
      readonly detailing: AvailableDetailing;
    }
  | { readonly kind: 'contract'; readonly business: Business; readonly offer: OfferView }
  | { readonly kind: 'sorting_hub'; readonly business: Business; readonly hub: AvailableSortingHub }
  | {
      readonly kind: 'signature';
      readonly business: Business;
      readonly command: GameCommand;
      readonly text: ActionSheetText;
    }
  | { readonly kind: 'takeover'; readonly business: Business; readonly choice: TakeoverChoice }
  | { readonly kind: 'withdraw'; readonly business: Business; readonly amountCents: MoneyCents }
  | { readonly kind: 'sell'; readonly business: Business; readonly sale: BusinessSale };

const WHOLE_PERCENT = 100;

type ActionOf<Kind extends BusinessAction['kind']> = Extract<BusinessAction, { kind: Kind }>;

type ActionHandlers<Result> = {
  readonly [Kind in BusinessAction['kind']]: (action: ActionOf<Kind>) => Result;
};

function handle<Kind extends BusinessAction['kind'], Result>(
  handlers: ActionHandlers<Result>,
  action: ActionOf<Kind>,
): Result {
  const handler: (action: ActionOf<Kind>) => Result = handlers[action.kind];
  return handler(action);
}

const COMMANDS: ActionHandlers<GameCommand> = {
  listing: ({ business, floatPercent, ticker }) => ({
    type: 'GoPublic',
    businessId: business.id,
    floatPercent,
    ticker,
  }),
  sell: ({ business }) => ({ type: 'SellBusiness', businessId: business.id }),
  withdraw: ({ business, amountCents }) => ({
    type: 'WithdrawFromTreasury',
    businessId: business.id,
    amountCents,
  }),
  unit: ({ business, unit }) => ({
    type: 'BuyUnit',
    businessId: business.id,
    fromUnits: unit.units,
  }),
  improve: ({ business, improvement }) => ({
    type: 'UpgradeBusiness',
    businessId: business.id,
    track: improvement.track,
    fromLevel: improvement.level,
  }),
  hire: ({ business, hire }) => ({
    type: 'HireStaff',
    businessId: business.id,
    role: hire.role,
    fromCount: hire.count,
  }),
  fire: ({ business, role, count }) => ({
    type: 'FireStaff',
    businessId: business.id,
    role,
    fromCount: count,
  }),
  stage: ({ business, stage }) => ({
    type: 'UpgradeStage',
    businessId: business.id,
    fromStage: stage.stage,
  }),
  card_readers: ({ business }) => ({ type: 'InstallCardReaders', businessId: business.id }),
  detailing: ({ business }) => ({ type: 'InstallDetailing', businessId: business.id }),
  contract: ({ business, offer }) => ({
    type: 'AcceptContract',
    businessId: business.id,
    offerId: offer.id,
  }),
  sorting_hub: ({ business }) => ({ type: 'InstallSortingHub', businessId: business.id }),
  signature: ({ command }) => command,
  takeover: ({ business, choice }) => ({
    type: 'MakeTakeoverOffer',
    businessId: business.id,
    rivalId: choice.rival.id,
    amountCents: choice.offer.priceCents,
  }),
};

export function businessActionCommand(action: BusinessAction): GameCommand {
  return handle(COMMANDS, action);
}

function unitText(action: Extract<BusinessAction, { kind: 'unit' }>): ActionSheetText {
  const { unit, business } = action;
  return {
    title: `Add a ${business.unitName}`,
    lines: [
      { label: 'Treasury change', value: formatCashChange(spent(unit.priceCents)) },
      { label: 'Profit', value: profitChange(unit.profitCents, unit.nextProfitCents) },
      { label: 'Units', value: `${unit.units} → ${unit.units + 1}` },
    ],
    confirmLabel: `Confirm · ${formatMoneyExact(unit.priceCents)}`,
  };
}

function improvementText(improvement: AvailableImprovement): ActionSheetText {
  const track = TRACK_NAMES[improvement.label];
  return {
    title: `Upgrade ${track}`,
    lines: [
      { label: 'Treasury change', value: formatCashChange(spent(improvement.priceCents)) },
      {
        label: 'Profit',
        value: profitChange(improvement.profitCents, improvement.nextProfitCents),
      },
      { label: `${track} level`, value: `${improvement.level} → ${improvement.level + 1}` },
    ],
    confirmLabel: `Confirm upgrade · ${formatMoneyExact(improvement.priceCents)}`,
  };
}

function withdrawText(action: Extract<BusinessAction, { kind: 'withdraw' }>): ActionSheetText {
  const amount = formatCashChange(action.amountCents);
  return {
    title: `Withdraw from ${action.business.name}`,
    lines: [
      { label: 'Cash change', value: amount },
      { label: 'Treasury change', value: formatCashChange(spent(action.amountCents)) },
    ],
    confirmLabel: `Confirm withdrawal · ${amount}`,
  };
}

function saleText(action: Extract<BusinessAction, { kind: 'sell' }>): ActionSheetText {
  const proceeds = formatCashChange(action.sale.proceedsCents);
  return {
    title: `Sell ${action.business.name}`,
    lines: [
      { label: 'Cash change', value: proceeds },
      { label: 'Treasury paid out', value: formatMoneyExact(action.sale.treasuryCents) },
      { label: 'You will no longer own', value: action.business.name },
    ],
    confirmLabel: `Confirm sale · ${proceeds}`,
  };
}

const SHEET_TEXT: ActionHandlers<ActionSheetText> = {
  listing: ({ ticker, floatPercent, proceedsCents }) => ({
    title: `List ${ticker}`,
    lines: [
      { label: 'Cash change', value: '$0.00' },
      { label: 'Treasury receives', value: formatMoneyExact(proceedsCents) },
      { label: 'Your ownership after listing', value: `${WHOLE_PERCENT - floatPercent}%` },
      { label: 'Your share of payouts', value: `${WHOLE_PERCENT - floatPercent}%` },
    ],
    confirmLabel: 'Confirm listing',
  }),
  sell: saleText,
  withdraw: withdrawText,
  unit: unitText,
  improve: (action) => improvementText(action.improvement),
  hire: (action) => hireText(action.hire, action.business),
  fire: (action) => fireText(action.role, action.business),
  stage: (action) => stageText(action.stage, action.business),
  card_readers: (action) => cardReaderText(action.readers),
  detailing: (action) => detailingText(action.detailing),
  contract: (action) => contractText(action.offer),
  sorting_hub: (action) => sortingHubText(action.hub),
  signature: ({ text }) => text,
  takeover: (action) => takeoverText(action.choice, action.business),
};

export function businessActionSheetText(action: BusinessAction): ActionSheetText {
  return handle(SHEET_TEXT, action);
}
