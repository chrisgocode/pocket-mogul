import type { Content } from '@/content';
import { findBusiness, type BusinessEconomy } from '@/domain/business/definition';
import type { OwnedBusiness } from '@/domain/business/owned';
import { restockTotalCents } from '@/domain/business/vendingCommands';
import { runningVending } from '@/domain/business/vendingDemand';
import { formatMoneyExact, moneyCents } from '@/domain/money';
import { stateWithUnsavedIncome } from './cashView';
import { businessEconomy } from './economy';
import type { GameSnapshot } from './game';
import { selectTaxes } from './taxesView';
export type HomeAttention = { readonly title: string; readonly detail: string } & (
  | { readonly kind: 'business'; readonly id: string; readonly section: string }
  | { readonly kind: 'property'; readonly id: string }
  | { readonly kind: 'taxes' }
);
type BusinessContext = { content: Content; economy: BusinessEconomy };
function businessAttention(owned: OwnedBusiness, context: BusinessContext): HomeAttention[] {
  const business = context.content.businesses.find((item) => item.id === owned.definitionId);
  const definition = findBusiness(context.economy.catalog, owned.definitionId);
  if (business === undefined || definition === undefined) return [];
  if (owned.status === 'closed')
    return [
      {
        title: `Reopen ${business.name}`,
        detail: 'Deposit cash to Treasury',
        kind: 'business',
        id: business.id,
        section: 'treasury',
      },
    ];
  const running = runningVending(owned, { definition, rules: context.economy.rules });
  if (
    running === undefined ||
    !Object.values(running.operation.spots).some((spot) => spot.machines > 0 && spot.stock === 0)
  )
    return [];
  const price = moneyCents(restockTotalCents(running, 'all'));
  const affordable = owned.treasuryCents >= price;
  return [
    {
      title: `Restock ${business.name}`,
      detail: `${formatMoneyExact(price)} treasury${affordable ? '' : ' · deposit needed'}`,
      kind: 'business',
      id: business.id,
      section: affordable ? 'mechanic' : 'treasury',
    },
  ];
}
function taxAttention(snapshot: GameSnapshot, content: Content): HomeAttention[] {
  const tax = selectTaxes(snapshot, content);
  if (tax.oldest !== undefined)
    return [
      {
        title: 'File tax return',
        detail: `${formatMoneyExact(tax.oldest.amountCents)} tax`,
        kind: 'taxes',
      },
    ];
  return tax.debtCents > 0n
    ? [
        {
          title: 'Tax balance',
          detail: `${formatMoneyExact(tax.debtCents)} · ${tax.recoveryPercent} recovery`,
          kind: 'taxes',
        },
      ]
    : [];
}
export function selectHomeAttention(snapshot: GameSnapshot, content: Content): HomeAttention[] {
  const state = stateWithUnsavedIncome(snapshot, content);
  const context = { content, economy: businessEconomy(content) };
  const businesses = state.businesses.flatMap((owned) => businessAttention(owned, context));
  const properties = state.properties
    .filter((owned) => !owned.rented)
    .map((owned) => ({
      title: `Rent ${content.properties.find((property) => property.id === owned.definitionId)?.name ?? owned.definitionId}`,
      detail: 'Vacant',
      kind: 'property' as const,
      id: owned.definitionId,
    }));
  return [...businesses, ...taxAttention({ ...snapshot, state }, content), ...properties];
}
