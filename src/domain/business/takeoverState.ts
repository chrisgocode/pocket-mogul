import type { MoneyCents } from '@/domain/money';

export type Rival = { readonly id: string; readonly units: number; readonly quality: number };

export type TakeoverRules = {
  readonly fromStage: number;
  readonly acceptFromPercent: number;
  readonly acceptAllPercent: number;
  readonly lockDays: number;
  readonly offerPercents: readonly number[];
};

export type TakeoverOffer =
  | { readonly status: 'none' }
  | { readonly status: 'pending'; readonly rivalId: string; readonly amountCents: MoneyCents };

export type TakeoverLock = { readonly rivalId: string; readonly untilDay: number };

export type Takeovers = {
  readonly offer: TakeoverOffer;
  readonly locks: readonly TakeoverLock[];
  readonly merged: readonly string[];
};

export const NO_OFFER: TakeoverOffer = { status: 'none' };

export const NO_TAKEOVERS: Takeovers = { offer: NO_OFFER, locks: [], merged: [] };
