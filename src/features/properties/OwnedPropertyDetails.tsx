import type { OwnedPropertyDetail } from '@/application/propertyDetailView';

import type { PropertyAction } from './propertyAction';
import { PropertyIncomeCard } from './PropertyIncomeCard';
import { PropertySellCard } from './PropertySellCard';
import { PropertyUpgradesSection } from './PropertyUpgradesSection';
import { RentalCard } from './RentalCard';

export function OwnedPropertyDetails({
  detail,
  onReview,
}: {
  detail: OwnedPropertyDetail;
  onReview: (action: PropertyAction) => void;
}) {
  const { property } = detail;
  const netPerMinuteCents = detail.income.netPerMinuteCents;
  return (
    <>
      <PropertyIncomeCard detail={detail} />
      <RentalCard
        detail={detail}
        onReview={(rented) =>
          onReview({
            kind: 'rent',
            property,
            rented,
            netPerMinuteCents: detail.rentedNetPerMinuteCents,
          })
        }
      />
      <PropertyUpgradesSection
        upgrades={detail.upgrades}
        onReview={(upgrade) => onReview({ kind: 'upgrade', property, upgrade })}
      />
      <PropertySellCard
        name={property.name}
        sale={detail.sale}
        valueUpgradePercent={detail.valueUpgradePercent}
        onReview={() => onReview({ kind: 'sell', property, sale: detail.sale, netPerMinuteCents })}
      />
    </>
  );
}
