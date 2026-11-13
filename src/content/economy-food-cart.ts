export const foodCartMechanic = {
  kind: 'food_cart',
  unlockStage: 2,
  crowdChanceBps: { quiet: 3000, steady: 4000, busy: 3000 },
  spots: {
    park: { quiet: 8000, steady: 10000, busy: 12500 },
    offices: { quiet: 9000, steady: 10500, busy: 11500 },
    campus: { quiet: 6500, steady: 10000, busy: 14500 },
    market: { quiet: 5000, steady: 10500, busy: 17000 },
    stadium: { quiet: 3000, steady: 9000, busy: 22000 },
  },
  forecastDays: 1,
  menu: {
    combo: { demandBps: 10000, priceBps: 12000, serviceBps: 8000 },
    snacks: { demandBps: 13000, priceBps: 9200, serviceBps: 10000 },
    express: { demandBps: 9000, priceBps: 10000, serviceBps: 12000 },
  },
  secondWindow: { stage: 5, priceMultiple: 150, capacityPercent: 30 },
} as const;
