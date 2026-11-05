import { walletArt } from '@/ui/tokens';

export type WalletArtwork = { readonly name: string; readonly color: string };

const STARTER: WalletArtwork = { name: 'Starter wallet', color: walletArt.starter };

const ARTWORK_BY_STAGE: readonly WalletArtwork[] = [
  STARTER,
  { name: 'Leather wallet', color: walletArt.leather },
  { name: 'Silver card', color: walletArt.silver },
  { name: 'Gold card', color: walletArt.gold },
  { name: 'Obsidian card', color: walletArt.obsidian },
];

export function walletArtwork(stage: number): WalletArtwork {
  return ARTWORK_BY_STAGE[Math.min(stage, ARTWORK_BY_STAGE.length - 1)] ?? STARTER;
}
