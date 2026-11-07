import type { Content } from '@/content';
import { UPGRADE_TRACKS } from '@/domain/businessQuotes';
import type { GameCommand } from '@/domain/commands';
import { freshGameState, type GameState } from '@/domain/gameState';
import { moneyCents, type MoneyCents } from '@/domain/money';
import { PROPERTY_TRACKS } from '@/domain/propertyQuotes';

import { engineStep } from './engineStep';

export type LoopCheck = {
  readonly asset: 'business' | 'property';
  readonly assetId: string;
  readonly sellPointsTried: number;
  readonly bestNetCents: MoneyCents;
};

const PROBE_CASH_CENTS = moneyCents(10n ** 15n);

type Probe = {
  readonly asset: LoopCheck['asset'];
  readonly assetId: string;
  readonly steps: readonly GameCommand[];
  readonly sell: GameCommand;
};

function cashAfter(
  state: GameState,
  command: GameCommand,
  content: Content,
): GameState | undefined {
  return engineStep(state, { command, content }).state;
}

function runProbe(probe: Probe, content: Content): LoopCheck {
  const start: GameState = {
    ...freshGameState({
      saveId: 'profit-loops',
      economyVersion: content.economyVersion,
      wallMs: 0,
    }),
    cashCents: PROBE_CASH_CENTS,
    unlockedTiers: Object.keys(content.economy.tierUnlocks).map(Number).concat(1),
  };
  const nets: bigint[] = [];
  probe.steps.reduce<GameState>((state, command) => {
    const next = cashAfter(state, command, content);
    if (next === undefined) return state;
    const sold = cashAfter(next, probe.sell, content);
    if (sold !== undefined) nets.push(sold.cashCents - start.cashCents);
    return next;
  }, start);
  const bestNetCents = nets.reduce((best, net) => (net > best ? net : best), 0n - PROBE_CASH_CENTS);
  const { asset, assetId } = probe;
  return { asset, assetId, sellPointsTried: nets.length, bestNetCents: moneyCents(bestNetCents) };
}

const levels = (count: number) => Array.from({ length: count }, (_unused, level) => level);

function businessProbe(businessId: string, content: Content): Probe {
  const upgrades = levels(content.economy.businessRules.maxTrackLevel).flatMap((fromLevel) =>
    UPGRADE_TRACKS.map((track): GameCommand => ({
      type: 'UpgradeBusiness',
      businessId,
      track,
      fromLevel,
    })),
  );
  return {
    asset: 'business',
    assetId: businessId,
    steps: [{ type: 'BuyBusiness', businessId }, { type: 'HireManager', businessId }, ...upgrades],
    sell: { type: 'SellBusiness', businessId },
  };
}

function propertyProbe(propertyId: string, content: Content): Probe {
  const { maxUpgradeLevel, maxExpansionLevel } = content.economy.propertyRules;
  const upgrades = levels(Math.max(maxUpgradeLevel, maxExpansionLevel)).flatMap((fromLevel) =>
    PROPERTY_TRACKS.map((track): GameCommand => ({
      type: 'UpgradeProperty',
      propertyId,
      track,
      fromLevel,
    })),
  );
  return {
    asset: 'property',
    assetId: propertyId,
    steps: [
      { type: 'BuyProperty', propertyId },
      { type: 'SetRentalStatus', propertyId, rented: true },
      ...upgrades,
    ],
    sell: { type: 'SellProperty', propertyId },
  };
}

export function checkProfitLoops(content: Content): readonly LoopCheck[] {
  return [
    ...content.businesses.map((business) => runProbe(businessProbe(business.id, content), content)),
    ...content.properties.map((property) => runProbe(propertyProbe(property.id, content), content)),
  ];
}
