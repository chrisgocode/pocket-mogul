declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type MoneyCents = Brand<bigint, 'MoneyCents'>;
export type PriceMicros = Brand<bigint, 'PriceMicros'>;
export type QuantityMicrounits = Brand<bigint, 'QuantityMicrounits'>;

const CENTS_PER_DOLLAR = 100n;
export const MICROS_PER_DOLLAR = 1_000_000n;

const DECIMAL_RADIX = 10;
const CENT_DIGITS = 2;
const MICRO_DIGITS = 6;
const DIGITS_PER_THOUSANDS_GROUP = 3;
const COMPACT_DECIMAL_DIGITS = 2;

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

export function serializeUnits(value: MoneyCents | PriceMicros | QuantityMicrounits): string {
  return value.toString(DECIMAL_RADIX);
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

export const dollars = (amount: string): MoneyCents =>
  parseDecimal(amount, CENT_DIGITS, 'MoneyCents') as MoneyCents;

export const dollarPrice = (amount: string): PriceMicros =>
  parseDecimal(amount, MICRO_DIGITS, 'PriceMicros') as PriceMicros;

export const units = (count: string): QuantityMicrounits =>
  parseDecimal(count, MICRO_DIGITS, 'QuantityMicrounits') as QuantityMicrounits;

export function divideRoundingUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new RangeError('denominator must be positive');
  if (numerator < 0n) throw new RangeError('numerator must be non-negative');
  return (numerator + denominator - 1n) / denominator;
}

export type NumberFormatting = 'compact' | 'full';

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function splitIntoWholeAndFraction(
  value: bigint,
  scaleDigits: number,
): { negative: boolean; whole: string; fraction: string } {
  const negative = value < 0n;
  const digits = (negative ? -value : value).toString(DECIMAL_RADIX).padStart(scaleDigits + 1, '0');
  return {
    negative,
    whole: digits.slice(0, digits.length - scaleDigits),
    fraction: digits.slice(digits.length - scaleDigits),
  };
}

export function formatMoneyExact(value: MoneyCents): string {
  const { negative, whole, fraction } = splitIntoWholeAndFraction(value, CENT_DIGITS);
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

export function formatMoneyCompact(value: MoneyCents): string {
  const negative = value < 0n;
  const cents: bigint = negative ? 0n - value : value;
  const sign = negative ? '-' : '';
  const wholeDollars = cents / CENTS_PER_DOLLAR;
  if (wholeDollars < 1000n) return sign + formatMoneyExact(cents as MoneyCents);

  const digits = wholeDollars.toString(DECIMAL_RADIX);
  const group = Math.floor((digits.length - 1) / DIGITS_PER_THOUSANDS_GROUP);
  const leadLength = digits.length - group * DIGITS_PER_THOUSANDS_GROUP;
  const lead = digits.slice(0, leadLength);
  const decimals = digits.slice(leadLength, leadLength + COMPACT_DECIMAL_DIGITS);
  const suffix = COMPACT_SUFFIXES[group];
  if (suffix !== undefined) return `${sign}$${lead}.${decimals}${suffix}`;

  const mantissa = `${digits[0]}.${digits.slice(1, 1 + COMPACT_DECIMAL_DIGITS)}`;
  return `${sign}$${mantissa}e${digits.length - 1}`;
}

function formatMoney(value: MoneyCents, style: NumberFormatting = 'compact'): string {
  return style === 'full' ? formatMoneyExact(value) : formatMoneyCompact(value);
}

export function formatPrice(value: PriceMicros): string {
  const { negative, whole, fraction } = splitIntoWholeAndFraction(value, MICRO_DIGITS);
  const trimmed = fraction.replace(/0+$/, '').padEnd(CENT_DIGITS, '0');
  return `${negative ? '-' : ''}$${groupThousands(whole)}.${trimmed}`;
}

const MICROS_PER_CENT = MICROS_PER_DOLLAR / CENTS_PER_DOLLAR;

export function formatPriceCompact(value: PriceMicros): string {
  if (value < MICROS_PER_DOLLAR) return formatPrice(value);
  const cents = (value * 2n + MICROS_PER_CENT) / (MICROS_PER_CENT * 2n);
  return formatMoneyExact(moneyCents(cents));
}

export function formatQuantity(value: QuantityMicrounits): string {
  const { negative, whole, fraction } = splitIntoWholeAndFraction(value, MICRO_DIGITS);
  const trimmed = fraction.replace(/0+$/, '');
  return `${negative ? '-' : ''}${groupThousands(whole)}${trimmed ? `.${trimmed}` : ''}`;
}

export function formatRatePerMinute(
  value: MoneyCents,
  style: NumberFormatting = 'compact',
): string {
  return `${formatMoney(value, style)}/min`;
}
