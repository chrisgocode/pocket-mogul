import type { TradeTicket } from '@/application/tradeTicket';
import type { GameErrorCode } from '@/domain/commands';
import { formatMoneyExact, formatPrice, formatQuantity, type MoneyCents } from '@/domain/money';
import type { TradeQuote, TradeSide } from '@/domain/trading';
import { formatCashChange } from '@/features/game/priceFormat';
import type { ConfirmationLine } from '@/ui/ConfirmationDetails';

const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const TWO_DIGITS = 2;

const VERBS: Record<TradeSide, string> = { buy: 'Buy', sell: 'Sell' };

export function sideVerb(side: TradeSide): string {
  return VERBS[side];
}

const padded = (value: number) => String(value).padStart(TWO_DIGITS, '0');

export function marketClockText(tick: number): string {
  const minutesPerDay = MINUTES_PER_HOUR * HOURS_PER_DAY;
  const day = Math.floor(tick / minutesPerDay) + 1;
  const hour = Math.floor((tick % minutesPerDay) / MINUTES_PER_HOUR);
  return `Day ${day}, ${padded(hour)}:${padded(tick % MINUTES_PER_HOUR)} market time`;
}

export function quoteLines(quote: TradeQuote, tick: number): ConfirmationLine[] {
  return [
    { label: 'Quantity', value: `${formatQuantity(quote.quantity)} shares` },
    { label: 'Price', value: formatPrice(quote.price) },
    { label: 'Notional', value: formatMoneyExact(quote.notionalCents) },
    { label: 'Trading fee', value: formatMoneyExact(quote.feeCents) },
    { label: 'Cash change', value: formatCashChange(quote.cashChangeCents) },
    { label: 'Quote time', value: marketClockText(tick) },
  ];
}

export function confirmLabel(quote: TradeQuote): string {
  return `Confirm ${quote.side} · ${formatCashChange(quote.cashChangeCents)}`;
}

function refusalText(error: GameErrorCode, minimum: MoneyCents): string {
  if (error === 'BELOW_MINIMUM') {
    return `Trades start at ${formatMoneyExact(minimum)}. Selling your whole position is always allowed.`;
  }
  if (error === 'INSUFFICIENT_CASH') return "You don't have enough cash for this, fee included.";
  if (error === 'INSUFFICIENT_HOLDING') return "You don't own that many shares.";
  return 'Enter a positive amount with up to 6 decimal places.';
}

export function ticketProblem(ticket: TradeTicket, minimum: MoneyCents): string | undefined {
  if (ticket.status === 'refused' || ticket.status === 'invalid') {
    return refusalText(ticket.error, minimum);
  }
  return undefined;
}
