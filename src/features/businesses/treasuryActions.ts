import type { MoneyCents } from '@/domain/money';

export type TreasuryActions = {
  readonly setPayout: (payoutPercent: number) => void;
  readonly deposit: (amountCents: MoneyCents) => void;
  readonly withdrawAll: (amountCents: MoneyCents) => void;
};
