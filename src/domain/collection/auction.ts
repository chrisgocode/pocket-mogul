import { drawInt } from '@/domain/marketRandom';

import type { CollectibleDefinition, CollectionDay, CollectionEconomy } from './rules';

type Drawing = CollectionDay & {
  readonly economy: CollectionEconomy;
  readonly maxTier: number;
  readonly redraws: number;
};

type Draw = {
  readonly period: number;
  readonly redraws: number;
  readonly seed: string;
  readonly weightOf: (piece: CollectibleDefinition) => number;
};

const lotStream = (draw: { readonly lot: number; readonly redraws: number }) =>
  draw.redraws === 0 ? `lot_${draw.lot}` : `lot_${draw.lot}_redraw_${draw.redraws}`;

function pickOne(
  remaining: readonly CollectibleDefinition[],
  draw: Draw & { readonly lot: number },
): CollectibleDefinition | undefined {
  const total = remaining.reduce((sum, piece) => sum + draw.weightOf(piece), 0);
  if (total <= 0) return undefined;
  const target = drawInt(
    { seed: draw.seed, tick: draw.period, scope: 'auction', stream: lotStream(draw) },
    [0, total - 1],
  );
  const ends = remaining.map((_, index) =>
    remaining.slice(0, index + 1).reduce((sum, piece) => sum + draw.weightOf(piece), 0),
  );
  return remaining[ends.findIndex((end) => target < end)];
}

function pickLots(
  remaining: readonly CollectibleDefinition[],
  draw: Draw & { readonly lot: number; readonly count: number },
): CollectibleDefinition[] {
  if (draw.lot >= draw.count) return [];
  const picked = pickOne(remaining, draw);
  if (picked === undefined) return [];
  const rest = remaining.filter((piece) => piece !== picked);
  return [picked, ...pickLots(rest, { ...draw, lot: draw.lot + 1 })];
}

export function auctionPeriod(day: number, economy: CollectionEconomy): number {
  return Math.floor(day / economy.rules.lotDays);
}

export function auctionLots(drawing: Drawing): CollectibleDefinition[] {
  const { rules, pieces } = drawing.economy;
  if (rules.lotCount === 0) return [];
  return pickLots(
    pieces.filter((piece) => piece.tier <= drawing.maxTier),
    {
      seed: drawing.seed,
      redraws: drawing.redraws,
      period: auctionPeriod(drawing.day, drawing.economy),
      weightOf: (piece) => rules.rarityWeights[piece.rarity],
      lot: 0,
      count: rules.lotCount,
    },
  );
}

export function lotRedrawsOn(
  redraws: { readonly period: number; readonly count: number },
  today: { readonly day: number; readonly economy: CollectionEconomy },
): number {
  return redraws.period === auctionPeriod(today.day, today.economy) ? redraws.count : 0;
}

export function daysUntilNewLots(day: number, economy: CollectionEconomy): number {
  return economy.rules.lotDays - (day % economy.rules.lotDays);
}
