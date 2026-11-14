import type { Content } from '@/content';
import { applyEnvelope, type Committed } from '@/application/commitCommand';
import type { GameCommand } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';

const MS_PER_DAY = 86_400_000;

export type EngineStep = {
  readonly command: GameCommand;
  readonly content: Content;
  readonly elapsedMs?: number;
  readonly wallMs?: number;
};

export function engineStep(state: GameState, step: EngineStep): Committed {
  const elapsedMs = step.elapsedMs ?? 0;
  const wallMs = step.wallMs ?? state.clock.lastWallCheckpointMs + elapsedMs;
  return applyEnvelope(state, {
    envelope: { id: 'balance', command: step.command },
    time: {
      elapsedMs,
      boostElapsedMs: elapsedMs,
      wallMs,
      dayKey: `day-${Math.floor(wallMs / MS_PER_DAY)}`,
    },
    economies: { content: step.content },
  });
}
