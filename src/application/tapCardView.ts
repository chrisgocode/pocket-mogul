import type { Content } from '@/content';
import type { MoneyCents } from '@/domain/money';
import { boostedTapCents, tapPayoutCents } from '@/domain/tapping';
import { walletArtworkStage } from '@/domain/wallet';

import { selectCashCents } from './cashView';
import { tapBonusPercent } from './collectionSetsView';
import type { GameSnapshot } from './game';
import { isTapBoosted } from './tapBoostView';

export type TapCardView = {
  readonly cashCents: MoneyCents;
  readonly perTapCents: MoneyCents;
  readonly boosted: boolean;
  readonly walletLevel: number;
  readonly artworkStage: number;
};

export function selectTapCard(snapshot: GameSnapshot, content: Content): TapCardView {
  const { walletLevel } = snapshot.state.tap;
  const rules = content.economy.tap;
  const boosted = isTapBoosted(snapshot);
  const multiplier = boosted ? content.economy.boost.tapMultiplier : 1;
  return {
    cashCents: selectCashCents(snapshot, content),
    perTapCents: boostedTapCents(tapPayoutCents(walletLevel, rules), {
      multiplier,
      bonusPercent: tapBonusPercent(snapshot.state, content),
    }),
    boosted,
    walletLevel,
    artworkStage: walletArtworkStage(walletLevel, rules.artworkLevels),
  };
}
