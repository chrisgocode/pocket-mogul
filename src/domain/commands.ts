import type { MoneyCents } from './money';

export type TapBatch = { readonly type: 'TapBatch'; readonly taps: number };

export type GameCommand = TapBatch;

export type CommandEnvelope = {
  readonly id: string;
  readonly command: GameCommand;
};

export type GameErrorCode = 'INVALID_QUANTITY' | 'SAVE_FAILED';

export type CommandOutcome =
  | { readonly ok: true; readonly revision: number; readonly earnedCents: MoneyCents }
  | { readonly ok: false; readonly error: GameErrorCode };
