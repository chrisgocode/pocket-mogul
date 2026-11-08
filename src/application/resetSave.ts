import { exemptTaxes } from '@/domain/tax/exemption';
import type { Content } from '@/content';
import { freshGameState, type GameState } from '@/domain/gameState';
import { moneyCents } from '@/domain/money';

import type { Committed } from './commitCommand';
import type { SaveStore } from './ports';

type ResetContext = {
  readonly store: SaveStore;
  readonly content: Content;
  readonly createId: () => string;
};

export async function commitReset(
  context: ResetContext,
  reset: { attemptId: string; current: GameState; wallMs: number },
): Promise<Committed> {
  try {
    return await context.store.transact(async (tx) => {
      const recorded = await tx.findOutcome(reset.attemptId);
      if (recorded !== undefined) return { outcome: recorded };
      const fresh = freshGameState({
        saveId: context.createId(),
        economyVersion: context.content.economyVersion,
        wallMs: reset.wallMs,
      });
      const state = preserveExemption(fresh, reset.current, context.content);
      const outcome = {
        ok: true,
        revision: state.revision,
        cashChangeCents: moneyCents(0n - reset.current.cashCents),
      } as const;
      await tx.writeState(state);
      await tx.clearBackups();
      await tx.clearMarketHistory();
      await tx.clearActivity();
      await tx.writeReceipt({ commandId: reset.attemptId, outcome, recordedWallMs: reset.wallMs });
      return { outcome, state };
    });
  } catch {
    return { outcome: { ok: false, error: 'SAVE_FAILED' } };
  }
}

function preserveExemption(fresh: GameState, previous: GameState, content: Content): GameState {
  if (previous.tax.status !== 'exempt' || content.economy.taxes === undefined) return fresh;
  const transactionId = previous.tax.entitlementIds.at(-1);
  if (transactionId === undefined) return fresh;
  return exemptTaxes(fresh, {
    transactionId,
    dayMs: content.economy.businessRules.dayMs,
    rules: content.economy.taxes,
  });
}
