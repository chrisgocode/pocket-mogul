import type { BusinessDetailView } from '@/application/businessDetailView';
import { EmptyState } from '@/ui/EmptyState';

export function MissingBusiness({
  detail,
}: {
  detail: Exclude<BusinessDetailView, { status: 'owned' }>;
}) {
  if (detail.status === 'not_owned')
    return (
      <EmptyState
        title={`You don't own ${detail.business.name}`}
        message="Buy it from the Businesses list to start earning again."
      />
    );
  return (
    <EmptyState title="Business not found" message="Pick a business from the Businesses list." />
  );
}
