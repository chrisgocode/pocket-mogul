import type { WashPackageView } from '@/application/carWashView';
import { Card } from '@/ui/Card';

import type { CarWashActions } from './carWashFormat';
import { WashPackageRow } from './WashPackageRow';

export function WashPackagesCard({
  packages,
  actions,
}: {
  packages: readonly WashPackageView[];
  actions: CarWashActions;
}) {
  return (
    <Card>
      {packages.map((option) => (
        <WashPackageRow key={option.washPackage} option={option} actions={actions} />
      ))}
    </Card>
  );
}
