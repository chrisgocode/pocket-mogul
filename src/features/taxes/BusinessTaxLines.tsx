import { businessTaxForecast } from '@/application/taxForecast';
import { getContent } from '@/content';
import { formatMoneyExact } from '@/domain/money';
import { useGameSnapshot } from '@/features/game/GameContext';
import { DetailLine } from '@/ui/DetailLine';
import { AppText } from '@/ui/Typography';

export function BusinessTaxLines({ businessId }: { businessId: string }) {
  const forecast = businessTaxForecast(useGameSnapshot().state, {
    businessId,
    content: getContent(),
  });
  if (forecast === undefined) return null;
  return (
    <>
      <DetailLine
        label="Your profit share"
        value={`${formatMoneyExact(forecast.ownerProfitCents)}/day`}
      />
      <DetailLine
        label="Your tax forecast before Payout"
        value={`${formatMoneyExact(forecast.taxCents)}/day`}
      />
      <DetailLine
        label="Your profit after tax"
        value={`${formatMoneyExact(forecast.netCents)}/day`}
      />
      <AppText muted>
        Forecast on the quoted operating profit. Restocking and other one-off costs reconcile in
        Taxes. Retaining profit does not exempt it.
      </AppText>
    </>
  );
}
