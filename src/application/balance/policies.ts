import type { OptionContext, PurchaseOption } from './options';
import { purchaseOptions } from './options';

export type PolicyName = 'cheapestNext' | 'bestPayback' | 'saveForNextBusiness';

type Policy = (context: OptionContext) => PurchaseOption | undefined;

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
  cheapestNext: (context) => cheapest(earning(purchaseOptions(context))),
  bestPayback: (context) => quickestPayback(earning(purchaseOptions(context))),
  saveForNextBusiness: (context) => {
    const options = earning(purchaseOptions(context));
    const nextBusiness = cheapest(options.filter((option) => option.kind === 'business purchase'));
    return nextBusiness ?? quickestPayback(options);
  },
};

export function chooseOption(
  policy: PolicyName,
  context: OptionContext,
): PurchaseOption | undefined {
  return POLICIES[policy](context);
}

export function paybackMinutes(option: PurchaseOption): number {
  return Number(option.priceCents) / Number(option.benefitPerMinuteCents);
}
