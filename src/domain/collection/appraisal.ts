import { drawInt } from '@/domain/marketRandom';
import { moneyCents, type MoneyCents } from '@/domain/money';

import type {
  AgePoint,
  CategoryRules,
  CollectibleDefinition,
  CollectionDay,
  CollectionEconomy,
  OwnedCollectible,
} from './rules';
import { saleReturnPercent } from './sets';

const NO_EFFECT_BPS = 10_000;
const BASIS_POINTS = 10_000n;
const PERCENT = 100n;

function between(from: AgePoint, to: AgePoint, age: number): number {
  const span = to.days - from.days;
  return from.bps + Math.trunc(((to.bps - from.bps) * (age - from.days)) / span);
}

function ageBps(curve: readonly AgePoint[], age: number): number {
  const last = curve[curve.length - 1];
  if (last === undefined) return NO_EFFECT_BPS;
  if (age >= last.days) return last.bps;
  const next = curve.findIndex((point) => point.days > age);
  const from = curve[next - 1];
  const to = curve[next];
  if (from === undefined || to === undefined) return curve[0]?.bps ?? NO_EFFECT_BPS;
  return between(from, to, age);
}

function swingBps(rules: CategoryRules, valuing: CollectionDay & { pieceId: string }): number {
  const epoch = Math.floor(valuing.day / rules.swingDays);
  const drawn = (tick: number) =>
    drawInt({ seed: valuing.seed, tick, scope: valuing.pieceId, stream: 'appraisal' }, [
      0 - rules.swingBps,
      rules.swingBps,
    ]);
  if (rules.swing === 'step') return drawn(epoch);
  const within = valuing.day % rules.swingDays;
  const from = drawn(epoch);
  return from + Math.trunc(((drawn(epoch + 1) - from) * within) / rules.swingDays);
}

type Valuing = CollectionDay & { readonly economy: CollectionEconomy; readonly age: number };

function appraisedCents(piece: CollectibleDefinition, valuing: Valuing): MoneyCents {
  const rules = valuing.economy.rules.categories.find((each) => each.id === piece.category);
  if (rules === undefined) return piece.price;
  const aged = BigInt(ageBps(rules.ageCurve, valuing.age));
  const swung = BigInt(NO_EFFECT_BPS + swingBps(rules, { ...valuing, pieceId: piece.id }));
  return moneyCents((piece.price * aged * swung) / (BASIS_POINTS * BASIS_POINTS));
}

export function listPriceCents(
  piece: CollectibleDefinition,
  valuing: CollectionDay & { readonly economy: CollectionEconomy },
): MoneyCents {
  return appraisedCents(piece, { ...valuing, age: 0 });
}

export function findPiece(
  economy: CollectionEconomy,
  pieceId: string,
): CollectibleDefinition | undefined {
  return economy.pieces.find((piece) => piece.id === pieceId);
}

export function ownedValueCents(
  owned: OwnedCollectible,
  valuing: CollectionDay & { readonly economy: CollectionEconomy },
): MoneyCents {
  const piece = findPiece(valuing.economy, owned.pieceId);
  if (piece === undefined) return moneyCents(0);
  return appraisedCents(piece, { ...valuing, age: valuing.day - owned.acquiredDay });
}

export function collectibleSaleCents(
  owned: OwnedCollectible,
  selling: CollectionDay & {
    readonly economy: CollectionEconomy;
    readonly held: readonly OwnedCollectible[];
  },
): MoneyCents {
  const value = ownedValueCents(owned, selling);
  return moneyCents((value * BigInt(saleReturnPercent(selling.held, selling.economy))) / PERCENT);
}

export function collectionValueCents(
  collectibles: readonly OwnedCollectible[],
  valuing: CollectionDay & { readonly economy: CollectionEconomy },
): MoneyCents {
  return moneyCents(
    collectibles.reduce<bigint>((total, owned) => total + ownedValueCents(owned, valuing), 0n),
  );
}
