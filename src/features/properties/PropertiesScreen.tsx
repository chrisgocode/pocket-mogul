import { useRouter } from 'expo-router';

import { selectProperties, type PropertyListing } from '@/application/propertiesView';
import { getContent } from '@/content';
import { ActionSheet } from '@/features/game/ActionSheet';
import { useGameSnapshot } from '@/features/game/GameContext';
import { useGameAction } from '@/features/game/useGameAction';
import { Card } from '@/ui/Card';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { Section } from '@/ui/Section';

import { propertyActionCommand, propertyActionSheetText } from './propertyAction';
import { PropertyListingRow } from './PropertyListingRow';
import { RentIncomeCard } from './RentIncomeCard';

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
    <Screen>
      <RentIncomeCard cashCents={view.cashCents} rentPerMinuteCents={view.rentPerMinuteCents} />
      {view.ownsAny ? null : (
        <EmptyState
          title="No properties yet"
          message="Buy a listing when you can afford it, then rent it out for income."
        />
      )}
      <Section title="Listings" note="Bought properties start vacant">
        <Card>
          {view.listings.map((listing) => (
            <PropertyListingRow
              key={listing.property.id}
              listing={listing}
              onBuy={(bought) => review({ kind: 'buy', listing: bought })}
              onManage={manage}
            />
          ))}
        </Card>
      </Section>
      <ActionSheet
        confirmation={confirmation}
        describe={propertyActionSheetText}
        onConfirm={() => void confirm()}
        onCancel={close}
      />
    </Screen>
  );
}
