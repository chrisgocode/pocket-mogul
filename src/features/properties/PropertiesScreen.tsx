import { useRouter } from 'expo-router';

import { selectProperties, type PropertyListing } from '@/application/propertiesView';
import { getContent } from '@/content';
import { ActionSheet } from '@/features/game/ActionSheet';
import { useGameSnapshot } from '@/features/game/GameContext';
import { useGameAction } from '@/features/game/useGameAction';
import { Screen } from '@/ui/Screen';
import { PageTitle } from '@/ui/PageTitle';

import { propertyActionCommand, propertyActionSheetText } from './propertyAction';
import { PropertyRegister } from './PropertyRegister';
import { PropertySummary } from './PropertySummary';

export function PropertiesScreen() {
  const view = selectProperties(useGameSnapshot(), getContent());
  const { confirmation, review, close, confirm } = useGameAction(propertyActionCommand);
  const router = useRouter();
  const manage = (listing: PropertyListing) =>
    router.push({
      pathname: '/properties/[propertyId]',
      params: { propertyId: listing.property.id },
    });
  return (
    <Screen tone="properties">
      <PageTitle title="Properties" />
      <PropertySummary />
      <PropertyRegister
        listings={view.listings}
        onBuy={(listing) => review({ kind: 'buy', listing })}
        onManage={manage}
      />
      <ActionSheet
        confirmation={confirmation}
        describe={propertyActionSheetText}
        onConfirm={() => void confirm()}
        onCancel={close}
      />
    </Screen>
  );
}
