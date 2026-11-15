import {
  formatMoneyCompact,
  formatMoneyExact,
  formatMoneyShort,
  formatRatePerMinute,
  type MoneyCents,
} from '@/domain/money';

import { useGameSnapshot } from './GameContext';

export type MoneyFormat = {
  readonly money: (value: MoneyCents) => string;
  readonly rate: (value: MoneyCents) => string;
  readonly short: (value: MoneyCents) => string;
  readonly shortRate: (value: MoneyCents) => string;
  readonly shortGain: (value: MoneyCents) => string;
};

function signed(text: string): string {
  return text.startsWith('-') ? text : `+${text}`;
}

export function useMoneyFormat(): MoneyFormat {
  const style = useGameSnapshot().state.settings.numberFormatting;
  const short = style === 'full' ? formatMoneyExact : formatMoneyShort;
  return {
    money: style === 'full' ? formatMoneyExact : formatMoneyCompact,
    rate: (value) => formatRatePerMinute(value, style),
    short,
    shortRate: (value) => `${signed(short(value))}/m`,
    shortGain: (value) => signed(short(value)),
  };
}
