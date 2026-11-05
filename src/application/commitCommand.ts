import type { Content } from '@/content';
import type {
  CommandEnvelope,
  CommandOutcome,
  CommandResult,
  GameCommand,
} from '@/domain/commands';
import type { GameState } from '@/domain/gameState';
import { applyTapBatch } from '@/domain/tapping';
import { applyWalletUpgrade } from '@/domain/wallet';

import { validCommand } from './commandSchema';
import type { Clock, SaveStore, SaveTransaction } from './ports';

export type Committed = { outcome: CommandOutcome; state?: GameState };

type CommitContext = {
  readonly clock: Clock;
  readonly store: SaveStore;
  readonly content: Content;
};

function applyCommand(state: GameState, command: GameCommand, content: Content): CommandResult {
  const rules = content.economy.tap;
  if (command.type === 'UpgradeWallet') {
    return applyWalletUpgrade(state, { fromLevel: command.fromLevel, rules });
  }
  const paid = applyTapBatch(state, { taps: command.taps, rules });
  return { ok: true, state: paid.state, cashChangeCents: paid.earnedCents };
}

function apply(state: GameState, envelope: CommandEnvelope, content: Content): Committed {
  const command = validCommand(envelope.command);
  if (command === undefined) return { outcome: { ok: false, error: 'INVALID_QUANTITY' } };
  const result = applyCommand(state, command, content);
  if (!result.ok) return { outcome: result };
  const next = { ...result.state, revision: state.revision + 1 };
  return {
    outcome: { ok: true, revision: next.revision, cashChangeCents: result.cashChangeCents },
    state: next,
  };
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
  change: { current: GameState; envelope: CommandEnvelope },
): Promise<Committed> {
  try {
    return await context.store.transact(async (tx) => {
      const recorded = await tx.findOutcome(change.envelope.id);
      if (recorded !== undefined) return { outcome: recorded };
      const applied = apply(change.current, change.envelope, context.content);
      await record(tx, { envelope: change.envelope, applied, wallMs: context.clock.wallMs() });
      return applied;
    });
  } catch {
    return { outcome: { ok: false, error: 'SAVE_FAILED' } };
  }
}
