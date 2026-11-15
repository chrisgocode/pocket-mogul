import type { Content } from '@/content';

import { selectBusinessDetail, type OwnedBusinessDetail } from './businessDetailView';
import type { GameSnapshot } from './game';

export type BusinessTileView = {
  readonly stage: number;
  readonly notice: 'none' | 'upgrade' | 'closed';
};

function canGrow(detail: OwnedBusinessDetail): boolean {
  return [detail.stageUpgrade, detail.unit, ...detail.improvements].some(
    (option) => 'affordable' in option && option.affordable,
  );
}

export function selectBusinessTile(
  snapshot: GameSnapshot,
  request: { businessId: string; content: Content },
): BusinessTileView {
  const detail = selectBusinessDetail(snapshot, request);
  if (detail.status !== 'owned') return { stage: 0, notice: 'none' };
  if (detail.operation === 'closed') return { stage: detail.stage, notice: 'closed' };
  return { stage: detail.stage, notice: canGrow(detail) ? 'upgrade' : 'none' };
}
