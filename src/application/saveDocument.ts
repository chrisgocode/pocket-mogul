import type { ActivityKind, ActivityLog } from '@/domain/activity';
import { NO_STAFF, type StaffCounts } from '@/domain/business/definition';
import {
  NO_INCIDENT,
  NO_INSURANCE,
  type ActiveIncident,
  type Insurance,
  type OwnedBusiness,
} from '@/domain/business/owned';
import { NO_VENDING, type VendingOperation } from '@/domain/business/vendingRules';
import type {
  AbsenceIncident,
  GameState,
  PendingReturnSummary,
  ReturnSummary,
} from '@/domain/gameState';

export type SavedRisks = { readonly insurance: Insurance; readonly incident: ActiveIncident };

type SavedBusiness = Omit<OwnedBusiness, 'staff' | 'insurance' | 'incident' | 'vending'>;

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
  readonly staffing: Readonly<Record<string, StaffCounts>>;
  readonly risks: Readonly<Record<string, SavedRisks>>;
  readonly vending: Readonly<Record<string, VendingOperation>>;
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
      ({ staff: _staff, insurance: _insurance, incident: _incident, vending: _vending, ...rest }) =>
        rest,
    ),
    returnSummary: savedReturnSummary(returnSummary),
    activity: savedActivity(activity),
    staffing: byBusiness(businesses, (business) => business.staff),
    risks: byBusiness(businesses, ({ insurance, incident }) => ({ insurance, incident })),
    vending: byBusiness(businesses, (business) => business.vending),
    absenceIncidents: returnSummary.status === 'pending' ? returnSummary.summary.incidents : [],
    incidentEntries: activity.lifetime.byKind.incident,
  };
}

function loadedBusiness(saved: SavedBusiness, document: SaveDocument): OwnedBusiness {
  const risks = document.risks[saved.definitionId];
  return {
    ...saved,
    staff: document.staffing[saved.definitionId] ?? NO_STAFF,
    insurance: risks?.insurance ?? NO_INSURANCE,
    incident: risks?.incident ?? NO_INCIDENT,
    vending: document.vending[saved.definitionId] ?? NO_VENDING,
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
    staffing: _staffing,
    risks: _risks,
    absenceIncidents: _absenceIncidents,
    incidentEntries: _incidentEntries,
    vending: _vending,
    ...rest
  } = document;
  return {
    ...rest,
    businesses: document.businesses.map((saved) => loadedBusiness(saved, document)),
    returnSummary: loadedReturnSummary(document),
    activity: loadedActivity(document),
  };
}
