import { FLOAT_PERCENTS } from '@/domain/business/listingState';
import { formatMoneyExact, type MoneyCents } from '@/domain/money';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { ChoiceRow } from '@/ui/ChoiceRow';
import { Section } from '@/ui/Section';
import { TextField } from '@/ui/TextField';
import { AppText } from '@/ui/Typography';

type Choice = { selected: string; select: (value: string) => void };
const FLOAT_CHOICES = FLOAT_PERCENTS.map((percent) => ({
  value: String(percent),
  label: `${percent}%`,
}));

type ListingFormProps = {
  float: Choice;
  ticker: Choice;
  proceedsCents: MoneyCents;
  closed: boolean;
  onReview: () => void;
};

export function ListingForm({ float, ticker, proceedsCents, closed, onReview }: ListingFormProps) {
  return (
    <Section title="Go public" note="Raise treasury funds by selling a share of your business.">
      <Card>
        <ChoiceRow
          title="Float"
          note="Choose the share sold to outside shareholders."
          choices={FLOAT_CHOICES}
          selected={float.selected}
          onSelect={float.select}
        />
        <TextField
          label="Ticker (3–5 letters)"
          value={ticker.selected}
          onChangeText={(text) => ticker.select(text.toUpperCase())}
          keyboardType="default"
        />
        <AppText>
          Treasury receives {formatMoneyExact(proceedsCents)}. Outside shareholders receive{' '}
          {float.selected}% of payouts.
        </AppText>
        <Button
          label="Review listing"
          disabled={!/^[A-Z]{3,5}$/.test(ticker.selected) || closed}
          onPress={onReview}
        />
      </Card>
    </Section>
  );
}
