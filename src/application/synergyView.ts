import type { Content } from '@/content';
import type { OwnedBusiness } from '@/domain/business/owned';
import type { SynergyEffect } from '@/domain/business/synergyRules';

export type SynergyStatus = 'active' | 'starting' | 'ending' | 'locked';

export type SynergyView = {
  readonly id: string;
  readonly name: string;
  readonly note: string;
  readonly partnerName: string;
  readonly effect: SynergyEffect;
  readonly percent: number;
  readonly status: SynergyStatus;
};

type Holding = { readonly content: Content; readonly ownedIds: readonly string[] };

const STATUSES: Readonly<Record<'running' | 'idle', Record<'held' | 'missing', SynergyStatus>>> = {
  running: { held: 'active', missing: 'ending' },
  idle: { held: 'starting', missing: 'locked' },
};

export function selectSynergies(owned: OwnedBusiness, holding: Holding): SynergyView[] {
  const { content, ownedIds } = holding;
  return content.synergies.links
    .filter((link) => link.businessId === owned.definitionId)
    .map((link) => ({
      id: link.id,
      name: link.name,
      note: link.note,
      partnerName:
        content.businesses.find((business) => business.id === link.partnerId)?.name ??
        link.partnerId,
      effect: link.effect,
      percent: link.percent,
      status:
        STATUSES[owned.synergies.includes(link.id) ? 'running' : 'idle'][
          ownedIds.includes(link.partnerId) ? 'held' : 'missing'
        ],
    }));
}
