import { getContent } from '@/content';
import { passiveProfitAfterTaxCents } from '@/application/taxForecast';
import { useGameSnapshot } from '@/features/game/GameContext';
import { formatMoneyExact, formatRatePerMinute } from '@/domain/money';
import { taxLiabilityCents } from '@/domain/tax/assessment';
import { AppText } from '@/ui/Typography';

const BPS_PER_PERCENT = 100;

export function TaxIncomeNote() {
  const state = useGameSnapshot().state;
  const { tax } = state;
  if (tax.status === 'notStarted')
    return (
      <AppText muted>
        Taps are tax-exempt. Income taxes start prospectively at the next Business day.
      </AppText>
    );
  if (tax.status === 'exempt') return <AppText muted>Permanent tax exemption active.</AppText>;
  return (
    <AppText
      muted
    >{`Cash income is before manual tax collection. Owned operating profit after tax ${formatRatePerMinute(passiveProfitAfterTaxCents(state, getContent()), 'full')} (forecast). Current profit-tax rate ${tax.rateBps / BPS_PER_PERCENT}%. Estimated and assessed liability ${formatMoneyExact(taxLiabilityCents(tax))}.`}</AppText>
  );
}
