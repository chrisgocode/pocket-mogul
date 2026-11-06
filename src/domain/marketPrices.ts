import { priceMicros, type PriceMicros } from './money';

const BASIS_POINTS = 10_000n;
const MIN_PRICE = priceMicros(1);

export function applyReturn(price: PriceMicros, returnBps: number): PriceMicros {
  const scaled = price * (BASIS_POINTS + BigInt(returnBps));
  const rounded = (scaled * 2n + BASIS_POINTS) / (BASIS_POINTS * 2n);
  return rounded < MIN_PRICE ? MIN_PRICE : priceMicros(rounded);
}

export function clampBps(value: number, limit: number): number {
  return Math.min(limit, Math.max(-limit, value));
}

export function anchorPullBps(
  current: PriceMicros,
  anchor: { initialPrice: PriceMicros; pullBps: number; clampBps: number },
): number {
  const difference = anchor.initialPrice - current;
  const pull = Number((BigInt(anchor.pullBps) * difference) / anchor.initialPrice);
  return clampBps(pull, anchor.clampBps);
}

export function changeBps(from: PriceMicros, to: PriceMicros): number {
  return Number(((to - from) * BASIS_POINTS) / from);
}
