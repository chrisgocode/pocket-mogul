import type { Content } from '@/content';
import { applyInstallHub, applySetNetwork } from '@/domain/business/airlineCommands';
import type { AirlineCommand } from '@/domain/business/airlineOrders';
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
import {
  applyAnswerPayloadOffer,
  applyInstallBoosters,
  applySetCadence,
} from '@/domain/business/spaceCommands';
import type { SpaceCommand } from '@/domain/business/spaceOrders';
import {
  applyInstallDetailing,
  applySetMemberCap,
  applySetMembershipPrice,
  applySetWashPackage,
} from '@/domain/business/carWashCommands';
import {
  applyAcceptContract,
  applyDeclineContract,
  applyInstallSortingHub,
} from '@/domain/business/deliveryCommands';
import {
  applyInstallCardReaders,
  applyMoveVendingMachine,
  applyRestockVending,
  applySetVendingMix,
} from '@/domain/business/vendingCommands';
import type { BusinessEconomy } from '@/domain/business/definition';
import type {
  AcceptContract,
  CommandResult,
  DeclineContract,
  InstallCardReaders,
  InstallDetailing,
  InstallSortingHub,
  MoveVendingMachine,
  RestockVending,
  SetMemberCap,
  SetMembershipPrice,
  SetVendingMix,
  SetWashPackage,
} from '@/domain/commands';
import type { GameState } from '@/domain/gameState';

import { businessEconomy } from './economy';

type VendingCommand = MoveVendingMachine | SetVendingMix | RestockVending | InstallCardReaders;
type CarWashCommand = SetWashPackage | SetMembershipPrice | SetMemberCap | InstallDetailing;
type DeliveryCommand = AcceptContract | DeclineContract | InstallSortingHub;

type FlagshipCommand =
  | VendingCommand
  | CarWashCommand
  | DeliveryCommand
  | FoodCartCommand
  | CoffeeKioskCommand
  | LaundromatCommand
  | BakeryCommand
  | GymCommand
  | HotelCommand
  | FactoryCommand
  | AirlineCommand
  | SpaceCommand;

type Handler<Command> = (state: GameState, command: Command, content: Content) => CommandResult;

export const withEconomy =
  <Command>(
    apply: (
      state: GameState,
      order: NoInfer<Command> & { readonly economy: BusinessEconomy },
    ) => CommandResult,
  ): Handler<Command> =>
  (state, command, content) =>
    apply(state, { ...command, economy: businessEconomy(content) });

export const FLAGSHIP_HANDLERS: {
  readonly [Type in FlagshipCommand['type']]: Handler<Extract<FlagshipCommand, { type: Type }>>;
} = {
  MoveVendingMachine: withEconomy(applyMoveVendingMachine),
  SetVendingMix: withEconomy(applySetVendingMix),
  RestockVending: withEconomy(applyRestockVending),
  InstallCardReaders: withEconomy(applyInstallCardReaders),
  SetWashPackage: withEconomy(applySetWashPackage),
  SetMembershipPrice: withEconomy(applySetMembershipPrice),
  SetMemberCap: withEconomy(applySetMemberCap),
  InstallDetailing: withEconomy(applyInstallDetailing),
  AcceptContract: withEconomy(applyAcceptContract),
  DeclineContract: withEconomy(applyDeclineContract),
  InstallSortingHub: withEconomy(applyInstallSortingHub),
  SetCartSpot: withEconomy(applySetCartSpot),
  SetMenuItem: withEconomy(applySetMenuItem),
  InstallSecondWindow: withEconomy(applyInstallSecondWindow),
  SetBeanGrade: withEconomy(applySetBeanGrade),
  SetRushPlan: withEconomy(applySetRushPlan),
  InstallOrderAhead: withEconomy(applyInstallOrderAhead),
  SetJumboShare: withEconomy(applySetJumboShare),
  SetServiceLevel: withEconomy(applySetServiceLevel),
  InstallPickup: withEconomy(applyInstallPickup),
  SetBakeLevel: withEconomy(applySetBakeLevel),
  AnswerWholesaleOffer: withEconomy(applyAnswerWholesaleOffer),
  InstallCentralKitchen: withEconomy(applyInstallCentralKitchen),
  SetGymTier: withEconomy(applySetGymTier),
  SetClassLevel: withEconomy(applySetClassLevel),
  InstallAllHours: withEconomy(applyInstallAllHours),
  SetSeasonRate: withEconomy(applySetSeasonRate),
  InstallConference: withEconomy(applyInstallConference),
  SetProduct: withEconomy(applySetProduct),
  AnswerBulkOffer: withEconomy(applyAnswerBulkOffer),
  InstallAutomation: withEconomy(applyInstallAutomation),
  SetNetwork: withEconomy(applySetNetwork),
  InstallHub: withEconomy(applyInstallHub),
  SetCadence: withEconomy(applySetCadence),
  AnswerPayloadOffer: withEconomy(applyAnswerPayloadOffer),
  InstallBoosters: withEconomy(applyInstallBoosters),
};

export const FLAGSHIP_INVESTMENTS = [
  'InstallCardReaders',
  'InstallDetailing',
  'InstallSortingHub',
  'InstallSecondWindow',
  'InstallOrderAhead',
  'InstallPickup',
  'InstallCentralKitchen',
  'InstallAllHours',
  'InstallConference',
  'InstallAutomation',
  'InstallHub',
  'InstallBoosters',
] as const satisfies readonly FlagshipCommand['type'][];
