import type { BusinessPricing } from '@/domain/business/definition';
import type { OwnedBusiness } from '@/domain/business/owned';
import type { GameCommand } from '@/domain/commands';

import { bakeryCommands } from './bakeryChoices';
import { coffeeKioskCommands } from './coffeeKioskChoices';
import { foodCartCommands } from './foodCartChoices';
import { gymCommands } from './gymChoices';
import { laundromatCommands } from './laundromatChoices';

export function mechanicCommands(
  owned: OwnedBusiness,
  context: { readonly pricing: BusinessPricing; readonly seed: string; readonly atMs: number },
): GameCommand[] {
  const { pricing } = context;
  return [
    ...foodCartCommands(owned, pricing),
    ...coffeeKioskCommands(owned, pricing),
    ...laundromatCommands(owned, pricing),
    ...gymCommands(owned, pricing),
    ...bakeryCommands(owned, context),
  ];
}
