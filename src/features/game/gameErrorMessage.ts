import type { GameErrorCode } from '@/domain/commands';

const MESSAGES: Record<GameErrorCode, string> = {
  TAX_RETURN_UNAVAILABLE: 'No tax return is ready to file.',
  TAX_ACTION_REQUIRED: 'File your tax return or clear assessed tax debt before investing.',
  INSUFFICIENT_CASH: "You don't have enough cash for this yet. Nothing was spent.",
  INSUFFICIENT_TREASURY: "This business's treasury can't pay for this yet. Nothing was spent.",
  BUSINESS_CLOSED: 'This business is closed. Deposit cash into its treasury to reopen it.',
  AT_CAP: 'This business has reached its cap for now.',
  ALREADY_OWNED: 'You already own this.',
  NOT_OWNED: "You don't own this any more.",
  LOCKED_TIER: 'This tier is still locked. Grow your peak net worth to open it.',
  UNKNOWN_ASSET: "That isn't available to buy.",
  MAX_LEVEL: 'This is already at its max level.',
  UPGRADE_UNAVAILABLE: "This upgrade isn't available here.",
  STAGE_LOCKED: 'This business unlocks that at a later stage.',
  STAGE_NOT_READY: 'This business needs more units or more days owned before it can grow.',
  OFFER_PENDING: 'An offer is already waiting for an answer. Wait for it before making another.',
  OFFER_LOCKED: 'This rival turned down an offer recently. Try again once the lock ends.',
  INVALID_QUANTITY: "That amount isn't valid.",
  INSUFFICIENT_HOLDING: "You don't own that much of it. Nothing was sold.",
  BELOW_MINIMUM: 'This trade is below the minimum trade size.',
  TRADING_LOCKED: 'Trading opens after you buy your first business.',
  STALE_QUOTE: 'The price changed. Check the new amount and try again.',
  BOOST_ACTIVE: 'A Tap Boost is already running.',
  UNKNOWN_GOAL: "That goal isn't available.",
  GOAL_COMPLETED: 'You already reached this goal. Pin one you are still working toward.',
  SAVE_FAILED: "Your game couldn't be saved, so nothing changed. Try again.",
};

export function gameErrorMessage(error: GameErrorCode): string {
  return MESSAGES[error];
}
