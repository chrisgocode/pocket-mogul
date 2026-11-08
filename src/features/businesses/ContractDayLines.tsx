import type { BusinessDayQuote } from '@/domain/business/core';
import { moneyCents } from '@/domain/money';
import { DetailLine } from '@/ui/DetailLine';

import { formatPerDay } from './businessFormat';

export function ContractDayLines({ day }: { day: BusinessDayQuote }) {
  return (
    <>
      {day.contractRevenueCents > 0n ? (
        <DetailLine label="Contracts" value={formatPerDay(day.contractRevenueCents)} />
      ) : null}
      {day.penaltiesCents > 0n ? (
        <DetailLine label="Penalties" value={formatPerDay(moneyCents(0n - day.penaltiesCents))} />
      ) : null}
    </>
  );
}
