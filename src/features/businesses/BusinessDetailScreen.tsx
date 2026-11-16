import { Stack, useLocalSearchParams } from 'expo-router';

import { selectBusinessDetail, type BusinessDetailView } from '@/application/businessDetailView';
import { getContent } from '@/content';
import { ActionSheet } from '@/features/game/ActionSheet';
import { useGameSnapshot } from '@/features/game/GameContext';
import { useGameAction } from '@/features/game/useGameAction';
import { useQuickBuy } from '@/features/game/useQuickBuy';
import { backLinkOptions } from '@/ui/backLinkOptions';
import { Screen } from '@/ui/Screen';

import {
  businessActionCommand,
  businessActionSheetText,
  type BusinessAction,
} from './businessAction';
import { tabForSection } from './businessTabs';
import { MissingBusiness } from './MissingBusiness';
import { OwnedBusinessDetails } from './OwnedBusinessDetails';
import type { TreasuryActions } from './treasuryActions';
import type { CarWashActions } from './carWashFormat';
import type { DeliveryActions } from './deliveryFormat';
import type { FlagshipActions } from './FlagshipSections';
import {
  airlineActions,
  bakeryActions,
  coffeeKioskActions,
  factoryActions,
  foodCartActions,
  gymActions,
  hotelActions,
  laundromatActions,
  spaceActions,
} from './mechanicActions';
import type { VendingActions } from './vendingFormat';
import { useBusinessCommand } from './useBusinessCommand';

const BACK_OPTIONS = backLinkOptions({ href: '/businesses', label: 'Businesses' });

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

function vendingActions(
  detail: Extract<BusinessDetailView, { status: 'owned' }>,
  handlers: {
    run: ReturnType<typeof useBusinessCommand>;
    review: (action: BusinessAction) => void;
  },
): VendingActions {
  const businessId = detail.business.id;
  const { run } = handlers;
  return {
    move: (route) => run({ type: 'MoveVendingMachine', businessId, ...route }),
    setMix: (choice) => run({ type: 'SetVendingMix', businessId, ...choice }),
    restock: (location) => run({ type: 'RestockVending', businessId, location }),
    dismissCoachMark: () => run({ type: 'DismissCoachMark', coachMark: 'vending' }),
    installCardReaders: (readers) =>
      handlers.review({ kind: 'card_readers', business: detail.business, readers }),
  };
}

function carWashActions(
  detail: Extract<BusinessDetailView, { status: 'owned' }>,
  handlers: {
    run: ReturnType<typeof useBusinessCommand>;
    review: (action: BusinessAction) => void;
  },
): CarWashActions {
  const businessId = detail.business.id;
  const { run } = handlers;
  return {
    setPackage: (change) => run({ type: 'SetWashPackage', businessId, ...change }),
    setMembershipPrice: (priceLevel) => run({ type: 'SetMembershipPrice', businessId, priceLevel }),
    setMemberCap: (capPercent) => run({ type: 'SetMemberCap', businessId, capPercent }),
    dismissCoachMark: () => run({ type: 'DismissCoachMark', coachMark: 'car_wash' }),
    installDetailing: (detailing) =>
      handlers.review({ kind: 'detailing', business: detail.business, detailing }),
  };
}

function deliveryActions(
  detail: Extract<BusinessDetailView, { status: 'owned' }>,
  handlers: {
    run: ReturnType<typeof useBusinessCommand>;
    review: (action: BusinessAction) => void;
  },
): DeliveryActions {
  const businessId = detail.business.id;
  const { business } = detail;
  return {
    accept: (offer) => handlers.review({ kind: 'contract', business, offer }),
    decline: (offerId) => handlers.run({ type: 'DeclineContract', businessId, offerId }),
    dismissCoachMark: () => handlers.run({ type: 'DismissCoachMark', coachMark: 'delivery' }),
    installSortingHub: (hub) => handlers.review({ kind: 'sorting_hub', business, hub }),
  };
}

function flagshipActions(
  detail: Extract<BusinessDetailView, { status: 'owned' }>,
  handlers: {
    run: ReturnType<typeof useBusinessCommand>;
    review: (action: BusinessAction) => void;
  },
): FlagshipActions {
  return {
    vending: vendingActions(detail, handlers),
    carWash: carWashActions(detail, handlers),
    delivery: deliveryActions(detail, handlers),
    foodCart: foodCartActions(detail, handlers),
    coffeeKiosk: coffeeKioskActions(detail, handlers),
    laundromat: laundromatActions(detail, handlers),
    bakery: bakeryActions(detail, handlers),
    gym: gymActions(detail, handlers),
    hotel: hotelActions(detail, handlers),
    factory: factoryActions(detail, handlers),
    airline: airlineActions(detail, handlers),
    space: spaceActions(detail, handlers),
  };
}

export function BusinessDetailScreen() {
  const { businessId, section } = useLocalSearchParams<{ businessId: string; section?: string }>();
  const detail = selectBusinessDetail(useGameSnapshot(), { businessId, content: getContent() });
  const { confirmation, review, close, confirm } = useGameAction(businessActionCommand);
  const run = useBusinessCommand();
  const buy = useQuickBuy();
  return (
    <Screen tone="businesses" focusSection={section}>
      <Stack.Screen options={{ ...BACK_OPTIONS, title: '' }} />
      {detail.status === 'owned' ? (
        <OwnedBusinessDetails
          key={section ?? 'default'}
          detail={detail}
          initialTab={tabForSection(section)}
          onReview={review}
          onBuy={buy}
          run={{
            onInsurance: (change) => run({ type: 'SetInsurance', businessId, ...change }),
            onPriceLevel: (priceLevel) => run({ type: 'SetPriceLevel', businessId, priceLevel }),
            treasury: treasuryActions(detail, { run, review }),
            flagship: flagshipActions(detail, { run, review }),
          }}
        />
      ) : null}
      {detail.status === 'owned' ? null : <MissingBusiness detail={detail} />}
      <ActionSheet
        confirmation={confirmation}
        taxCommand={businessActionCommand}
        describe={businessActionSheetText}
        onConfirm={() => void confirm()}
        onCancel={close}
      />
    </Screen>
  );
}
