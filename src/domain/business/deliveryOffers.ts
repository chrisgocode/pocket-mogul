import { drawInt } from '@/domain/marketRandom';
import { moneyCents } from '@/domain/money';

import type { BusinessPricing } from './definition';
import type { RunningDelivery } from './deliveryDemand';
import type { DrawRange } from './deliveryRules';
import type { ContractOffer } from './deliveryState';
import { reputationOf } from './deliveryReputation';
import type { OwnedBusiness } from './owned';

export type OfferBoard = {
  readonly business: OwnedBusiness;
  readonly pricing: BusinessPricing;
  readonly running: RunningDelivery;
  readonly seed: string;
  readonly day: number;
};

type OfferField = 'client' | 'share' | 'rate' | 'penalty' | 'days';

const CONTRACT_STREAM = 'contract';
const PERCENT = 100n;
const BASIS_POINTS = 10_000n;
const FIRST_STAR = 1;

function draw(board: OfferBoard, pick: { slot: number; field: OfferField; range: DrawRange }) {
  const scope = `${board.business.definitionId}:${pick.slot}:${pick.field}`;
  const key = { seed: board.seed, tick: board.day, scope, stream: CONTRACT_STREAM };
  return drawInt(key, [pick.range.min, pick.range.max]);
}

function reputationBps(board: OfferBoard, field: 'offerSizeBps' | 'offerRateBps'): bigint {
  const { rules, operation } = board.running;
  const { stars } = reputationOf(operation.history, rules.reputation);
  return BigInt(rules.reputation.stars[stars - FIRST_STAR]?.[field] ?? Number(BASIS_POINTS));
}

function parcelsOffered(board: OfferBoard, slot: number): number {
  const { offers } = board.running.rules;
  const fleet = BigInt(board.pricing.definition.capacityPerUnit * board.business.units);
  const share = BigInt(draw(board, { slot, field: 'share', range: offers.fleetSharePercent }));
  const sized = (fleet * share * reputationBps(board, 'offerSizeBps')) / (PERCENT * BASIS_POINTS);
  const step = BigInt(offers.parcelStep);
  const stepped = (sized / step) * step;
  return Number(stepped > step ? stepped : step);
}

function drawnOffer(board: OfferBoard, slot: number): ContractOffer {
  const { offers } = board.running.rules;
  const clientRange = { min: 0, max: offers.clients.length - 1 };
  const client = offers.clients[draw(board, { slot, field: 'client', range: clientRange })];
  const ratePercent = BigInt(draw(board, { slot, field: 'rate', range: offers.ratePercent }));
  const rateCents =
    (board.pricing.definition.pricePerCustomerCents *
      ratePercent *
      reputationBps(board, 'offerRateBps')) /
    (PERCENT * BASIS_POINTS);
  const penaltyPercent = BigInt(
    draw(board, { slot, field: 'penalty', range: offers.penaltyPercent }),
  );
  return {
    id: `${board.day}-${slot}`,
    clientId: client?.id ?? '',
    parcelsPerDay: parcelsOffered(board, slot),
    rateCents: moneyCents(rateCents),
    penaltyCents: moneyCents((rateCents * penaltyPercent) / PERCENT),
    days: draw(board, { slot, field: 'days', range: offers.days }),
    postedDay: board.day,
  };
}

export function offerExpiresDay(offer: ContractOffer, board: { expiryDays: number }): number {
  return offer.postedDay + board.expiryDays;
}

export function refreshedOffers(board: OfferBoard): readonly ContractOffer[] {
  const { offers } = board.running.rules;
  const standing = board.running.operation.offers.filter(
    (offer) => offerExpiresDay(offer, offers) > board.day,
  );
  const open = Math.max(0, offers.boardSize - standing.length);
  return [...standing, ...Array.from({ length: open }, (_, slot) => drawnOffer(board, slot))];
}
