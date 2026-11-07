import { Stack, useLocalSearchParams } from 'expo-router';

import { selectBusinessDetail, type BusinessDetailView } from '@/application/businessDetailView';
import { getContent } from '@/content';
import { ActionSheet } from '@/features/game/ActionSheet';
import { useGameSnapshot } from '@/features/game/GameContext';
import { useGameAction } from '@/features/game/useGameAction';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';

import {
  businessActionCommand,
  businessActionSheetText,
  type BusinessAction,
} from './businessAction';
import { OwnedBusinessDetails } from './OwnedBusinessDetails';
import type { TreasuryActions } from './treasuryActions';
import { useBusinessCommand } from './useBusinessCommand';

function screenTitle(detail: BusinessDetailView): string {
  return detail.status === 'unknown' ? 'Business' : detail.business.name;
}

function treasuryActions(
  detail: Extract<BusinessDetailView, { status: 'owned' }>,
  handlers: {
    run: ReturnType<typeof useBusinessCommand>;
    review: (action: BusinessAction) => void;
  },
): TreasuryActions {
  const businessId = detail.business.id;
  return {
    setPayout: (payoutPercent) => handlers.run({ type: 'SetPayout', businessId, payoutPercent }),
    deposit: (amountCents) => handlers.run({ type: 'DepositToTreasury', businessId, amountCents }),
    withdrawAll: (amountCents) =>
      handlers.review({ kind: 'withdraw', business: detail.business, amountCents }),
  };
}

export function BusinessDetailScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  const detail = selectBusinessDetail(useGameSnapshot(), { businessId, content: getContent() });
  const { confirmation, review, close, confirm } = useGameAction(businessActionCommand);
  const run = useBusinessCommand();
  return (
    <Screen>
      <Stack.Screen options={{ title: screenTitle(detail) }} />
      {detail.status === 'owned' ? (
        <OwnedBusinessDetails
          detail={detail}
          onReview={review}
          onPriceLevel={(priceLevel) => run({ type: 'SetPriceLevel', businessId, priceLevel })}
          onInsurance={(change) => run({ type: 'SetInsurance', businessId, ...change })}
          treasury={treasuryActions(detail, { run, review })}
        />
      ) : null}
      {detail.status === 'not_owned' ? (
        <EmptyState
          title={`You don't own ${detail.business.name}`}
          message="Buy it from the Businesses list to start earning again."
        />
      ) : null}
      {detail.status === 'unknown' ? (
        <EmptyState
          title="Business not found"
          message="Pick a business from the Businesses list."
        />
      ) : null}
      <ActionSheet
        confirmation={confirmation}
        describe={businessActionSheetText}
        onConfirm={() => void confirm()}
        onCancel={close}
      />
    </Screen>
  );
}
