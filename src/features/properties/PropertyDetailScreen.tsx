import { Stack, useLocalSearchParams } from 'expo-router';

import { selectPropertyDetail, type PropertyDetailView } from '@/application/propertyDetailView';
import { getContent } from '@/content';
import { ActionSheet } from '@/features/game/ActionSheet';
import { useGameSnapshot } from '@/features/game/GameContext';
import { useGameAction } from '@/features/game/useGameAction';
import { EmptyState } from '@/ui/EmptyState';
import { backLinkOptions } from '@/ui/backLinkOptions';
import { Screen } from '@/ui/Screen';

import { OwnedPropertyDetails } from './OwnedPropertyDetails';
import { propertyActionCommand, propertyActionSheetText } from './propertyAction';

const BACK_OPTIONS = backLinkOptions({ href: '/properties', label: 'Properties' });

function screenTitle(detail: PropertyDetailView): string {
  return detail.status === 'unknown' ? 'Property' : detail.property.name;
}

export function PropertyDetailScreen() {
  const { propertyId } = useLocalSearchParams<{ propertyId: string }>();
  const detail = selectPropertyDetail(useGameSnapshot(), { propertyId, content: getContent() });
  const { confirmation, review, close, confirm } = useGameAction(propertyActionCommand);
  return (
    <Screen tone="properties">
      <Stack.Screen options={{ ...BACK_OPTIONS, title: screenTitle(detail) }} />
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
        taxCommand={propertyActionCommand}
        describe={propertyActionSheetText}
        onConfirm={() => void confirm()}
        onCancel={close}
      />
    </Screen>
  );
}
