import type { Content } from '@/content';
import { findBusiness, type BusinessEconomy } from '@/domain/business/definition';
import type { OwnedBusiness } from '@/domain/business/owned';
import { quoteUnit } from '@/domain/business/core';
import { quoteStage } from '@/domain/business/stages';
import { formatMoneyExact } from '@/domain/money';
import { taxRestricted } from '@/domain/tax/collection';
import { selectBusinesses } from './businessesView';
import { stateWithUnsavedIncome } from './cashView';
import { businessEconomy } from './economy';
import type { GameSnapshot } from './game';
export type HomeGrowth = { title: string; detail: string } & (
  | { kind: 'business'; id: string }
  | { kind: 'catalog'; tier: number }
);
function businessGrowth(
  owned: OwnedBusiness,
  context: { content: Content; economy: BusinessEconomy; atMs: number },
): HomeGrowth | undefined {
  const definition = findBusiness(context.economy.catalog, owned.definitionId);
  const business = context.content.businesses.find((item) => item.id === owned.definitionId);
  if (definition === undefined || business === undefined || owned.status !== 'open')
    return undefined;
  const pricing = { definition, rules: context.economy.rules };
  const stage = quoteStage(owned, { pricing, atMs: context.atMs });
  if (stage.status === 'ready' && owned.treasuryCents >= stage.priceCents)
    return {
      kind: 'business',
      id: business.id,
      title: `Advance ${business.name}`,
      detail: `${formatMoneyExact(stage.priceCents)} treasury`,
    };
  const unit = quoteUnit(owned, pricing);
  if (unit.status === 'available' && owned.treasuryCents >= unit.priceCents)
    return {
      kind: 'business',
      id: business.id,
      title: `Grow ${business.name}`,
      detail: `${formatMoneyExact(unit.priceCents)} treasury`,
    };
  return undefined;
}
export function selectHomeGrowth(snapshot: GameSnapshot, content: Content): HomeGrowth | undefined {
  const state = stateWithUnsavedIncome(snapshot, content);
  if (taxRestricted(state.tax)) return undefined;
  const context = { content, economy: businessEconomy(content), atMs: state.clock.simulationMs };
  const growth = state.businesses
    .map((owned) => businessGrowth(owned, context))
    .find((candidate) => candidate !== undefined);
  if (growth !== undefined) return growth;
  const next = selectBusinesses({ ...snapshot, state, unsavedElapsedMs: 0 }, content)
    .tiers.flatMap((tier) => tier.offers)
    .find((offer) => offer.status === 'available');
  if (next === undefined) return undefined;
  return {
    kind: 'catalog',
    tier: next.business.tier,
    title: next.business.name,
    detail: next.affordable
      ? `${formatMoneyExact(next.business.price)} · Affordable`
      : `${formatMoneyExact(next.shortfallCents)} to go`,
  };
}
