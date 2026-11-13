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
  applyAnswerBulkOffer,
  applyInstallAutomation,
  applySetProduct,
} from '@/domain/business/factoryCommands';
import type { FactoryCommand } from '@/domain/business/factoryOrders';
import {
  applyInstallSecondWindow,
  applySetCartSpot,
  applySetMenuItem,
} from '@/domain/business/foodCartCommands';
import type { FoodCartCommand } from '@/domain/business/foodCartOrders';
import {
  applyInstallAllHours,
  applySetClassLevel,
  applySetGymTier,
} from '@/domain/business/gymCommands';
import type { GymCommand } from '@/domain/business/gymOrders';
import { applyInstallConference, applySetSeasonRate } from '@/domain/business/hotelCommands';
import type { HotelCommand } from '@/domain/business/hotelOrders';
import {
  applyInstallPickup,
  applySetJumboShare,
  applySetServiceLevel,
} from '@/domain/business/laundromatCommands';
import type { LaundromatCommand } from '@/domain/business/laundromatOrders';
import type { CommandResult } from '@/domain/commands';
import type { GameState } from '@/domain/gameState';

import { businessEconomy } from './economy';

type MechanicCommand =
  | FoodCartCommand
  | CoffeeKioskCommand
  | LaundromatCommand
  | BakeryCommand
  | GymCommand
  | HotelCommand
  | FactoryCommand;

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
  SetGymTier: (state, command, content) =>
    applySetGymTier(state, { ...command, economy: businessEconomy(content) }),
  SetClassLevel: (state, command, content) =>
    applySetClassLevel(state, { ...command, economy: businessEconomy(content) }),
  InstallAllHours: (state, command, content) =>
    applyInstallAllHours(state, { ...command, economy: businessEconomy(content) }),
  SetSeasonRate: (state, command, content) =>
    applySetSeasonRate(state, { ...command, economy: businessEconomy(content) }),
  InstallConference: (state, command, content) =>
    applyInstallConference(state, { ...command, economy: businessEconomy(content) }),
  SetProduct: (state, command, content) =>
    applySetProduct(state, { ...command, economy: businessEconomy(content) }),
  AnswerBulkOffer: (state, command, content) =>
    applyAnswerBulkOffer(state, { ...command, economy: businessEconomy(content) }),
  InstallAutomation: (state, command, content) =>
    applyInstallAutomation(state, { ...command, economy: businessEconomy(content) }),
};

export const MECHANIC_INVESTMENTS = [
  'InstallSecondWindow',
  'InstallOrderAhead',
  'InstallPickup',
  'InstallCentralKitchen',
  'InstallAllHours',
  'InstallConference',
  'InstallAutomation',
] as const;
