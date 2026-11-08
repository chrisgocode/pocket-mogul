import type { TaxesView } from '@/application/taxesView';
import { Disclosure } from '@/ui/Disclosure';
import { AppText } from '@/ui/Typography';
import { CurrentTaxCard } from './CurrentTaxCard';
export function TaxCurrentSection({ view }: { view: TaxesView }) {
  if (view.status === 'exempt') return <AppText muted>Permanent tax exemption</AppText>;
  if (view.oldest === undefined) return <CurrentTaxCard view={view} />;
  return (
    <Disclosure title="Current estimate">
      <CurrentTaxCard view={view} />
    </Disclosure>
  );
}
