import { profitPerDayCents } from '@/domain/business/core';
import type { BusinessPricing } from '@/domain/business/definition';
import { busiestSpot, runningFoodCart } from '@/domain/business/foodCartDemand';
import { MENU_ITEMS, type MenuItem } from '@/domain/business/foodCartRules';
import type { ActiveFoodCart, MenuOffer } from '@/domain/business/foodCartState';
import type { OwnedBusiness } from '@/domain/business/owned';
import type { GameCommand } from '@/domain/commands';

type Serving = { readonly owned: OwnedBusiness; readonly operation: ActiveFoodCart };

function switched(serving: Serving, item: MenuItem): Serving {
  const { owned, operation } = serving;
  const offer: MenuOffer = operation.menu[item] === 'offered' ? 'withdrawn' : 'offered';
  const foodCart = { ...operation, menu: { ...operation.menu, [item]: offer } };
  return { owned: { ...owned, foodCart }, operation: foodCart };
}

function bestMenu(serving: Serving, pricing: BusinessPricing): Serving {
  return MENU_ITEMS.reduce((best, item) => {
    const tried = switched(best, item);
    return profitPerDayCents(tried.owned, pricing) > profitPerDayCents(best.owned, pricing)
      ? tried
      : best;
  }, serving);
}

export function foodCartCommands(owned: OwnedBusiness, pricing: BusinessPricing): GameCommand[] {
  const running = runningFoodCart(owned, pricing);
  if (running === undefined) return [];
  const businessId = owned.definitionId;
  const spot = busiestSpot(running);
  const operation = { ...running.operation, spot };
  const best = bestMenu({ owned: { ...owned, foodCart: operation }, operation }, pricing);
  const move: GameCommand[] =
    spot === running.operation.spot ? [] : [{ type: 'SetCartSpot', businessId, spot }];
  const menu: GameCommand[] = MENU_ITEMS.filter(
    (item) => best.operation.menu[item] !== running.operation.menu[item],
  ).map((item) => ({
    type: 'SetMenuItem',
    businessId,
    item,
    offered: best.operation.menu[item] === 'offered',
  }));
  return [...move, ...menu];
}
