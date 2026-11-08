import { taxLineTotals, type TaxesView } from '@/application/taxesView';
import { formatMoneyExact } from '@/domain/money';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { DetailLine } from '@/ui/DetailLine';
import { AppText } from '@/ui/Typography';
import { Disclosure } from '@/ui/Disclosure';
import { CurrentTaxDetails } from './CurrentTaxDetails';
export function CurrentTaxCard({ view }: { view: TaxesView }) {
  const totals = taxLineTotals(view.lines);
  return (
    <Card>
      <AppText variant="caption" muted>
        {view.status === 'exempt' ? 'Permanent exemption' : 'Estimated tax'}
      </AppText>
      <AppText variant="display">{formatMoneyExact(view.currentCents)}</AppText>
      <DetailLine label="Filing opens in" value={view.nextBoundary} />
      <Button label="Pay & file" disabled onPress={() => undefined} />
      <Button label="Don’t report" variant="secondary" disabled onPress={() => undefined} />
      <Disclosure title="Current return details">
        <DetailLine label="Blended income rate" value={view.ratePercent} />
        <DetailLine
          label="Day-opening net worth"
          value={formatMoneyExact(view.openingWealthCents)}
        />
        <DetailLine label="Taxable profit after losses" value={formatMoneyExact(totals.base)} />
        <CurrentTaxDetails view={view} />
        {view.losses.map((loss) => (
          <DetailLine
            key={loss.source}
            label={`${view.sourceName(loss.source)} losses carried`}
            value={formatMoneyExact(loss.cents)}
          />
        ))}
      </Disclosure>
    </Card>
  );
}
