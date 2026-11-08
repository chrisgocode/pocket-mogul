import type { WashPackageView } from '@/application/carWashView';
import { formatMoneyExact } from '@/domain/money';
import { ListRow } from '@/ui/ListRow';
import { SwitchRow } from '@/ui/SwitchRow';

import { PACKAGE_NAMES, type CarWashActions } from './carWashFormat';

const facts = (option: WashPackageView) =>
  `${formatMoneyExact(option.priceCents)} · Bay time ${option.bayPercent}%`;

export function WashPackageRow({
  option,
  actions,
}: {
  option: WashPackageView;
  actions: CarWashActions;
}) {
  const name = PACKAGE_NAMES[option.washPackage];
  const { washPackage } = option;
  if (washPackage === 'basic' || washPackage === 'detailing') {
    return <ListRow title={name} subtitle={facts(option)} value={`${option.sharePercent}%`} />;
  }
  const note =
    option.offer === 'offered'
      ? `${facts(option)} · ${option.sharePercent}% of walk-ins`
      : `${facts(option)} · Off: its walk-ins take the next package down`;
  return (
    <SwitchRow
      title={name}
      note={note}
      value={option.offer === 'offered'}
      onChange={(offered) => actions.setPackage({ washPackage, offered })}
    />
  );
}
