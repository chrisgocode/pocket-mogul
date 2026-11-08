import type { Content } from '@/content';
import { formatMoneyExact } from '@/domain/money';
import { selectBusinessDetail, type OwnedBusinessDetail } from './businessDetailView';
import type { GameSnapshot } from './game';
import { selectProperties } from './propertiesView';
import { selectTaxes } from './taxesView';
export type HomeAttention = { readonly title: string; readonly detail: string } & (
  | { readonly kind: 'business'; readonly id: string; readonly section: string }
  | { readonly kind: 'property'; readonly id: string }
  | { readonly kind: 'taxes' }
);
function businessAttention(detail: OwnedBusinessDetail): HomeAttention[] {
  const { business } = detail;
  if (detail.operation === 'closed')
    return [
      {
        title: `Reopen ${business.name}`,
        detail: 'Deposit cash to Treasury',
        kind: 'business',
        id: business.id,
        section: 'treasury',
      },
    ];
  const vending = detail.vending;
  if (
    vending?.status !== 'active' ||
    !vending.spots.some((spot) => spot.machines > 0 && spot.stock === 0)
  )
    return [];
  const restock = vending.restockAll;
  return [
    {
      title: `Restock ${business.name}`,
      detail: `${formatMoneyExact(restock.priceCents)} treasury${restock.affordable ? '' : ' · deposit needed'}`,
      kind: 'business',
      id: business.id,
      section: restock.affordable ? 'mechanic' : 'treasury',
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
  const businesses = snapshot.state.businesses.flatMap((owned) => {
    const detail = selectBusinessDetail(snapshot, { businessId: owned.definitionId, content });
    return detail.status === 'owned' ? businessAttention(detail) : [];
  });
  const properties = selectProperties(snapshot, content)
    .listings.filter((listing) => listing.status === 'vacant')
    .map((listing) => ({
      title: `Rent ${listing.property.name}`,
      detail: 'Vacant',
      kind: 'property' as const,
      id: listing.property.id,
    }));
  return [...businesses, ...taxAttention(snapshot, content), ...properties];
}
