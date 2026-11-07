import type { Content } from '@/content';
import { businessEconomy, propertyEconomy } from '@/application/economy';
import {
  levelZeroBusiness,
  managerPriceCents,
  quoteBusinessIncome,
  quoteBusinessUpgrade,
  UPGRADE_TRACKS,
  type BusinessPricing,
} from '@/domain/businessQuotes';
import { findOwnedBusiness } from '@/domain/businesses';
import type { GameCommand } from '@/domain/commands';
import type { GameState, OwnedBusiness, OwnedProperty } from '@/domain/gameState';
import { moneyCents, type MoneyCents } from '@/domain/money';
import { findOwnedProperty } from '@/domain/properties';
import {
  levelZeroProperty,
  PROPERTY_TRACKS,
  quotePropertyIncome,
  quotePropertyUpgrade,
  type PropertyPricing,
} from '@/domain/propertyQuotes';
import { quoteWalletUpgrade } from '@/domain/wallet';

export type OptionKind =
  | 'wallet upgrade'
  | 'business purchase'
  | `business ${(typeof UPGRADE_TRACKS)[number]}`
  | 'manager'
  | 'property purchase'
  | `property ${(typeof PROPERTY_TRACKS)[number]}`;

export type PurchaseOption = {
  readonly kind: OptionKind;
  readonly assetId: string;
  readonly priceCents: MoneyCents;
  readonly benefitPerMinuteCents: MoneyCents;
  readonly commands: readonly GameCommand[];
};

export type OptionContext = {
  readonly state: GameState;
  readonly content: Content;
  readonly tapsPerMinute: number;
};

function walletOptions({ state, content, tapsPerMinute }: OptionContext): PurchaseOption[] {
  const quote = quoteWalletUpgrade(state.tap.walletLevel, content.economy.tap);
  if (quote.status === 'max') return [];
  const perTap = quote.nextPayoutCents - quote.payoutCents;
  return [
    {
      kind: 'wallet upgrade',
      assetId: 'wallet',
      priceCents: quote.priceCents,
      benefitPerMinuteCents: moneyCents(perTap * BigInt(tapsPerMinute)),
      commands: [{ type: 'UpgradeWallet', fromLevel: quote.level }],
    },
  ];
}

function businessUpgrades(owned: OwnedBusiness, pricing: BusinessPricing): PurchaseOption[] {
  const businessId = owned.definitionId;
  const tracks = UPGRADE_TRACKS.map((track) => quoteBusinessUpgrade(owned, { ...pricing, track }))
    .filter((quote) => quote.status === 'available')
    .map((quote) => ({
      kind: `business ${quote.track}` as const,
      assetId: businessId,
      priceCents: quote.priceCents,
      benefitPerMinuteCents: quote.benefitPerMinuteCents,
      commands: [
        { type: 'UpgradeBusiness', businessId, track: quote.track, fromLevel: quote.level },
      ] as const,
    }));
  if (owned.managerOwned) return tracks;
  const now = quoteBusinessIncome(owned, pricing).netPerMinuteCents;
  const managed = quoteBusinessIncome({ ...owned, managerOwned: true }, pricing).netPerMinuteCents;
  const manager: PurchaseOption = {
    kind: 'manager',
    assetId: businessId,
    priceCents: managerPriceCents(pricing),
    benefitPerMinuteCents: moneyCents(managed - now),
    commands: [{ type: 'HireManager', businessId }],
  };
  return [...tracks, manager];
}

function businessOptions({ state, content }: OptionContext): PurchaseOption[] {
  const { catalog, rules } = businessEconomy(content);
  return catalog.flatMap((definition) => {
    const pricing = { definition, rules };
    const owned = findOwnedBusiness(state, definition.id);
    if (owned !== undefined) return businessUpgrades(owned, pricing);
    if (!state.unlockedTiers.includes(definition.tier)) return [];
    const income = quoteBusinessIncome(levelZeroBusiness(definition.id), pricing);
    return [
      {
        kind: 'business purchase' as const,
        assetId: definition.id,
        priceCents: definition.price,
        benefitPerMinuteCents: income.netPerMinuteCents,
        commands: [{ type: 'BuyBusiness', businessId: definition.id }] as const,
      },
    ];
  });
}

function propertyUpgrades(owned: OwnedProperty, pricing: PropertyPricing): PurchaseOption[] {
  const propertyId = owned.definitionId;
  return PROPERTY_TRACKS.map((track) => quotePropertyUpgrade(owned, { ...pricing, track }))
    .filter((quote) => quote.status === 'available')
    .map((quote) => ({
      kind: `property ${quote.track}` as const,
      assetId: propertyId,
      priceCents: quote.priceCents,
      benefitPerMinuteCents: quote.rentedBenefitPerMinuteCents,
      commands: [
        { type: 'UpgradeProperty', propertyId, track: quote.track, fromLevel: quote.level },
      ] as const,
    }));
}

function propertyOptions({ state, content }: OptionContext): PurchaseOption[] {
  const { catalog, rules } = propertyEconomy(content);
  return catalog.flatMap((definition) => {
    const pricing = { definition, rules };
    const owned = findOwnedProperty(state, definition.id);
    if (owned !== undefined) return propertyUpgrades(owned, pricing);
    const rented = { ...levelZeroProperty(definition.id), rented: true };
    return [
      {
        kind: 'property purchase' as const,
        assetId: definition.id,
        priceCents: definition.price,
        benefitPerMinuteCents: quotePropertyIncome(rented, pricing).netPerMinuteCents,
        commands: [
          { type: 'BuyProperty', propertyId: definition.id },
          { type: 'SetRentalStatus', propertyId: definition.id, rented: true },
        ] as const,
      },
    ];
  });
}

export function purchaseOptions(context: OptionContext): readonly PurchaseOption[] {
  return [...walletOptions(context), ...businessOptions(context), ...propertyOptions(context)];
}
