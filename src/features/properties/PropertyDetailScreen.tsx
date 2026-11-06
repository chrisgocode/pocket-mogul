import { Stack, useLocalSearchParams } from 'expo-router';

import { selectPropertyDetail, type PropertyDetailView } from '@/application/propertyDetailView';
import { getContent } from '@/content';
import { ActionSheet } from '@/features/game/ActionSheet';
import { useGameSnapshot } from '@/features/game/GameContext';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';

import { OwnedPropertyDetails } from './OwnedPropertyDetails';
import { propertyActionSheetText } from './propertyAction';
import { usePropertyAction } from './usePropertyAction';

function screenTitle(detail: PropertyDetailView): string {
  return detail.status === 'unknown' ? 'Property' : detail.property.name;
}

export function PropertyDetailScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const detail = selectPropertyDetail(useGameSnapshot(), { propertyId, content: getContent() });
  const { confirmation, review, close, confirm } = usePropertyAction();
  return (
    <Screen>
      <Stack.Screen options={{ title: screenTitle(detail) }} />
      {detail.status === 'owned' ? (
        <OwnedPropertyDetails detail={detail} onReview={review} />
      ) : null}
      {detail.status === 'not_owned' ? (
        <EmptyState
          title={`You don't own ${detail.property.name}`}
          message="Buy it again from the Properties list at its listing price."
        />
      ) : null}
      {detail.status === 'unknown' ? (
        <EmptyState
          title="Property not found"
          message="Pick a property from the Properties list."
        />
      ) : null}
      <ActionSheet
        confirmation={confirmation}
        describe={propertyActionSheetText}
        onConfirm={() => void confirm()}
        onCancel={close}
      />
    </Screen>
  );
}
