import type { OptionContext, PurchaseOption } from './options';
import { purchaseOptions } from './options';

export type PolicyName = 'cheapestNext' | 'bestPayback' | 'saveForNextBusiness';

type Policy = (options: readonly PurchaseOption[]) => PurchaseOption | undefined;

const earning = (options: readonly PurchaseOption[]) =>
  options.filter((option) => option.benefitPerMinuteCents > 0n);

function cheapest(options: readonly PurchaseOption[]): PurchaseOption | undefined {
  return options.reduce<PurchaseOption | undefined>(
    (best, option) => (best === undefined || option.priceCents < best.priceCents ? option : best),
    undefined,
  );
}

const paysBackSooner = (option: PurchaseOption, than: PurchaseOption) =>
  option.priceCents * than.benefitPerMinuteCents < than.priceCents * option.benefitPerMinuteCents;

function quickestPayback(options: readonly PurchaseOption[]): PurchaseOption | undefined {
  return options.reduce<PurchaseOption | undefined>(
    (best, option) => (best === undefined || paysBackSooner(option, best) ? option : best),
    undefined,
  );
}

const POLICIES: Readonly<Record<PolicyName, Policy>> = {
  cheapestNext: (options) => cheapest(earning(options)),
  bestPayback: (options) => quickestPayback(earning(options)),
  saveForNextBusiness: (choices) => {
    const options = earning(choices);
    const nextBusiness = cheapest(options.filter((option) => option.kind === 'business purchase'));
    return nextBusiness ?? quickestPayback(options);
  },
};

export function chooseOption(
  policy: PolicyName,
  context: OptionContext,
): PurchaseOption | undefined {
  const options = purchaseOptions(context);
  const priority = options.find(
    (option) =>
      (option.kind === 'business manager' ||
        option.kind === 'business stage' ||
        essentialCrew(option, context)) &&
      option.cashCents <= context.state.cashCents,
  );
  return priority ?? POLICIES[policy](options);
}

export function paybackMinutes(option: PurchaseOption): number {
  return Number(option.priceCents) / Number(option.benefitPerMinuteCents);
}

function essentialCrew(option: PurchaseOption, context: OptionContext): boolean {
  if (option.kind !== 'business operations') return false;
  const owned = context.state.businesses.find(
    (business) => business.definitionId === option.assetId,
  );
  return (
    owned !== undefined &&
    owned.staff.operations === 0 &&
    (owned.vending.status === 'active' || owned.delivery.status === 'active')
  );
}
