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
import { moneyCents } from '@/domain/money';
import { advanceTime } from '@/domain/passiveIncome';
import { withProgress } from '@/domain/progression';
import { applyTapBatch } from '@/domain/tapping';
import { applyWalletUpgrade } from '@/domain/wallet';

import { businessEconomy } from './businessEconomy';
import { validCommand } from './commandSchema';
import type { Clock, SaveStore, SaveTransaction } from './ports';

export type Committed = { outcome: CommandOutcome; state?: GameState };

type CommitContext = {
  readonly clock: Clock;
  readonly store: SaveStore;
  readonly content: Content;
};

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
  AdvanceTime: (state) => ({ ok: true, state, cashChangeCents: moneyCents(0) }),
};

function applyCommand<Type extends keyof CommandsByType>(
  state: GameState,
  command: { type: Type; payload: CommandsByType[Type] },
  content: Content,
): CommandResult {
  return COMMAND_HANDLERS[command.type](state, command.payload, content);
}

function apply(
  state: GameState,
  change: { envelope: CommandEnvelope; time: CommandTime; content: Content },
): Committed {
  const command = validCommand(change.envelope.command);
  if (command === undefined) return { outcome: { ok: false, error: 'INVALID_QUANTITY' } };
  const { tierUnlocks } = change.content.economy;
  const advanced = advanceTime(state, {
    ...change.time,
    economy: businessEconomy(change.content),
  });
  const progressed = withProgress(advanced.state, tierUnlocks);
  const result = applyCommand(progressed, { type: command.type, payload: command }, change.content);
  if (!result.ok) return { outcome: result };
  const cashChangeCents = moneyCents(advanced.earnedCents + result.cashChangeCents);
  const next = { ...withProgress(result.state, tierUnlocks), revision: state.revision + 1 };
  return { outcome: { ok: true, revision: next.revision, cashChangeCents }, state: next };
}

async function record(
  tx: SaveTransaction,
  change: { envelope: CommandEnvelope; applied: Committed; wallMs: number },
): Promise<void> {
  const { state, outcome } = change.applied;
  if (state === undefined) return;
  await tx.writeState(state);
  await tx.writeReceipt({
    commandId: change.envelope.id,
    outcome,
    recordedWallMs: change.wallMs,
  });
}

export async function commitCommand(
  context: CommitContext,
  change: { current: GameState; envelope: CommandEnvelope; elapsedMs: number },
): Promise<Committed> {
  const wallMs = context.clock.wallMs();
  try {
    return await context.store.transact(async (tx) => {
      const recorded = await tx.findOutcome(change.envelope.id);
      if (recorded !== undefined) return { outcome: recorded };
      const applied = apply(change.current, {
        envelope: change.envelope,
        time: { elapsedMs: change.elapsedMs, wallMs },
        content: context.content,
      });
      await record(tx, { envelope: change.envelope, applied, wallMs });
      return applied;
    });
  } catch {
    return { outcome: { ok: false, error: 'SAVE_FAILED' } };
  }
}
