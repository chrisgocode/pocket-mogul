import type { Listing } from '@/domain/business/listingState';
import type { ActivityKind, ActivityLog } from '@/domain/activity';
import { NO_STAFF, type StaffCounts } from '@/domain/business/definition';
import {
  NO_INCIDENT,
  NO_INSURANCE,
  type ActiveIncident,
  type Insurance,
  type OwnedBusiness,
} from '@/domain/business/owned';
import { NO_CAR_WASH, type CarWashOperation } from '@/domain/business/carWashState';
import { NO_DELIVERY, type DeliveryOperation } from '@/domain/business/deliveryState';
import { NO_COFFEE_KIOSK, type CoffeeKioskOperation } from '@/domain/business/coffeeKioskRules';
import { NO_FOOD_CART, type FoodCartOperation } from '@/domain/business/foodCartState';
import { NO_LAUNDROMAT, type LaundromatOperation } from '@/domain/business/laundromatRules';
import { NO_TAKEOVERS, type Takeovers } from '@/domain/business/takeoverState';
import { NO_VENDING, type VendingOperation } from '@/domain/business/vendingRules';
import type {
  AbsenceIncident,
  GameState,
  PendingReturnSummary,
  ReturnSummary,
} from '@/domain/gameState';

export type SavedRisks = { readonly insurance: Insurance; readonly incident: ActiveIncident };

type SavedBusiness = Omit<
  OwnedBusiness,
  | 'staff'
  | 'insurance'
  | 'incident'
  | 'vending'
  | 'carWash'
  | 'delivery'
  | 'foodCart'
  | 'coffeeKiosk'
  | 'laundromat'
  | 'takeovers'
  | 'listing'
>;

type SavedReturnSummary =
  | { readonly status: 'none' }
  | { readonly status: 'pending'; readonly summary: Omit<ReturnSummary, 'incidents'> };

type SavedActivity = Omit<ActivityLog, 'lifetime'> & {
  readonly lifetime: Omit<ActivityLog['lifetime'], 'byKind'> & {
    readonly byKind: Readonly<Record<Exclude<ActivityKind, 'incident'>, number>>;
  };
};

export type SaveDocument = Omit<GameState, 'businesses' | 'returnSummary' | 'activity'> & {
  readonly businesses: readonly SavedBusiness[];
  readonly returnSummary: SavedReturnSummary;
  readonly activity: SavedActivity;
  readonly listings: Readonly<Record<string, Listing>>;
  readonly staffing: Readonly<Record<string, StaffCounts>>;
  readonly risks: Readonly<Record<string, SavedRisks>>;
  readonly vending: Readonly<Record<string, VendingOperation>>;
  readonly carWash: Readonly<Record<string, CarWashOperation>>;
  readonly delivery: Readonly<Record<string, DeliveryOperation>>;
  readonly foodCart: Readonly<Record<string, FoodCartOperation>>;
  readonly coffeeKiosk: Readonly<Record<string, CoffeeKioskOperation>>;
  readonly laundromat: Readonly<Record<string, LaundromatOperation>>;
  readonly takeovers: Readonly<Record<string, Takeovers>>;
  readonly absenceIncidents: readonly AbsenceIncident[];
  readonly incidentEntries: number;
};

function savedReturnSummary(pending: PendingReturnSummary): SavedReturnSummary {
  if (pending.status === 'none') return pending;
  const { incidents: _incidents, ...summary } = pending.summary;
  return { status: 'pending', summary };
}

function savedActivity(activity: ActivityLog): SavedActivity {
  const { incident: _incident, ...byKind } = activity.lifetime.byKind;
  return { ...activity, lifetime: { ...activity.lifetime, byKind } };
}

const byBusiness = <Value>(
  businesses: readonly OwnedBusiness[],
  pick: (business: OwnedBusiness) => Value,
) => Object.fromEntries(businesses.map((business) => [business.definitionId, pick(business)]));

export function toSaveDocument(state: GameState): SaveDocument {
  const { businesses, returnSummary, activity } = state;
  return {
    ...state,
    businesses: businesses.map(
      ({
        staff: _staff,
        insurance: _insurance,
        incident: _incident,
        vending: _vending,
        carWash: _carWash,
        delivery: _delivery,
        foodCart: _foodCart,
        coffeeKiosk: _coffeeKiosk,
        laundromat: _laundromat,
        takeovers: _takeovers,
        listing: _listing,
        ...rest
      }) => rest,
    ),
    returnSummary: savedReturnSummary(returnSummary),
    activity: savedActivity(activity),
    listings: byBusiness(businesses, (business) => business.listing),
    staffing: byBusiness(businesses, (business) => business.staff),
    risks: byBusiness(businesses, ({ insurance, incident }) => ({ insurance, incident })),
    vending: byBusiness(businesses, (business) => business.vending),
    carWash: byBusiness(businesses, (business) => business.carWash),
    delivery: byBusiness(businesses, (business) => business.delivery),
    foodCart: byBusiness(businesses, (business) => business.foodCart),
    coffeeKiosk: byBusiness(businesses, (business) => business.coffeeKiosk),
    laundromat: byBusiness(businesses, (business) => business.laundromat),
    takeovers: byBusiness(businesses, (business) => business.takeovers),
    absenceIncidents: returnSummary.status === 'pending' ? returnSummary.summary.incidents : [],
    incidentEntries: activity.lifetime.byKind.incident,
  };
}

type ByBusiness<Value> = Readonly<Record<string, Value>>;

function loadedMechanics(businessId: string, document: SaveDocument) {
  const saved = <Value>(record: ByBusiness<Value>, inactive: Value): Value =>
    record[businessId] ?? inactive;
  return {
    listing: saved<Listing>(document.listings, { status: 'private' }),
    vending: saved(document.vending, NO_VENDING),
    carWash: saved(document.carWash, NO_CAR_WASH),
    delivery: saved(document.delivery, NO_DELIVERY),
    foodCart: saved(document.foodCart, NO_FOOD_CART),
    coffeeKiosk: saved(document.coffeeKiosk, NO_COFFEE_KIOSK),
    laundromat: saved(document.laundromat, NO_LAUNDROMAT),
    takeovers: saved(document.takeovers, NO_TAKEOVERS),
  };
}

function loadedBusiness(saved: SavedBusiness, document: SaveDocument): OwnedBusiness {
  const risks = document.risks[saved.definitionId];
  return {
    ...saved,
    staff: document.staffing[saved.definitionId] ?? NO_STAFF,
    insurance: risks?.insurance ?? NO_INSURANCE,
    incident: risks?.incident ?? NO_INCIDENT,
    ...loadedMechanics(saved.definitionId, document),
  };
}

function loadedReturnSummary(document: SaveDocument): PendingReturnSummary {
  const { returnSummary, absenceIncidents } = document;
  if (returnSummary.status === 'none') return returnSummary;
  return { status: 'pending', summary: { ...returnSummary.summary, incidents: absenceIncidents } };
}

function loadedActivity(document: SaveDocument): ActivityLog {
  const { activity, incidentEntries } = document;
  const byKind = { ...activity.lifetime.byKind, incident: incidentEntries };
  return { ...activity, lifetime: { ...activity.lifetime, byKind } };
}

export function fromSaveDocument(document: SaveDocument): GameState {
  const {
    listings: _listings,
    staffing: _staffing,
    risks: _risks,
    absenceIncidents: _absenceIncidents,
    incidentEntries: _incidentEntries,
    vending: _vending,
    carWash: _carWash,
    delivery: _delivery,
    foodCart: _foodCart,
    coffeeKiosk: _coffeeKiosk,
    laundromat: _laundromat,
    takeovers: _takeovers,
    ...rest
  } = document;
  return {
    ...rest,
    businesses: document.businesses.map((saved) => loadedBusiness(saved, document)),
    returnSummary: loadedReturnSummary(document),
    activity: loadedActivity(document),
  };
}
