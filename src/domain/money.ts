/**
 * Exact money and quantity units (spec §12).
 *
 * Three distinct BigInt units, kept apart by brand so they can't be mixed:
 * - MoneyCents: cash and transaction totals, in whole cents.
 * - PriceMicros: quote prices, in millionths of a dollar.
 * - QuantityMicrounits: share or coin quantities, in millionths of a unit.
 *
 * Values are serialized as base-ten strings (JSON.stringify throws on BigInt)
 * and formatted from their digit strings, never through floating point.
 */

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type MoneyCents = Brand<bigint, 'MoneyCents'>;
export type PriceMicros = Brand<bigint, 'PriceMicros'>;
export type QuantityMicrounits = Brand<bigint, 'QuantityMicrounits'>;

export const CENTS_PER_DOLLAR = 100n;
export const MICROS_PER_DOLLAR = 1_000_000n;
export const MICROUNITS_PER_UNIT = 1_000_000n;

const INTEGER_STRING = /^-?\d+$/;

function toBigInt(value: bigint | number, unit: string): bigint {
  if (typeof value === 'bigint') return value;
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${unit} must be a safe integer, got ${value}`);
  }
  return BigInt(value);
}

export const moneyCents = (value: bigint | number): MoneyCents =>
  toBigInt(value, 'MoneyCents') as MoneyCents;
export const priceMicros = (value: bigint | number): PriceMicros =>
  toBigInt(value, 'PriceMicros') as PriceMicros;
export const quantityMicrounits = (value: bigint | number): QuantityMicrounits =>
  toBigInt(value, 'QuantityMicrounits') as QuantityMicrounits;

// ---------------------------------------------------------------------------
// Serialization: base-ten integer strings in the smallest unit.

export function serializeUnits(value: MoneyCents | PriceMicros | QuantityMicrounits): string {
  return value.toString(10);
}

function parseIntegerString(text: string, unit: string): bigint {
  if (!INTEGER_STRING.test(text)) {
    throw new SyntaxError(`Invalid ${unit} string: ${JSON.stringify(text)}`);
  }
  return BigInt(text);
}

export const parseMoneyCents = (text: string): MoneyCents =>
  parseIntegerString(text, 'MoneyCents') as MoneyCents;
export const parsePriceMicros = (text: string): PriceMicros =>
  parseIntegerString(text, 'PriceMicros') as PriceMicros;
export const parseQuantityMicrounits = (text: string): QuantityMicrounits =>
  parseIntegerString(text, 'QuantityMicrounits') as QuantityMicrounits;

// ---------------------------------------------------------------------------
// Decimal literals, for content and tests: "1,250", "0.65", "-3.5".
// Rejects values that need more precision than the unit holds.

const DECIMAL_STRING = /^(-)?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?$/;

function parseDecimal(text: string, scaleDigits: number, unit: string): bigint {
  const match = DECIMAL_STRING.exec(text.trim());
  if (!match) throw new SyntaxError(`Invalid ${unit} amount: ${JSON.stringify(text)}`);
  const [, sign, whole = '0', fraction = ''] = match;
  const significant = fraction.replace(/0+$/, '');
  if (significant.length > scaleDigits) {
    throw new RangeError(`${unit} allows at most ${scaleDigits} decimal places: ${text}`);
  }
  const digits = whole.replace(/,/g, '') + fraction.padEnd(scaleDigits, '0').slice(0, scaleDigits);
  const magnitude = BigInt(digits);
  return sign === '-' ? -magnitude : magnitude;
}

/** "$" amount in dollars → MoneyCents. `usd('1,250')` is 125000n. */
export const usd = (dollars: string): MoneyCents =>
  parseDecimal(dollars, 2, 'MoneyCents') as MoneyCents;
/** Dollar price → PriceMicros. `usdPrice('0.101')` is 101000n. */
export const usdPrice = (dollars: string): PriceMicros =>
  parseDecimal(dollars, 6, 'PriceMicros') as PriceMicros;
/** Unit count → QuantityMicrounits. `units('1.5')` is 1500000n. */
export const units = (count: string): QuantityMicrounits =>
  parseDecimal(count, 6, 'QuantityMicrounits') as QuantityMicrounits;

// ---------------------------------------------------------------------------
// Integer helpers.

/** Ceiling division for non-negative numerator and positive denominator. */
export function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new RangeError('denominator must be positive');
  if (numerator < 0n) throw new RangeError('numerator must be non-negative');
  return (numerator + denominator - 1n) / denominator;
}

// ---------------------------------------------------------------------------
// Formatting.

export type NumberFormatting = 'compact' | 'full';

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Splits |value| into whole and fraction digit strings at `scaleDigits`. */
function splitScaled(
  value: bigint,
  scaleDigits: number,
): { negative: boolean; whole: string; fraction: string } {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString(10).padStart(scaleDigits + 1, '0');
  return {
    negative,
    whole: digits.slice(0, digits.length - scaleDigits),
    fraction: digits.slice(digits.length - scaleDigits),
  };
}

/** Exact cash: "$1,234.56", "-$0.05". Used in details and confirmations. */
export function formatMoneyExact(value: MoneyCents): string {
  const { negative, whole, fraction } = splitScaled(value, 2);
  return `${negative ? '-' : ''}$${groupThousands(whole)}.${fraction}`;
}

const COMPACT_SUFFIXES = [
  '',
  'K',
  'M',
  'B',
  'T',
  'Qa',
  'Qi',
  'Sx',
  'Sp',
  'Oc',
  'No',
  'Dc',
] as const;

/**
 * Compact cash for summaries: "$999.99", "$1.23K", "$4.80M", "$1.50B".
 * Rounds toward zero so a summary never shows more money than exists.
 * Past the named suffixes it falls back to scientific notation ("$1.23e36").
 */
export function formatMoneyCompact(value: MoneyCents): string {
  const negative = value < 0n;
  const cents: bigint = negative ? 0n - value : value;
  const sign = negative ? '-' : '';
  const wholeDollars = cents / CENTS_PER_DOLLAR;
  if (wholeDollars < 1000n) return sign + formatMoneyExact(cents as MoneyCents);

  const digits = wholeDollars.toString(10);
  const group = Math.floor((digits.length - 1) / 3);
  const leadLength = digits.length - group * 3;
  const lead = digits.slice(0, leadLength);
  const decimals = digits.slice(leadLength, leadLength + 2);
  const suffix = COMPACT_SUFFIXES[group];
  if (suffix !== undefined) return `${sign}$${lead}.${decimals}${suffix}`;

  const mantissa = `${digits[0]}.${digits.slice(1, 3)}`;
  return `${sign}$${mantissa}e${digits.length - 1}`;
}

/** Cash in the player's chosen style. */
export function formatMoney(value: MoneyCents, style: NumberFormatting = 'compact'): string {
  return style === 'full' ? formatMoneyExact(value) : formatMoneyCompact(value);
}

/**
 * Quote price with the needed precision, two to six decimals:
 * "$10.00", "$0.101", "$0.000001".
 */
export function formatPrice(value: PriceMicros): string {
  const { negative, whole, fraction } = splitScaled(value, 6);
  const trimmed = fraction.replace(/0+$/, '').padEnd(2, '0');
  return `${negative ? '-' : ''}$${groupThousands(whole)}.${trimmed}`;
}

/** Quantity with up to six decimals and no trailing zeros: "10", "0.5", "1,234.000001". */
export function formatQuantity(value: QuantityMicrounits): string {
  const { negative, whole, fraction } = splitScaled(value, 6);
  const trimmed = fraction.replace(/0+$/, '');
  return `${negative ? '-' : ''}${groupThousands(whole)}${trimmed ? `.${trimmed}` : ''}`;
}

/** Rate with its unit, as the spec requires on every income rate: "$10.00/min". */
export function formatRatePerMinute(
  value: MoneyCents,
  style: NumberFormatting = 'compact',
): string {
  return `${formatMoney(value, style)}/min`;
}
