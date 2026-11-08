import { taxLineTotals, type TaxesView } from '@/application/taxesView';
import { formatMoneyExact, moneyCents } from '@/domain/money';
import { Card } from '@/ui/Card';
import { DetailLine } from '@/ui/DetailLine';
import { AppText } from '@/ui/Typography';

import { CurrentTaxDetails } from './CurrentTaxDetails';

export function CurrentTaxCard({ view }: { view: TaxesView }) {
  const totals = taxLineTotals(view.lines);
  return (
    <Card>
      <AppText variant="title">Current return</AppText>
      <DetailLine label="Blended income rate" value={view.ratePercent} />
      <DetailLine label="Marginal income rate" value={view.marginalRatePercent} />
      <DetailLine label="Day-opening net worth" value={formatMoneyExact(view.openingWealthCents)} />
      <DetailLine label="Next return in credited time" value={view.nextBoundary} />
      <DetailLine label="Gross earnings/proceeds" value={formatMoneyExact(totals.gross)} />
      <DetailLine label="Costs and allocated basis" value={formatMoneyExact(totals.costs)} />
      <DetailLine label="Taxable profit after losses" value={formatMoneyExact(totals.base)} />
      <DetailLine
        label="Estimated honest tax"
        value={formatMoneyExact(view.currentCents)}
        emphasis
      />
      <DetailLine
        label="Net earnings after estimated tax"
        value={formatMoneyExact(moneyCents(totals.gross - totals.costs - totals.tax))}
      />
      <AppText muted>Ordinary tax is paid when you file. No money is withheld or reserved.</AppText>
      <CurrentTaxDetails view={view} />
      {view.losses.map((loss) => (
        <DetailLine
          key={loss.source}
          label={`${view.sourceName(loss.source)} losses carried`}
          value={formatMoneyExact(loss.cents)}
        />
      ))}
    </Card>
  );
}
