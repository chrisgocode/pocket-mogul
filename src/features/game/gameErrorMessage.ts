import type { GameErrorCode } from '@/domain/commands';

const MESSAGES: Record<GameErrorCode, string> = {
  INSUFFICIENT_CASH: "You don't have enough cash for this yet. Nothing was spent.",
  MAX_LEVEL: 'This is already at its max level.',
  INVALID_QUANTITY: "That amount isn't valid.",
  STALE_QUOTE: 'The price changed. Check the new amount and try again.',
  SAVE_FAILED: "Your game couldn't be saved, so nothing changed. Try again.",
};

export function gameErrorMessage(error: GameErrorCode): string {
  return MESSAGES[error];
}
