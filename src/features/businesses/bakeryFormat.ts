import type { AvailableCentralKitchen } from '@/application/bakeryView';

export type BakeryActions = {
  readonly setBakeLevel: (percent: number) => void;
  readonly answerOffer: (answer: { offerId: number; answer: 'accept' | 'decline' }) => void;
  readonly dismissCoachMark: () => void;
  readonly installCentralKitchen: (centralKitchen: AvailableCentralKitchen) => void;
};

export const daysLeftText = (days: number) => (days === 1 ? '1 day left' : `${days} days left`);
