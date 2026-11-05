import type { Content } from '@/content';
import { moneyCents, type MoneyCents } from '@/domain/money';
import { tapPayoutCents } from '@/domain/tapping';
import { walletArtworkStage } from '@/domain/wallet';

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
  const perTapCents = tapPayoutCents(walletLevel, rules);
  return {
    cashCents: moneyCents(snapshot.state.cashCents + perTapCents * BigInt(snapshot.pendingTaps)),
    perTapCents,
    walletLevel,
    artworkStage: walletArtworkStage(walletLevel, rules.artworkLevels),
  };
}
