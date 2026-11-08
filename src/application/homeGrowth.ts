import type { Content } from '@/content';
import { formatMoneyExact } from '@/domain/money';
import { taxRestricted } from '@/domain/tax/collection';
import { selectBusinessDetail, type BusinessDetailView } from './businessDetailView';
import { selectBusinesses } from './businessesView';
import type { GameSnapshot } from './game';
export type HomeGrowth = { title: string; detail: string } & (
  | { kind: 'business'; id: string }
  | { kind: 'catalog'; tier: number }
);
function businessGrowth(detail: BusinessDetailView): HomeGrowth | undefined {
  if (detail.status !== 'owned' || detail.operation !== 'open') return undefined;
  const stage = detail.stageUpgrade;
  if (stage.status === 'ready' && stage.affordable)
    return {
      kind: 'business',
      id: detail.business.id,
      title: `Advance ${detail.business.name}`,
      detail: `${formatMoneyExact(stage.priceCents)} treasury`,
    };
  if (detail.unit.status === 'available' && detail.unit.affordable)
    return {
      kind: 'business',
      id: detail.business.id,
      title: `Grow ${detail.business.name}`,
      detail: `${formatMoneyExact(detail.unit.priceCents)} treasury`,
    };
  return undefined;
}
export function selectHomeGrowth(snapshot: GameSnapshot, content: Content): HomeGrowth | undefined {
  if (taxRestricted(snapshot.state.tax)) return undefined;
  const growth = snapshot.state.businesses
    .map((owned) => selectBusinessDetail(snapshot, { businessId: owned.definitionId, content }))
    .map(businessGrowth)
    .find((candidate) => candidate !== undefined);
  if (growth !== undefined) return growth;
  const next = selectBusinesses(snapshot, content)
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
