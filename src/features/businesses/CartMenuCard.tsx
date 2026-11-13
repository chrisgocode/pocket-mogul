import type { MenuItemView } from '@/application/foodCartView';
import { formatCashChange } from '@/features/game/priceFormat';
import { Card } from '@/ui/Card';
import { SwitchRow } from '@/ui/SwitchRow';
import { AppText } from '@/ui/Typography';

import { MENU_ITEM_NAMES, type FoodCartActions } from './foodCartFormat';

const WHOLE_PERCENT = 100;

const effect = (label: string, percent: number) =>
  percent === WHOLE_PERCENT ? [] : [`${label} ${percent}%`];

function itemNote(option: MenuItemView): string {
  const effects = [
    ...effect('Customers', option.customersPercent),
    ...effect('Order size', option.pricePercent),
    ...effect('Serving speed', option.speedPercent),
  ];
  const action = option.offer === 'offered' ? 'Taking it off' : 'Adding it';
  const change = `${action} today: ${formatCashChange(option.switchProfitCents)} a day`;
  return [...effects, change].join(' · ');
}

export function CartMenuCard({
  menu,
  actions,
}: {
  menu: readonly MenuItemView[];
  actions: FoodCartActions;
}) {
  return (
    <Card>
      <AppText variant="heading">Menu</AppText>
      <AppText variant="caption" muted>
        A wide menu pays on quiet days. A short one keeps a busy line moving
      </AppText>
      {menu.map((option) => (
        <SwitchRow
          key={option.item}
          title={MENU_ITEM_NAMES[option.item]}
          note={itemNote(option)}
          value={option.offer === 'offered'}
          onChange={(offered) => actions.setMenuItem({ item: option.item, offered })}
        />
      ))}
    </Card>
  );
}
