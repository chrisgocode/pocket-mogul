import type { OptionKind, PurchaseOption } from './options';
import { quoteCentralKitchen } from '@/domain/business/bakeryQuotes';
import { quoteDetailing } from '@/domain/business/carWashQuotes';
import { quoteOrderAhead } from '@/domain/business/coffeeKioskQuotes';
import { quoteSecondWindow } from '@/domain/business/foodCartQuotes';
import { quoteAllHours } from '@/domain/business/gymQuotes';
import { quotePickup } from '@/domain/business/laundromatQuotes';
import { quoteSortingHub } from '@/domain/business/deliveryQuotes';
import { STAFF_ROLES, type BusinessPricing } from '@/domain/business/definition';
import type { OwnedBusiness } from '@/domain/business/owned';
import { quoteStaff } from '@/domain/business/staff';
import { quoteStage } from '@/domain/business/stages';
import { quoteCardReaders } from '@/domain/business/vendingQuotes';
import type { GameCommand } from '@/domain/commands';
import { moneyCents, type MoneyCents } from '@/domain/money';

const MS_PER_MINUTE = 60_000n;

export type Improvement = {
  readonly kind: OptionKind;
  readonly priceCents: MoneyCents;
  readonly profitCents: MoneyCents;
  readonly nextProfitCents: MoneyCents;
  readonly command: GameCommand;
};

export function treasuryFunded(
  owned: OwnedBusiness,
  improvement: Improvement & { readonly pricing: BusinessPricing },
): PurchaseOption {
  const businessId = owned.definitionId;
  const shortfall = improvement.priceCents - owned.treasuryCents;
  const cashCents = moneyCents(shortfall > 0n ? shortfall : 0n);
  const deposit: GameCommand[] =
    cashCents > 0n ? [{ type: 'DepositToTreasury', businessId, amountCents: cashCents }] : [];
  return {
    kind: improvement.kind,
    assetId: businessId,
    priceCents: improvement.priceCents,
    cashCents,
    benefitPerMinuteCents: moneyCents(
      ((improvement.nextProfitCents - improvement.profitCents) * MS_PER_MINUTE) /
        BigInt(improvement.pricing.rules.dayMs),
    ),
    commands: [...deposit, improvement.command],
  };
}

export function growthOptions(
  owned: OwnedBusiness,
  context: { pricing: BusinessPricing; atMs: number; management: string },
): PurchaseOption[] {
  const { pricing } = context;
  const businessId = owned.definitionId;
  const staff = STAFF_ROLES.filter((role) => role !== 'manager' || context.management === 'manager')
    .map((role) => quoteStaff(owned, { ...pricing, role }))
    .filter((quote) => quote.status === 'available')
    .map((quote): Improvement => ({
      profitCents: quote.profitCents,
      nextProfitCents: quote.nextProfitCents,
      kind: `business ${quote.role}`,
      priceCents: quote.signingFeeCents,
      command: { type: 'HireStaff', businessId, role: quote.role, fromCount: quote.count },
    }));
  const stage = quoteStage(owned, { pricing, atMs: context.atMs });
  const stages: Improvement[] =
    stage.status !== 'ready'
      ? []
      : [
          {
            kind: 'business stage',
            priceCents: stage.priceCents,
            profitCents: moneyCents(0),
            nextProfitCents: moneyCents(0),
            command: { type: 'UpgradeStage', businessId, fromStage: stage.stage },
          },
        ];
  return [...staff, ...stages, ...signatureOptions(owned, pricing)].map((improvement) =>
    treasuryFunded(owned, { ...improvement, pricing }),
  );
}

function signatureOptions(owned: OwnedBusiness, pricing: BusinessPricing): Improvement[] {
  const businessId = owned.definitionId;
  const quotes = [
    { quote: quoteCardReaders(owned, pricing), type: 'InstallCardReaders' },
    { quote: quoteDetailing(owned, pricing), type: 'InstallDetailing' },
    { quote: quoteSortingHub(owned, pricing), type: 'InstallSortingHub' },
    { quote: quoteSecondWindow(owned, pricing), type: 'InstallSecondWindow' },
    { quote: quoteOrderAhead(owned, pricing), type: 'InstallOrderAhead' },
    { quote: quotePickup(owned, pricing), type: 'InstallPickup' },
    { quote: quoteCentralKitchen(owned, pricing), type: 'InstallCentralKitchen' },
    { quote: quoteAllHours(owned, pricing), type: 'InstallAllHours' },
  ] as const;
  return quotes.flatMap(({ quote, type }) =>
    quote?.status === 'available'
      ? [
          {
            ...quote,
            kind: 'business signature' as const,
            command: { type, businessId },
          },
        ]
      : [],
  );
}
