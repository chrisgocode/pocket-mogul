import type {
  AvailableImprovement,
  AvailableUnit,
  BusinessSale,
} from '@/application/businessDetailView';
import type { Business } from '@/content';
import type { GameCommand } from '@/domain/commands';
import { formatMoneyExact, moneyCents, type MoneyCents } from '@/domain/money';
import type { ActionSheetText } from '@/features/game/ActionSheet';
import { formatCashChange } from '@/features/game/priceFormat';

import { formatPerDay, TRACK_NAMES } from './businessFormat';

export type BusinessAction =
  | { readonly kind: 'unit'; readonly business: Business; readonly unit: AvailableUnit }
  | {
      readonly kind: 'improve';
      readonly business: Business;
      readonly improvement: AvailableImprovement;
    }
  | { readonly kind: 'withdraw'; readonly business: Business; readonly amountCents: MoneyCents }
  | { readonly kind: 'sell'; readonly business: Business; readonly sale: BusinessSale };

const spent = (priceCents: MoneyCents) => moneyCents(0n - priceCents);

export function businessActionCommand(action: BusinessAction): GameCommand {
  const businessId = action.business.id;
  if (action.kind === 'sell') return { type: 'SellBusiness', businessId };
  if (action.kind === 'withdraw') {
    return { type: 'WithdrawFromTreasury', businessId, amountCents: action.amountCents };
  }
  if (action.kind === 'unit') return { type: 'BuyUnit', businessId, fromUnits: action.unit.units };
  const { track, level } = action.improvement;
  return { type: 'UpgradeBusiness', businessId, track, fromLevel: level };
}

const profitChange = (from: MoneyCents, to: MoneyCents) =>
  `${formatPerDay(from)} → ${formatPerDay(to)}`;

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

export function businessActionSheetText(action: BusinessAction): ActionSheetText {
  if (action.kind === 'sell') return saleText(action);
  if (action.kind === 'withdraw') return withdrawText(action);
  if (action.kind === 'unit') return unitText(action);
  return improvementText(action.improvement);
}
