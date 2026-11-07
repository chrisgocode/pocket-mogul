import type { ActivityEvent } from './activity';
import type { GameCommand } from './commands';
import type { GameState } from './gameState';
import { moneyCents, type MoneyCents } from './money';

type Change = {
  readonly before: GameState;
  readonly after: GameState;
  readonly cashChangeCents: MoneyCents;
};

type CommandsByType = { [Type in GameCommand['type']]: Extract<GameCommand, { type: Type }> };

type Describers = {
  readonly [Type in keyof CommandsByType]?: (
    command: CommandsByType[Type],
    change: Change,
  ) => ActivityEvent;
};

function realizedOf(state: GameState, assetId: string): bigint {
  return state.positions.find((held) => held.instrumentId === assetId)?.realizedProfitCents ?? 0n;
}

const DESCRIBERS: Describers = {
  UpgradeWallet: (command, { cashChangeCents }) => ({
    kind: 'upgrade',
    target: 'wallet',
    assetId: 'wallet',
    track: 'wallet',
    level: command.fromLevel + 1,
    cashChangeCents,
  }),
  BuyBusiness: (command, { cashChangeCents }) => ({
    kind: 'purchase',
    asset: 'business',
    assetId: command.businessId,
    cashChangeCents,
  }),
  UpgradeBusiness: (command, { cashChangeCents }) => ({
    kind: 'upgrade',
    target: 'business',
    assetId: command.businessId,
    track: command.track,
    level: command.fromLevel + 1,
    cashChangeCents,
  }),
  HireManager: (command, { cashChangeCents }) => ({
    kind: 'upgrade',
    target: 'business',
    assetId: command.businessId,
    track: 'manager',
    level: 1,
    cashChangeCents,
  }),
  SellBusiness: (command, { cashChangeCents }) => ({
    kind: 'sale',
    asset: 'business',
    assetId: command.businessId,
    cashChangeCents,
  }),
  BuyProperty: (command, { cashChangeCents }) => ({
    kind: 'purchase',
    asset: 'property',
    assetId: command.propertyId,
    cashChangeCents,
  }),
  UpgradeProperty: (command, { cashChangeCents }) => ({
    kind: 'upgrade',
    target: 'property',
    assetId: command.propertyId,
    track: command.track,
    level: command.fromLevel + 1,
    cashChangeCents,
  }),
  SetRentalStatus: (command) => ({
    kind: 'rental',
    assetId: command.propertyId,
    rented: command.rented,
  }),
  SellProperty: (command, { cashChangeCents }) => ({
    kind: 'sale',
    asset: 'property',
    assetId: command.propertyId,
    cashChangeCents,
  }),
  ExecuteTrade: (command, { before, after, cashChangeCents }) => ({
    kind: 'trade',
    side: command.side,
    assetId: command.assetId,
    quantity: command.quantity,
    cashChangeCents,
    realizedProfitCents: moneyCents(
      realizedOf(after, command.assetId) - realizedOf(before, command.assetId),
    ),
  }),
};

function describe<Type extends keyof CommandsByType>(
  command: { type: Type; payload: CommandsByType[Type] },
  change: Change,
): ActivityEvent | undefined {
  const describer = DESCRIBERS[command.type];
  return describer?.(command.payload, change);
}

export function commandActivity(command: GameCommand, change: Change): readonly ActivityEvent[] {
  const event = describe({ type: command.type, payload: command }, change);
  return event === undefined ? [] : [event];
}
