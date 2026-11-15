import type { Content } from '@/content';
import type { MoneyCents } from '@/domain/money';
import { boostedTapCents, tapPayoutCents } from '@/domain/tapping';
import { walletArtworkStage } from '@/domain/wallet';

import { selectCashCents } from './cashView';
import { tapBonusPercent } from './collectionSetsView';
import type { GameSnapshot } from './game';
import { tapMultiplier, walletSkin, type WalletSkin } from './purchaseEffects';
import { isTapBoosted } from './tapBoostView';

export type TapCardView = {
  readonly cashCents: MoneyCents;
  readonly perTapCents: MoneyCents;
  readonly boosted: boolean;
  readonly walletLevel: number;
  readonly artworkStage: number;
  readonly skin: WalletSkin;
  readonly perks: TapPerks;
};

export type TapPerks = { readonly multiplier: number; readonly bonusPercent: number };

export function selectTapCard(snapshot: GameSnapshot, content: Content): TapCardView {
  const { walletLevel } = snapshot.state.tap;
  const rules = content.economy.tap;
  const boosted = isTapBoosted(snapshot);
  const bonusPercent = tapBonusPercent(snapshot.state, content);
  return {
    cashCents: selectCashCents(snapshot, content),
    perTapCents: boostedTapCents(tapPayoutCents(walletLevel, rules), {
      multiplier: tapMultiplier(snapshot.state, { content, boosted }),
      bonusPercent,
    }),
    boosted,
    walletLevel,
    artworkStage: walletArtworkStage(walletLevel, rules.artworkLevels),
    skin: walletSkin(snapshot.state),
    perks: {
      multiplier: tapMultiplier(snapshot.state, { content, boosted: false }),
      bonusPercent,
    },
  };
}
