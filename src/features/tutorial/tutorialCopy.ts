import type { TutorialStep } from '@/domain/tutorial';

export const TUTORIAL_COPY: Readonly<Record<TutorialStep, { title: string; message: string }>> = {
  tap: {
    title: 'Tap your wallet',
    message: 'Tap the wallet card below. Every tap pays cash straight into your balance.',
  },
  upgradeWallet: {
    title: 'Upgrade your wallet',
    message: 'Save up and upgrade your wallet so every tap pays more.',
  },
  buyBusiness: {
    title: 'Buy your first business',
    message:
      'Businesses earn cash every minute, even while you are away. Buy one in the Businesses tab.',
  },
};
