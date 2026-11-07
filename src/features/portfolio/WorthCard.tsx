import type { Worth } from '@/application/portfolioView';
import { formatMoneyExact } from '@/domain/money';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { DetailLine } from '@/ui/DetailLine';
import { useDisclosure } from '@/ui/state/useDisclosure';
import { AppText } from '@/ui/Typography';

const VALUATION_NOTES = [
  'Cash is what you can spend now.',
  'Businesses count at what you paid to buy and upgrade them. Selling pays 60% of that. Managers are an expense and are not counted.',
  'Properties count at their estimated value: the purchase price plus 80% of upgrade spending. Selling pays 95% of it.',
  'Stocks and coins count at what selling would pay before fees.',
  'Pending dividends count once earned, before they are paid at the market hour.',
];

export function WorthCard({ worth }: { worth: Worth }) {
  const { expanded, toggle } = useDisclosure();
  const lines = [
    { label: 'Businesses', cents: worth.businessesCents },
    { label: 'Properties', cents: worth.propertiesCents },
    { label: 'Stocks and coins', cents: worth.positionsCents },
    { label: 'Pending dividends', cents: worth.pendingDividendsCents },
  ];
  return (
    <Card>
      <DetailLine label="Net worth" value={formatMoneyExact(worth.netWorthCents)} emphasis />
      <DetailLine label="Cash" value={formatMoneyExact(worth.cashCents)} />
      <DetailLine label="Owned assets" value={formatMoneyExact(worth.assetsCents)} />
      {expanded ? (
        <>
          {lines.map((line) => (
            <DetailLine key={line.label} label={line.label} value={formatMoneyExact(line.cents)} />
          ))}
          {VALUATION_NOTES.map((note) => (
            <AppText key={note} variant="caption" muted>
              {note}
            </AppText>
          ))}
        </>
      ) : null}
      <Button
        label={expanded ? 'Hide how net worth is valued' : 'How net worth is valued'}
        variant="secondary"
        onPress={toggle}
      />
    </Card>
  );
}
