import type {
  AvailableBusinessUpgrade,
  AvailableManager,
  BusinessSale,
} from '@/application/businessDetailView';
import type { Business } from '@/content';
import type { GameCommand } from '@/domain/commands';
import { formatMoneyExact, formatRatePerMinute, moneyCents, type MoneyCents } from '@/domain/money';
import type { ConfirmationLine } from '@/ui/ConfirmationDetails';

import { formatCashChange, formatRateChange, TRACK_NAMES } from './businessFormat';

export type BusinessAction =
  | {
      readonly kind: 'upgrade';
      readonly business: Business;
      readonly upgrade: AvailableBusinessUpgrade;
    }
  | { readonly kind: 'manager'; readonly business: Business; readonly manager: AvailableManager }
  | {
      readonly kind: 'sell';
      readonly business: Business;
      readonly sale: BusinessSale;
      readonly netPerMinuteCents: MoneyCents;
    };

export type BusinessActionSheetText = {
  readonly title: string;
  readonly lines: readonly ConfirmationLine[];
  readonly confirmLabel: string;
};

const spent = (priceCents: MoneyCents) => moneyCents(0n - priceCents);

export function businessActionCommand(action: BusinessAction): GameCommand {
  const businessId = action.business.id;
  if (action.kind === 'manager') return { type: 'HireManager', businessId };
  if (action.kind === 'sell') return { type: 'SellBusiness', businessId };
  const { track, level } = action.upgrade;
  return { type: 'UpgradeBusiness', businessId, track, fromLevel: level };
}

function upgradeText(upgrade: AvailableBusinessUpgrade): BusinessActionSheetText {
  const track = TRACK_NAMES[upgrade.track];
  return {
    title: `Upgrade ${track}`,
    lines: [
      { label: 'Cash change', value: formatCashChange(spent(upgrade.priceCents)) },
      {
        label: 'Net income',
        value: formatRateChange(upgrade.netPerMinuteCents, upgrade.nextNetPerMinuteCents),
      },
      { label: `${track} level`, value: `${upgrade.level} → ${upgrade.level + 1}` },
    ],
    confirmLabel: `Confirm upgrade · ${formatMoneyExact(upgrade.priceCents)}`,
  };
}

function managerText(manager: AvailableManager): BusinessActionSheetText {
  return {
    title: 'Hire manager',
    lines: [
      { label: 'Cash change', value: formatCashChange(spent(manager.priceCents)) },
      {
        label: 'Net income',
        value: formatRateChange(manager.netPerMinuteCents, manager.nextNetPerMinuteCents),
      },
    ],
    confirmLabel: `Confirm hire · ${formatMoneyExact(manager.priceCents)}`,
  };
}

function saleText(action: Extract<BusinessAction, { kind: 'sell' }>): BusinessActionSheetText {
  const proceeds = formatCashChange(action.sale.proceedsCents);
  return {
    title: `Sell ${action.business.name}`,
    lines: [
      { label: 'Cash change', value: proceeds },
      { label: 'Income', value: `-${formatRatePerMinute(action.netPerMinuteCents, 'full')} net` },
      { label: 'You will no longer own', value: action.business.name },
    ],
    confirmLabel: `Confirm sale · ${proceeds}`,
  };
}

export function businessActionSheetText(action: BusinessAction): BusinessActionSheetText {
  if (action.kind === 'manager') return managerText(action.manager);
  if (action.kind === 'sell') return saleText(action);
  return upgradeText(action.upgrade);
}
