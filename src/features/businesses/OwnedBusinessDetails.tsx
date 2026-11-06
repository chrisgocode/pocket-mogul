import type { OwnedBusinessDetail } from '@/application/businessDetailView';
import { getContent } from '@/content';

import type { BusinessAction } from './businessAction';
import { BusinessIncomeCard } from './BusinessIncomeCard';
import { formatBonus } from './businessFormat';
import { BusinessUpgradesSection } from './BusinessUpgradesSection';
import { ManagerCard } from './ManagerCard';
import { SellCard } from './SellCard';

export function OwnedBusinessDetails({
  detail,
  onReview,
}: {
  detail: OwnedBusinessDetail;
  onReview: (action: BusinessAction) => void;
}) {
  const { business } = detail;
  const rules = getContent().economy.businessRules;
  return (
    <>
      <BusinessIncomeCard detail={detail} />
      <BusinessUpgradesSection
        detail={detail}
        milestoneEveryLevels={rules.milestoneEveryLevels}
        onReview={(upgrade) => onReview({ kind: 'upgrade', business, upgrade })}
      />
      <ManagerCard
        manager={detail.manager}
        bonus={formatBonus(rules.managerBonusBps)}
        onReview={(manager) => onReview({ kind: 'manager', business, manager })}
      />
      <SellCard
        name={business.name}
        sale={detail.sale}
        returnPercent={rules.saleReturnPercent}
        onReview={() =>
          onReview({
            kind: 'sell',
            business,
            sale: detail.sale,
            netPerMinuteCents: detail.income.netPerMinuteCents,
          })
        }
      />
    </>
  );
}
