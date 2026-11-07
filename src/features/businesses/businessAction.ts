import type {
  AvailableHire,
  AvailableImprovement,
  AvailableUnit,
  BusinessSale,
  ReadyStage,
} from '@/application/businessDetailView';
import type { AvailableCardReaders } from '@/application/vendingView';
import type { Business } from '@/content';
import type { StaffRole } from '@/domain/business/definition';
import type { GameCommand } from '@/domain/commands';
import { formatMoneyExact, type MoneyCents } from '@/domain/money';
import type { ActionSheetText } from '@/features/game/ActionSheet';
import { formatCashChange } from '@/features/game/priceFormat';

import { profitChange, spent, TRACK_NAMES } from './businessFormat';
import { fireText, hireText, stageText } from './growthActionText';
import { cardReaderText } from './vendingActionText';

export type BusinessAction =
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
  | { readonly kind: 'withdraw'; readonly business: Business; readonly amountCents: MoneyCents }
  | { readonly kind: 'sell'; readonly business: Business; readonly sale: BusinessSale };

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
  const track = TRACK_NAMES[improvement.track];
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
  sell: saleText,
  withdraw: withdrawText,
  unit: unitText,
  improve: (action) => improvementText(action.improvement),
  hire: (action) => hireText(action.hire, action.business),
  fire: (action) => fireText(action.role, action.business),
  stage: (action) => stageText(action.stage),
  card_readers: (action) => cardReaderText(action.readers),
};

export function businessActionSheetText(action: BusinessAction): ActionSheetText {
  return handle(SHEET_TEXT, action);
}
