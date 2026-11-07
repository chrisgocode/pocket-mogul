import type { Content } from '@/content';
import { applyEnvelope, type Committed } from '@/application/commitCommand';
import type { GameCommand } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';

export type EngineStep = {
  readonly command: GameCommand;
  readonly content: Content;
  readonly elapsedMs?: number;
  readonly wallMs?: number;
};

export function engineStep(state: GameState, step: EngineStep): Committed {
  const elapsedMs = step.elapsedMs ?? 0;
  return applyEnvelope(state, {
    envelope: { id: 'balance', command: step.command },
    time: {
      elapsedMs,
      boostElapsedMs: elapsedMs,
      wallMs: step.wallMs ?? state.clock.lastWallCheckpointMs + elapsedMs,
    },
    economies: { content: step.content },
  });
}
