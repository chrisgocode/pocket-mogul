import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { formatMoneyExact, moneyCents } from '@/domain/money';
import { DetailLine } from '@/ui/DetailLine';
import { Disclosure } from '@/ui/Disclosure';
import { formatPerDay, stageName } from './businessFormat';
import { ContractDayLines } from './ContractDayLines';
import { OptionalDayLines } from './OptionalDayLines';
export function BusinessDayDetails({ detail }: { detail: OwnedBusinessDetail }) {
  const { day, business } = detail;
  const status = detail.operation === 'open' ? 'Open' : 'Closed';
  return (
    <Disclosure title="Daily figures">
      <DetailLine label="Status" value={`${status} · ${stageName(detail.stage)}`} />
      <DetailLine
        label="Customers per day"
        value={`${day.served} of ${day.demand} served, capacity ${day.capacity}`}
      />
      <DetailLine
        label={`Price per ${business.customerName}`}
        value={formatMoneyExact(day.priceCents)}
      />
      <DetailLine label="Revenue" value={formatPerDay(day.revenueCents)} />
      {day.memberFeesCents > 0n ? (
        <DetailLine label="Memberships" value={formatPerDay(day.memberFeesCents)} />
      ) : null}
      <ContractDayLines day={day} />
      <DetailLine label="Upkeep" value={formatPerDay(moneyCents(0n - day.upkeepCents))} />
      <DetailLine
        label="Customer costs"
        value={formatPerDay(moneyCents(0n - day.customerCostsCents))}
      />
      <OptionalDayLines day={day} />
      <DetailLine label="Profit" value={formatPerDay(day.profitCents)} emphasis />
    </Disclosure>
  );
}
