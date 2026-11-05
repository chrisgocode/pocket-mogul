import type { Content } from '@/content';
import { applyBuyBusiness } from '@/domain/businesses';
import type {
  CommandEnvelope,
  CommandOutcome,
  CommandResult,
  GameCommand,
} from '@/domain/commands';
import type { GameState } from '@/domain/gameState';
import { moneyCents } from '@/domain/money';
import { advanceTime } from '@/domain/passiveIncome';
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

export type CommandTime = { readonly elapsedMs: number; readonly wallMs: number };

function applyCommand(state: GameState, command: GameCommand, content: Content): CommandResult {
  const rules = content.economy.tap;
  switch (command.type) {
    case 'UpgradeWallet':
      return applyWalletUpgrade(state, { fromLevel: command.fromLevel, rules });
    case 'BuyBusiness':
      return applyBuyBusiness(state, {
        businessId: command.businessId,
        catalog: content.businesses,
      });
    case 'AdvanceTime':
      return { ok: true, state, cashChangeCents: moneyCents(0) };
    case 'TapBatch':
      break;
  }
  const paid = applyTapBatch(state, { taps: command.taps, rules });
  return { ok: true, state: paid.state, cashChangeCents: paid.earnedCents };
}

function apply(
  state: GameState,
  change: { envelope: CommandEnvelope; time: CommandTime; content: Content },
): Committed {
  const command = validCommand(change.envelope.command);
  if (command === undefined) return { outcome: { ok: false, error: 'INVALID_QUANTITY' } };
  const advanced = advanceTime(state, { ...change.time, catalog: change.content.businesses });
  const result = applyCommand(advanced.state, command, change.content);
  if (!result.ok) return { outcome: result };
  const cashChangeCents = moneyCents(advanced.earnedCents + result.cashChangeCents);
  const next = { ...result.state, revision: state.revision + 1 };
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
