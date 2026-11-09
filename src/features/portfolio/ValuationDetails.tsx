import type { Worth } from '@/application/portfolioView';
import { formatMoneyExact } from '@/domain/money';
import { DetailLine } from '@/ui/DetailLine';
import { AppText } from '@/ui/Typography';
const VALUATION_NOTES = [
  'Cash is what you can spend now. Net worth subtracts estimated and assessed tax once; paying a booked bill is not a second loss.',
  'Businesses count at what you paid to buy and upgrade them. Selling pays 60% of that. Managers are an expense and are not counted.',
  'Properties count at their estimated value: the purchase price plus 80% of upgrade spending. Selling pays 95% of it.',
  'Stocks and coins count at what selling would pay before fees.',
  'Pending dividends count once earned, before they are paid at the market hour.',
];

export function ValuationDetails({ worth }: { worth: Worth }) {
  const lines = [
    { label: 'Businesses', cents: worth.businessesCents },
    { label: 'Properties', cents: worth.propertiesCents },
    { label: 'Stocks and coins', cents: worth.positionsCents },
    { label: 'Pending dividends', cents: worth.pendingDividendsCents },
  ];
  return (
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
  );
}
