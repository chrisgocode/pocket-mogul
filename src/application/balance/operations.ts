import { locationCommand, membershipCapCommand } from './flagshipChoices';
import type { OptionContext } from './options';
import { businessEconomy } from '@/application/economy';
import { bestPriceLevel, profitPerDayCents } from '@/domain/business/core';
import { PRICE_LEVELS, businessDayOf, type BusinessPricing } from '@/domain/business/definition';
import { quoteContract, withAcceptedContract } from '@/domain/business/deliveryQuotes';
import type { OwnedBusiness } from '@/domain/business/owned';
import { bestMix, vendingRulesOf } from '@/domain/business/vendingDemand';
import { VENDING_LOCATIONS } from '@/domain/business/vendingRules';
import type { GameCommand } from '@/domain/commands';

function vendingCommands(owned: OwnedBusiness, pricing: BusinessPricing): GameCommand[] {
  const rules = vendingRulesOf(pricing);
  const { vending } = owned;
  if (rules === undefined || vending.status !== 'active') return [];
  const businessId = owned.definitionId;
  const mixes: GameCommand[] = VENDING_LOCATIONS.flatMap((location) => {
    const mix = bestMix(rules, location);
    return mix === vending.spots[location].mix
      ? []
      : [{ type: 'SetVendingMix', businessId, location, mix }];
  });
  const empty = VENDING_LOCATIONS.some((location) => {
    const spot = vending.spots[location];
    return spot.machines > 0 && spot.stock === 0;
  });
  const restock: GameCommand[] = empty
    ? [{ type: 'RestockVending', businessId, location: 'all' }]
    : [];
  return [...mixes, ...restock];
}

function washCommands(owned: OwnedBusiness, pricing: BusinessPricing): GameCommand[] {
  const { carWash } = owned;
  if (carWash.status !== 'active') return [];
  const businessId = owned.definitionId;
  const choices = PRICE_LEVELS.map((membershipLevel) => membershipChoice(owned, membershipLevel));
  const best = choices.reduce(
    (a, b) => (profitPerDayCents(b, pricing) > profitPerDayCents(a, pricing) ? b : a),
    owned,
  );
  const price: GameCommand[] =
    best.carWash.status === 'active' && best.carWash.membershipLevel !== carWash.membershipLevel
      ? [{ type: 'SetMembershipPrice', businessId, priceLevel: best.carWash.membershipLevel }]
      : [];
  const packages: GameCommand[] = (['deluxe', 'ultimate'] as const).flatMap((washPackage) => {
    const offered = carWash.packages[washPackage] !== 'offered';
    const changed = {
      ...owned,
      carWash: {
        ...carWash,
        packages: {
          ...carWash.packages,
          [washPackage]: offered ? ('offered' as const) : ('withdrawn' as const),
        },
      },
    };
    return profitPerDayCents(changed, pricing) > profitPerDayCents(owned, pricing)
      ? [{ type: 'SetWashPackage', businessId, washPackage, offered }]
      : [];
  });
  return [...price, ...packages];
}

function contractCommands(
  owned: OwnedBusiness,
  context: { pricing: BusinessPricing; atMs: number },
): GameCommand[] {
  const { delivery } = owned;
  if (delivery.status !== 'active') return [];
  const day = businessDayOf(context.atMs, context.pricing.rules);
  const selected = delivery.offers.reduce((current, offer) => {
    const quote = quoteContract(current, { pricing: context.pricing, offer, day });
    return quote.nextProfitCents > quote.profitCents
      ? withAcceptedContract(current, { offer, day })
      : current;
  }, owned);
  if (selected.delivery.status !== 'active') return [];
  const accepted = new Set(selected.delivery.contracts.map((contract) => contract.id));
  return delivery.offers
    .filter((offer) => accepted.has(offer.id))
    .map((offer) => ({
      type: 'AcceptContract',
      businessId: owned.definitionId,
      offerId: offer.id,
    }));
}

export function operationCommands(
  context: OptionContext & { readonly payoutPercent: number },
): GameCommand[] {
  const { catalog, rules } = businessEconomy(context.content);
  return context.state.businesses.flatMap((owned) => {
    const definition = catalog.find((entry) => entry.id === owned.definitionId);
    if (definition === undefined) return [];
    const businessId = owned.definitionId;
    const payout: GameCommand[] =
      owned.payoutPercent === context.payoutPercent
        ? []
        : [{ type: 'SetPayout', businessId, payoutPercent: context.payoutPercent }];
    if (context.management !== 'handsOn' || owned.status === 'closed') return payout;
    const pricing = { definition, rules };
    const priceLevel = bestPriceLevel(owned, pricing);
    const price: GameCommand[] =
      priceLevel === owned.priceLevel ? [] : [{ type: 'SetPriceLevel', businessId, priceLevel }];
    return [
      ...payout,
      ...locationCommand(owned, pricing),
      ...vendingCommands(owned, pricing),
      ...membershipCapCommand(owned, {
        pricing,
        seed: context.state.market.seed,
        atMs: context.state.clock.simulationMs,
      }),
      ...washCommands(owned, pricing),
      ...contractCommands(owned, { pricing, atMs: context.state.clock.simulationMs }),
      ...price,
    ];
  });
}

function membershipChoice(
  owned: OwnedBusiness,
  membershipLevel: (typeof PRICE_LEVELS)[number],
): OwnedBusiness {
  const { carWash } = owned;
  if (carWash.status !== 'active') return owned;
  return { ...owned, carWash: { ...carWash, membershipLevel } };
}
