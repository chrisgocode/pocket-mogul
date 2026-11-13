export const laundromatMechanic = {
  kind: 'laundromat',
  unlockStage: 2,
  jumbo: {
    customerShareBps: 3000,
    speedBps: 7000,
    priceBps: 16000,
    sharePercents: [0, 20, 40, 60],
  },
  service: { loadsPercentPerLevel: 10, priceBpsByLevel: [15000, 12500, 10500] },
  pickup: { stage: 5, priceMultiple: 150, demandPercent: 25 },
};
