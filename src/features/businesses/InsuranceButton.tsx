import type { IncidentCategory } from '@/domain/business/definition';
import type { InsuranceQuote } from '@/domain/business/risks';
import { Button } from '@/ui/Button';

import { CATEGORY_NAMES, formatPerDay } from './businessFormat';

type AvailableInsurance = Extract<InsuranceQuote, { status: 'available' }>;

export type InsuranceChange = { readonly category: IncidentCategory; readonly insured: boolean };

export function InsuranceButton({
  insurance,
  onChange,
}: {
  insurance: AvailableInsurance;
  onChange: (change: InsuranceChange) => void;
}) {
  const category = CATEGORY_NAMES[insurance.category].toLowerCase();
  if (insurance.policy === 'active') {
    return (
      <Button
        label="Cancel insurance"
        accessibilityLabel={`Cancel ${category} insurance`}
        variant="secondary"
        onPress={() => onChange({ category: insurance.category, insured: false })}
      />
    );
  }
  const verb = insurance.policy === 'lapsed' ? 'Renew' : 'Insure';
  const label = `${verb} · ${formatPerDay(insurance.premiumCents)}`;
  return (
    <Button
      label={label}
      accessibilityLabel={`${verb} ${category} risks, ${formatPerDay(insurance.premiumCents)}`}
      onPress={() => onChange({ category: insurance.category, insured: true })}
    />
  );
}
