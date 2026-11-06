import type { PropertyListing } from '@/application/propertiesView';
import type { AvailablePropertyUpgrade, PropertySale } from '@/application/propertyDetailView';
import type { Property } from '@/content';
import type { GameCommand } from '@/domain/commands';
import { formatMoneyExact, formatRatePerMinute, moneyCents, type MoneyCents } from '@/domain/money';
import type { ActionSheetText } from '@/features/game/ActionSheet';
import { formatCashChange, formatRateChange, formatValueChange } from '@/features/game/priceFormat';
import type { ConfirmationLine } from '@/ui/ConfirmationDetails';

import { TRACK_NAMES } from './propertyFormat';

export type PropertyAction =
  | { readonly kind: 'buy'; readonly listing: PropertyListing }
  | {
      readonly kind: 'rent';
      readonly property: Property;
      readonly rented: boolean;
      readonly netPerMinuteCents: MoneyCents;
    }
  | {
      readonly kind: 'upgrade';
      readonly property: Property;
      readonly upgrade: AvailablePropertyUpgrade;
    }
  | {
      readonly kind: 'sell';
      readonly property: Property;
      readonly sale: PropertySale;
      readonly netPerMinuteCents: MoneyCents;
    };

const spent = (priceCents: MoneyCents) => formatCashChange(moneyCents(0n - priceCents));
const net = (rate: MoneyCents) => `${formatRatePerMinute(rate, 'full')} net`;

export function propertyActionCommand(action: PropertyAction): GameCommand {
  if (action.kind === 'buy') return { type: 'BuyProperty', propertyId: action.listing.property.id };
  const propertyId = action.property.id;
  if (action.kind === 'rent') return { type: 'SetRentalStatus', propertyId, rented: action.rented };
  if (action.kind === 'sell') return { type: 'SellProperty', propertyId };
  const { track, level } = action.upgrade;
  return { type: 'UpgradeProperty', propertyId, track, fromLevel: level };
}

function buyText(listing: PropertyListing): ActionSheetText {
  const { property } = listing;
  return {
    title: `Buy ${property.name}`,
    lines: [
      { label: 'Cash change', value: spent(property.price) },
      { label: 'Starts', value: `Vacant, rents for ${net(listing.rentedNetPerMinuteCents)}` },
      { label: 'You will own', value: property.name },
    ],
    confirmLabel: `Confirm purchase · ${formatMoneyExact(property.price)}`,
  };
}

function rentText(action: Extract<PropertyAction, { kind: 'rent' }>): ActionSheetText {
  const verb = action.rented ? 'Rent out' : 'Unrent';
  const sign = action.rented ? '+' : '-';
  return {
    title: `${verb} ${action.property.name}`,
    lines: [
      { label: 'Cash change', value: formatMoneyExact(moneyCents(0)) },
      { label: 'Income', value: `${sign}${net(action.netPerMinuteCents)}` },
      {
        label: action.rented ? 'Tenants' : 'Upkeep',
        value: action.rented ? 'Move in now' : 'Stops while vacant',
      },
    ],
    confirmLabel: `Confirm · ${verb}`,
  };
}

function upgradeLines(upgrade: AvailablePropertyUpgrade): ConfirmationLine[] {
  const track = TRACK_NAMES[upgrade.track];
  return [
    { label: 'Cash change', value: spent(upgrade.priceCents) },
    { label: 'Rent', value: formatRateChange(upgrade.rentCents, upgrade.nextRentCents) },
    { label: 'Upkeep', value: formatRateChange(upgrade.upkeepCents, upgrade.nextUpkeepCents) },
    ...(upgrade.rented
      ? [
          {
            label: 'Net income',
            value: formatRateChange(upgrade.netPerMinuteCents, upgrade.nextNetPerMinuteCents),
          },
        ]
      : []),
    {
      label: 'Estimated value',
      value: formatValueChange(upgrade.valueCents, upgrade.nextValueCents),
    },
    { label: `${track} level`, value: `${upgrade.level} → ${upgrade.level + 1}` },
  ];
}

function saleText(action: Extract<PropertyAction, { kind: 'sell' }>): ActionSheetText {
  const proceeds = formatCashChange(action.sale.proceedsCents);
  return {
    title: `Sell ${action.property.name}`,
    lines: [
      { label: 'Cash change', value: proceeds },
      { label: 'Income', value: `-${net(action.netPerMinuteCents)}` },
      { label: 'You will no longer own', value: action.property.name },
    ],
    confirmLabel: `Confirm sale · ${proceeds}`,
  };
}

export function propertyActionSheetText(action: PropertyAction): ActionSheetText {
  if (action.kind === 'buy') return buyText(action.listing);
  if (action.kind === 'rent') return rentText(action);
  if (action.kind === 'sell') return saleText(action);
  return {
    title: `Upgrade ${TRACK_NAMES[action.upgrade.track]}`,
    lines: upgradeLines(action.upgrade),
    confirmLabel: `Confirm upgrade · ${formatMoneyExact(action.upgrade.priceCents)}`,
  };
}
