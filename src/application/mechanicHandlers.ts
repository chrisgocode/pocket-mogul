import type { Content } from '@/content';
import {
  applyAnswerWholesaleOffer,
  applyInstallCentralKitchen,
  applySetBakeLevel,
} from '@/domain/business/bakeryCommands';
import type { BakeryCommand } from '@/domain/business/bakeryOrders';
import {
  applyInstallOrderAhead,
  applySetBeanGrade,
  applySetRushPlan,
} from '@/domain/business/coffeeKioskCommands';
import type { CoffeeKioskCommand } from '@/domain/business/coffeeKioskOrders';
import {
  applyInstallSecondWindow,
  applySetCartSpot,
  applySetMenuItem,
} from '@/domain/business/foodCartCommands';
import type { FoodCartCommand } from '@/domain/business/foodCartOrders';
import {
  applyInstallPickup,
  applySetJumboShare,
  applySetServiceLevel,
} from '@/domain/business/laundromatCommands';
import type { LaundromatCommand } from '@/domain/business/laundromatOrders';
import type { CommandResult } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';

import { businessEconomy } from './economy';

type MechanicCommand = FoodCartCommand | CoffeeKioskCommand | LaundromatCommand | BakeryCommand;

type MechanicHandlers = {
  readonly [Type in MechanicCommand['type']]: (
    state: GameState,
    command: Extract<MechanicCommand, { type: Type }>,
    content: Content,
  ) => CommandResult;
};

export const MECHANIC_HANDLERS: MechanicHandlers = {
  SetCartSpot: (state, command, content) =>
    applySetCartSpot(state, { ...command, economy: businessEconomy(content) }),
  SetMenuItem: (state, command, content) =>
    applySetMenuItem(state, { ...command, economy: businessEconomy(content) }),
  InstallSecondWindow: (state, command, content) =>
    applyInstallSecondWindow(state, { ...command, economy: businessEconomy(content) }),
  SetBeanGrade: (state, command, content) =>
    applySetBeanGrade(state, { ...command, economy: businessEconomy(content) }),
  SetRushPlan: (state, command, content) =>
    applySetRushPlan(state, { ...command, economy: businessEconomy(content) }),
  InstallOrderAhead: (state, command, content) =>
    applyInstallOrderAhead(state, { ...command, economy: businessEconomy(content) }),
  SetJumboShare: (state, command, content) =>
    applySetJumboShare(state, { ...command, economy: businessEconomy(content) }),
  SetServiceLevel: (state, command, content) =>
    applySetServiceLevel(state, { ...command, economy: businessEconomy(content) }),
  InstallPickup: (state, command, content) =>
    applyInstallPickup(state, { ...command, economy: businessEconomy(content) }),
  SetBakeLevel: (state, command, content) =>
    applySetBakeLevel(state, { ...command, economy: businessEconomy(content) }),
  AnswerWholesaleOffer: (state, command, content) =>
    applyAnswerWholesaleOffer(state, { ...command, economy: businessEconomy(content) }),
  InstallCentralKitchen: (state, command, content) =>
    applyInstallCentralKitchen(state, { ...command, economy: businessEconomy(content) }),
};

export const MECHANIC_INVESTMENTS = [
  'InstallSecondWindow',
  'InstallOrderAhead',
  'InstallPickup',
  'InstallCentralKitchen',
] as const;
