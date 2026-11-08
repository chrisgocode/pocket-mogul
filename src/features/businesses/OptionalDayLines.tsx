import type { BusinessDayQuote } from '@/domain/business/core';
import { moneyCents } from '@/domain/money';
import { DetailLine } from '@/ui/DetailLine';

import { formatPerDay } from './businessFormat';

export function OptionalDayLines({ day }: { day: BusinessDayQuote }) {
  return (
    <>
      {day.wagesCents > 0n ? (
        <DetailLine label="Wages" value={formatPerDay(moneyCents(0n - day.wagesCents))} />
      ) : null}
      {day.premiumsCents > 0n ? (
        <DetailLine label="Insurance" value={formatPerDay(moneyCents(0n - day.premiumsCents))} />
      ) : null}
      {day.managerBonusCents > 0n ? (
        <DetailLine label="Manager bonus" value={formatPerDay(day.managerBonusCents)} />
      ) : null}
    </>
  );
}
