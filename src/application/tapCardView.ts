import type { Content } from '@/content';
import type { MoneyCents } from '@/domain/money';
import { tapPayoutCents } from '@/domain/tapping';
import { walletArtworkStage } from '@/domain/wallet';

import { selectCashCents } from './cashView';
import type { GameSnapshot } from './game';

export type TapCardView = {
  readonly cashCents: MoneyCents;
  readonly perTapCents: MoneyCents;
  readonly walletLevel: number;
  readonly artworkStage: number;
};

export function selectTapCard(snapshot: GameSnapshot, content: Content): TapCardView {
  const { walletLevel } = snapshot.state.tap;
  const rules = content.economy.tap;
  return {
    cashCents: selectCashCents(snapshot, content),
    perTapCents: tapPayoutCents(walletLevel, rules),
    walletLevel,
    artworkStage: walletArtworkStage(walletLevel, rules.artworkLevels),
  };
}
