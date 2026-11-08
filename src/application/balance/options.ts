import { growthOptions, treasuryFunded, type Improvement } from './growthOptions';
import type { Content } from '@/content';
import { businessEconomy, propertyEconomy } from '@/application/economy';
import { findOwnedBusiness } from '@/domain/business/commands';
import { profitPerDayCents, quoteImprovement, quoteUnit } from '@/domain/business/core';
import { BUSINESS_TRACKS, type BusinessPricing } from '@/domain/business/definition';
import { newBusiness, type OwnedBusiness } from '@/domain/business/owned';
import type { GameCommand } from '@/domain/commands';
import type { GameState, OwnedProperty } from '@/domain/gameState';
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
  | 'business units'
  | 'business operations'
  | 'business sales'
  | 'business manager'
  | 'business stage'
  | 'business signature'
  | `business ${(typeof BUSINESS_TRACKS)[number]}`
  | 'property purchase'
  | `property ${(typeof PROPERTY_TRACKS)[number]}`;

export type PurchaseOption = {
  readonly kind: OptionKind;
  readonly assetId: string;
  readonly priceCents: MoneyCents;
  readonly cashCents: MoneyCents;
  readonly benefitPerMinuteCents: MoneyCents;
  readonly commands: readonly GameCommand[];
};

export type OptionContext = {
  readonly state: GameState;
  readonly content: Content;
  readonly tapsPerMinute: number;
  readonly management?: 'manager' | 'handsOn' | undefined;
};

const MS_PER_MINUTE = 60_000n;

function walletOptions({ state, content, tapsPerMinute }: OptionContext): PurchaseOption[] {
  const quote = quoteWalletUpgrade(state.tap.walletLevel, content.economy.tap);
  if (quote.status === 'max') return [];
  const perTap = quote.nextPayoutCents - quote.payoutCents;
  return [
    {
      kind: 'wallet upgrade',
      assetId: 'wallet',
      priceCents: quote.priceCents,
      cashCents: quote.priceCents,
      benefitPerMinuteCents: moneyCents(perTap * BigInt(tapsPerMinute)),
      commands: [{ type: 'UpgradeWallet', fromLevel: quote.level }],
    },
  ];
}

function perMinute(perDayCents: bigint, pricing: BusinessPricing): MoneyCents {
  return moneyCents((perDayCents * MS_PER_MINUTE) / BigInt(pricing.rules.dayMs));
}

function businessImprovements(owned: OwnedBusiness, pricing: BusinessPricing): PurchaseOption[] {
  const businessId = owned.definitionId;
  const unit = quoteUnit(owned, pricing);
  const units: Improvement[] =
    unit.status === 'at_cap'
      ? []
      : [
          {
            ...unit,
            kind: 'business units',
            command: { type: 'BuyUnit', businessId, fromUnits: unit.units },
          },
        ];
  const tracks = BUSINESS_TRACKS.map((track) => quoteImprovement(owned, { ...pricing, track }))
    .filter((quote) => quote.status === 'available')
    .map((quote): Improvement => ({
      kind: `business ${quote.track}`,
      priceCents: quote.priceCents,
      profitCents: quote.profitCents,
      nextProfitCents: quote.nextProfitCents,
      command: { type: 'UpgradeBusiness', businessId, track: quote.track, fromLevel: quote.level },
    }));
  return [...units, ...tracks].map((improvement) =>
    treasuryFunded(owned, { ...improvement, pricing }),
  );
}

function businessOptions({ state, content, management }: OptionContext): PurchaseOption[] {
  const { catalog, rules } = businessEconomy(content);
  return catalog.flatMap((definition) => {
    const pricing = { definition, rules };
    const owned = findOwnedBusiness(state, definition.id);
    if (owned !== undefined)
      return businessImprovements(owned, pricing).concat(
        management === undefined
          ? []
          : growthOptions(owned, {
              pricing,
              atMs: state.clock.simulationMs,
              management,
            }),
      );
    if (!state.unlockedTiers.includes(definition.tier)) return [];
    const opened = newBusiness(definition, { rules, atMs: state.clock.simulationMs });
    return [
      {
        kind: 'business purchase' as const,
        assetId: definition.id,
        priceCents: definition.price,
        cashCents: definition.price,
        benefitPerMinuteCents: perMinute(profitPerDayCents(opened, pricing), pricing),
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
      cashCents: quote.priceCents,
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
        cashCents: definition.price,
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
