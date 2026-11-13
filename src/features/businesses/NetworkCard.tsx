import type { NetworkView } from '@/application/airlineView';
import type { Fleet, Network } from '@/domain/business/airlineRules';
import { formatMoneyExact } from '@/domain/money';
import { Card } from '@/ui/Card';
import { ChoiceRow } from '@/ui/ChoiceRow';
import { DetailLine } from '@/ui/DetailLine';

import { NETWORK_NAMES } from './airlineFormat';

const networkChoice = (option: NetworkView) => ({
  value: option.network,
  label: option.best ? `${NETWORK_NAMES[option.network]} ★` : NETWORK_NAMES[option.network],
});

const networkFacts = (option: NetworkView) =>
  `Fare ${option.farePercent}% · Seats ${option.seatsPercent}% · Fuel ${option.burnPercent}% · ${formatMoneyExact(option.profitCents)}/day`;

function networkNote(fleet: Fleet, managerHired: boolean): string {
  if (fleet === 'repositioning') return 'Repositioning: fewer seats fly for the rest of today';
  if (managerHired) return 'Your manager repositions overnight to the best network, at no cost';
  return 'Changing network costs seats for the rest of today';
}

export function NetworkCard({
  network,
  fleet,
  networks,
  managerHired,
  onSelect,
}: {
  network: Network;
  fleet: Fleet;
  networks: readonly NetworkView[];
  managerHired: boolean;
  onSelect: (network: Network) => void;
}) {
  return (
    <Card>
      <ChoiceRow
        title="Network"
        note={networkNote(fleet, managerHired)}
        choices={networks.map(networkChoice)}
        selected={network}
        onSelect={(chosen) => (chosen === network ? undefined : onSelect(chosen))}
      />
      {networks.map((option) => (
        <DetailLine
          key={option.network}
          label={NETWORK_NAMES[option.network]}
          value={networkFacts(option)}
        />
      ))}
    </Card>
  );
}
