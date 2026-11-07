import {
  formatMoneyCompact,
  formatMoneyExact,
  formatRatePerMinute,
  type MoneyCents,
} from '@/domain/money';

import { useGameSnapshot } from './GameContext';

export type MoneyFormat = {
  readonly money: (value: MoneyCents) => string;
  readonly rate: (value: MoneyCents) => string;
};

export function useMoneyFormat(): MoneyFormat {
  const style = useGameSnapshot().state.settings.numberFormatting;
  return {
    money: style === 'full' ? formatMoneyExact : formatMoneyCompact,
    rate: (value) => formatRatePerMinute(value, style),
  };
}
