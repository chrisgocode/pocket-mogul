import type { ContractView } from '@/application/deliveryView';
import { formatMoneyExact } from '@/domain/money';
import { Card } from '@/ui/Card';
import { ListRow } from '@/ui/ListRow';

import { daysText, parcels } from './deliveryFormat';

function deliveredText(contract: ContractView): string {
  const rate = `${formatMoneyExact(contract.rateCents)} each`;
  if (contract.missed === 0) return `All delivered · ${rate} · ${daysText(contract.daysLeft)} left`;
  return `${parcels(contract.missed)} missed a day at ${formatMoneyExact(contract.penaltyCents)} each · ${daysText(contract.daysLeft)} left`;
}

export function ContractsCard({ contracts }: { contracts: readonly ContractView[] }) {
  if (contracts.length === 0) {
    return (
      <Card>
        <ListRow title="Active contracts" subtitle="None yet. Accept an offer to start." />
      </Card>
    );
  }
  return (
    <Card>
      {contracts.map((contract) => (
        <ListRow
          key={contract.id}
          title={contract.client}
          subtitle={deliveredText(contract)}
          value={`${parcels(contract.delivered)}/${parcels(contract.parcelsPerDay)}`}
          detail="parcels a day"
        />
      ))}
    </Card>
  );
}
