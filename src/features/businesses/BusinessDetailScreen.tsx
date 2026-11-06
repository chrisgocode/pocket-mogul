import { Stack, useLocalSearchParams } from 'expo-router';

import { selectBusinessDetail, type BusinessDetailView } from '@/application/businessDetailView';
import { getContent } from '@/content';
import { ActionSheet } from '@/features/game/ActionSheet';
import { useGameSnapshot } from '@/features/game/GameContext';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';

import { businessActionSheetText } from './businessAction';
import { OwnedBusinessDetails } from './OwnedBusinessDetails';
import { useBusinessAction } from './useBusinessAction';

function screenTitle(detail: BusinessDetailView): string {
  return detail.status === 'unknown' ? 'Business' : detail.business.name;
}

export function BusinessDetailScreen() {
  const { businessId } = useLocalSearchParams<{ businessId: string }>();
  const detail = selectBusinessDetail(useGameSnapshot(), { businessId, content: getContent() });
  const { confirmation, review, close, confirm } = useBusinessAction();
  return (
    <Screen>
      <Stack.Screen options={{ title: screenTitle(detail) }} />
      {detail.status === 'owned' ? (
        <OwnedBusinessDetails detail={detail} onReview={review} />
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
