import { z } from 'zod';

import {
  BUSINESS_TRACKS,
  INCIDENT_CATEGORIES,
  PRICE_LEVELS,
  STAFF_ROLES,
} from '@/domain/business/definition';
import { OPTIONAL_PACKAGES } from '@/domain/business/carWashRules';
import { BEAN_GRADES, RUSH_PLANS } from '@/domain/business/coffeeKioskRules';
import { CART_SPOTS, MENU_ITEMS } from '@/domain/business/foodCartRules';
import { GYM_TIERS } from '@/domain/business/gymRules';
import { SEASONS } from '@/domain/business/hotelRules';
import { STOCK_MIXES, VENDING_LOCATIONS } from '@/domain/business/vendingRules';
import { COACH_MARKS } from '@/domain/coachMarks';
import type { GameCommand } from '@/domain/commands';
import { moneyCents, quantityMicrounits } from '@/domain/money';
import { PROPERTY_TRACKS } from '@/domain/propertyQuotes';
import { MOTION_PREFERENCES, NUMBER_FORMATS, SWITCH_VALUES } from '@/domain/settings';

const businessId = z.string().min(1);
const propertyId = z.string().min(1);
const fromLevel = z.number().int().nonnegative();
const fromCount = z.number().int().nonnegative();
const assetId = z.string().min(1);
const amountCents = z.bigint().positive().transform(moneyCents);
const vendingLocation = z.enum(VENDING_LOCATIONS);

const gameCommandSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('FileTaxReturn'),
    returnId: z.number().int().positive(),
    method: z.enum(['honest', 'zero']),
    revision: fromLevel,
  }),
  z.object({ type: z.literal('PayTaxDebt'), amountCents }),
  z.object({
    type: z.literal('TapBatch'),
    taps: z.number().int().positive(),
    boosted: z.boolean().default(false),
  }),
  z.object({ type: z.literal('UpgradeWallet'), fromLevel: z.number().int().nonnegative() }),
  z.object({ type: z.literal('BuyBusiness'), businessId }),
  z.object({ type: z.literal('BuyUnit'), businessId, fromUnits: z.number().int().positive() }),
  z.object({
    type: z.literal('UpgradeBusiness'),
    businessId,
    track: z.enum(BUSINESS_TRACKS),
    fromLevel,
  }),
  z.object({ type: z.literal('SetPriceLevel'), businessId, priceLevel: z.enum(PRICE_LEVELS) }),
  z.object({ type: z.literal('HireStaff'), businessId, role: z.enum(STAFF_ROLES), fromCount }),
  z.object({ type: z.literal('FireStaff'), businessId, role: z.enum(STAFF_ROLES), fromCount }),
  z.object({
    type: z.literal('UpgradeStage'),
    businessId,
    fromStage: z.number().int().positive(),
  }),
  z.object({
    type: z.literal('SetInsurance'),
    businessId,
    category: z.enum(INCIDENT_CATEGORIES),
    insured: z.boolean(),
  }),
  z.object({
    type: z.literal('MoveVendingMachine'),
    businessId,
    from: vendingLocation,
    to: vendingLocation,
  }),
  z.object({
    type: z.literal('SetVendingMix'),
    businessId,
    location: vendingLocation,
    mix: z.enum(STOCK_MIXES),
  }),
  z.object({
    type: z.literal('RestockVending'),
    businessId,
    location: z.union([vendingLocation, z.literal('all')]),
  }),
  z.object({ type: z.literal('InstallCardReaders'), businessId }),
  z.object({
    type: z.literal('SetWashPackage'),
    businessId,
    washPackage: z.enum(OPTIONAL_PACKAGES),
    offered: z.boolean(),
  }),
  z.object({
    type: z.literal('SetMembershipPrice'),
    businessId,
    priceLevel: z.enum(PRICE_LEVELS),
  }),
  z.object({ type: z.literal('SetMemberCap'), businessId, capPercent: z.number().int() }),
  z.object({ type: z.literal('InstallDetailing'), businessId }),
  z.object({ type: z.literal('AcceptContract'), businessId, offerId: z.string().min(1) }),
  z.object({ type: z.literal('DeclineContract'), businessId, offerId: z.string().min(1) }),
  z.object({ type: z.literal('InstallSortingHub'), businessId }),
  z.object({ type: z.literal('SetCartSpot'), businessId, spot: z.enum(CART_SPOTS) }),
  z.object({
    type: z.literal('SetMenuItem'),
    businessId,
    item: z.enum(MENU_ITEMS),
    offered: z.boolean(),
  }),
  z.object({ type: z.literal('InstallSecondWindow'), businessId }),
  z.object({ type: z.literal('SetBeanGrade'), businessId, grade: z.enum(BEAN_GRADES) }),
  z.object({ type: z.literal('SetRushPlan'), businessId, plan: z.enum(RUSH_PLANS) }),
  z.object({ type: z.literal('InstallOrderAhead'), businessId }),
  z.object({ type: z.literal('SetJumboShare'), businessId, percent: z.number().int() }),
  z.object({ type: z.literal('SetServiceLevel'), businessId, level: z.number().int() }),
  z.object({ type: z.literal('InstallPickup'), businessId }),
  z.object({ type: z.literal('SetBakeLevel'), businessId, percent: z.number().int() }),
  z.object({
    type: z.literal('AnswerWholesaleOffer'),
    businessId,
    offerId: z.number().int(),
    answer: z.enum(['accept', 'decline']),
  }),
  z.object({ type: z.literal('InstallCentralKitchen'), businessId }),
  z.object({ type: z.literal('SetGymTier'), businessId, tier: z.enum(GYM_TIERS) }),
  z.object({ type: z.literal('SetClassLevel'), businessId, level: z.number().int() }),
  z.object({ type: z.literal('InstallAllHours'), businessId }),
  z.object({
    type: z.literal('SetSeasonRate'),
    businessId,
    season: z.enum(SEASONS),
    priceLevel: z.enum(PRICE_LEVELS),
  }),
  z.object({ type: z.literal('InstallConference'), businessId }),
  z.object({
    type: z.literal('MakeTakeoverOffer'),
    businessId,
    rivalId: z.string().min(1),
    amountCents,
  }),
  z.object({
    type: z.literal('GoPublic'),
    businessId,
    floatPercent: z.number().int(),
    ticker: z.string(),
  }),
  z.object({ type: z.literal('DismissCoachMark'), coachMark: z.enum(COACH_MARKS) }),
  z.object({ type: z.literal('SetPayout'), businessId, payoutPercent: z.number().int() }),
  z.object({ type: z.literal('DepositToTreasury'), businessId, amountCents }),
  z.object({
    type: z.literal('WithdrawFromTreasury'),
    businessId,
    amountCents,
    quotedRevision: fromLevel.exactOptional(),
  }),
  z.object({
    type: z.literal('SellBusiness'),
    businessId,
    quotedRevision: fromLevel.exactOptional(),
  }),
  z.object({ type: z.literal('BuyProperty'), propertyId }),
  z.object({
    type: z.literal('UpgradeProperty'),
    propertyId,
    track: z.enum(PROPERTY_TRACKS),
    fromLevel,
  }),
  z.object({ type: z.literal('SetRentalStatus'), propertyId, rented: z.boolean() }),
  z.object({
    type: z.literal('SellProperty'),
    propertyId,
    quotedRevision: fromLevel.exactOptional(),
  }),
  z.object({
    type: z.literal('ExecuteTrade'),
    assetId,
    side: z.enum(['buy', 'sell']),
    quantity: z.bigint().transform(quantityMicrounits),
    quotedTick: z.number().int().nonnegative(),
    quotedRevision: z.number().int().nonnegative().exactOptional(),
  }),
  z.object({ type: z.literal('SetWatchlist'), assetId, watched: z.boolean() }),
  z.object({ type: z.literal('RecordAdReward'), presentationId: z.string().min(1) }),
  z.object({ type: z.literal('ActivateBoost') }),
  z.object({ type: z.literal('PinGoal'), goalId: z.string().min(1).nullable() }),
  z.object({ type: z.literal('AdvanceTime') }),
  z.object({ type: z.literal('SettleOffline') }),
  z.object({ type: z.literal('AcknowledgeReturnSummary') }),
  z.object({ type: z.literal('SkipTutorial') }),
  z.object({
    type: z.literal('UpdateSettings'),
    change: z.strictObject({
      sound: z.enum(SWITCH_VALUES).exactOptional(),
      haptics: z.enum(SWITCH_VALUES).exactOptional(),
      reducedMotion: z.enum(MOTION_PREFERENCES).exactOptional(),
      numberFormatting: z.enum(NUMBER_FORMATS).exactOptional(),
    }),
  }),
]);

export function validCommand(command: GameCommand): GameCommand | undefined {
  const parsed = gameCommandSchema.safeParse(command);
  return parsed.success ? parsed.data : undefined;
}
