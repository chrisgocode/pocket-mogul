import type { Content } from '@/content';
import {
  applyBuyBusiness,
  applyHireManager,
  applySellBusiness,
  applyUpgradeBusiness,
} from '@/domain/businesses';
import type {
  CommandEnvelope,
  CommandOutcome,
  CommandResult,
  GameCommand,
} from '@/domain/commands';
import type { GameState } from '@/domain/gameState';
import { moneyCents, type MoneyCents } from '@/domain/money';
import { settleOffline, type WallClockReading } from '@/domain/offline';
import { advanceTime } from '@/domain/passiveIncome';
import { withProgress } from '@/domain/progression';
import {
  applyBuyProperty,
  applySellProperty,
  applySetRentalStatus,
  applyUpgradeProperty,
} from '@/domain/properties';
import { applyTapBatch } from '@/domain/tapping';
import { applyWalletUpgrade } from '@/domain/wallet';

import {
  businessEconomy,
  contentAt,
  passiveEconomy,
  progressRules,
  propertyEconomy,
  type EconomyVersions,
} from './economy';
import { validCommand } from './commandSchema';
import type { SaveStore, SaveTransaction } from './ports';

export type Committed = {
  outcome: CommandOutcome;
  state?: GameState;
  wallClock?: WallClockReading;
};

type CommitContext = EconomyVersions & { readonly store: SaveStore };

export type CommandTime = { readonly elapsedMs: number; readonly wallMs: number };

type CommandsByType = { [Type in GameCommand['type']]: Extract<GameCommand, { type: Type }> };

type CommandHandlers = {
  readonly [Type in keyof CommandsByType]: (
    state: GameState,
    command: CommandsByType[Type],
    content: Content,
  ) => CommandResult;
};

const COMMAND_HANDLERS: CommandHandlers = {
  TapBatch: (state, command, content) => {
    const paid = applyTapBatch(state, { taps: command.taps, rules: content.economy.tap });
    return { ok: true, state: paid.state, cashChangeCents: paid.earnedCents };
  },
  UpgradeWallet: (state, command, content) =>
    applyWalletUpgrade(state, { fromLevel: command.fromLevel, rules: content.economy.tap }),
  BuyBusiness: (state, command, content) =>
    applyBuyBusiness(state, { ...command, economy: businessEconomy(content) }),
  UpgradeBusiness: (state, command, content) =>
    applyUpgradeBusiness(state, { ...command, economy: businessEconomy(content) }),
  HireManager: (state, command, content) =>
    applyHireManager(state, { ...command, economy: businessEconomy(content) }),
  SellBusiness: (state, command, content) =>
    applySellBusiness(state, { ...command, economy: businessEconomy(content) }),
  BuyProperty: (state, command, content) =>
    applyBuyProperty(state, { ...command, economy: propertyEconomy(content) }),
  UpgradeProperty: (state, command, content) =>
    applyUpgradeProperty(state, { ...command, economy: propertyEconomy(content) }),
  SetRentalStatus: (state, command, content) =>
    applySetRentalStatus(state, { ...command, economy: propertyEconomy(content) }),
  SellProperty: (state, command, content) =>
    applySellProperty(state, { ...command, economy: propertyEconomy(content) }),
  AdvanceTime: (state) => ({ ok: true, state, cashChangeCents: moneyCents(0) }),
  SettleOffline: (state) => ({ ok: true, state, cashChangeCents: moneyCents(0) }),
  AcknowledgeReturnSummary: (state) => ({
    ok: true,
    state: { ...state, returnSummary: { status: 'none' } },
    cashChangeCents: moneyCents(0),
  }),
};

type TimeStep = {
  readonly state: GameState;
  readonly earnedCents: MoneyCents;
  readonly wallClock: WallClockReading;
};

function stepTime(
  state: GameState,
  step: { command: GameCommand; time: CommandTime; content: Content },
): TimeStep {
  const economy = passiveEconomy(step.content);
  if (step.command.type === 'SettleOffline') {
    const capMs = step.content.economy.time.offlineCapMs;
    const settled = settleOffline(state, { wallMs: step.time.wallMs, capMs, economy });
    return { ...settled, wallClock: settled.clock };
  }
  const advanced = advanceTime(state, { ...step.time, economy });
  return { ...advanced, wallClock: { direction: 'forward' } };
}

function applyCommand<Type extends keyof CommandsByType>(
  state: GameState,
  command: { type: Type; payload: CommandsByType[Type] },
  content: Content,
): CommandResult {
  return COMMAND_HANDLERS[command.type](state, command.payload, content);
}

function apply(
  state: GameState,
  change: { envelope: CommandEnvelope; time: CommandTime; economies: EconomyVersions },
): Committed {
  const command = validCommand(change.envelope.command);
  if (command === undefined) return { outcome: { ok: false, error: 'INVALID_QUANTITY' } };
  const { content } = change.economies;
  const settling = contentAt(change.economies, state.economyVersion);
  const advanced = stepTime(state, { command, time: change.time, content: settling });
  const progress = progressRules(content);
  const adopted = { ...advanced.state, economyVersion: content.economyVersion };
  const progressed = withProgress(adopted, progress);
  const result = applyCommand(progressed, { type: command.type, payload: command }, content);
  if (!result.ok) return { outcome: result };
  const cashChangeCents = moneyCents(advanced.earnedCents + result.cashChangeCents);
  const next = { ...withProgress(result.state, progress), revision: state.revision + 1 };
  const outcome = { ok: true, revision: next.revision, cashChangeCents } as const;
  return { outcome, state: next, wallClock: advanced.wallClock };
}

async function record(
  tx: SaveTransaction,
  change: { envelope: CommandEnvelope; applied: Committed; wallMs: number },
): Promise<void> {
  const { state, outcome, wallClock } = change.applied;
  if (state === undefined) return;
  await tx.writeState(state);
  if (wallClock?.direction === 'backward') {
    const { direction: _direction, ...reading } = wallClock;
    await tx.writeDiagnostic({
      type: 'BACKWARD_WALL_CLOCK',
      ...reading,
      recordedWallMs: change.wallMs,
    });
  }
  await tx.writeReceipt({
    commandId: change.envelope.id,
    outcome,
    recordedWallMs: change.wallMs,
  });
}

export async function commitCommand(
  context: CommitContext,
  change: { current: GameState; envelope: CommandEnvelope; time: CommandTime },
): Promise<Committed> {
  const { wallMs } = change.time;
  try {
    return await context.store.transact(async (tx) => {
      const recorded = await tx.findOutcome(change.envelope.id);
      if (recorded !== undefined) return { outcome: recorded };
      const applied = apply(change.current, {
        envelope: change.envelope,
        time: change.time,
        economies: context,
      });
      await record(tx, { envelope: change.envelope, applied, wallMs });
      return applied;
    });
  } catch {
    return { outcome: { ok: false, error: 'SAVE_FAILED' } };
  }
}
