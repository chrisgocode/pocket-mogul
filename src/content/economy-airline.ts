export const airlineMechanic = {
  kind: 'airline',
  unlockStage: 2,
  defaultNetwork: 'regional',
  routes: {
    short: { fareBps: 10000, seatsBps: 10000, burnBps: 10000 },
    medium: { fareBps: 15000, seatsBps: 7000, burnBps: 16000 },
    long: { fareBps: 24000, seatsBps: 4500, burnBps: 40000 },
  },
  networks: {
    regional: { short: 100, medium: 0, long: 0 },
    mixed: { short: 50, medium: 35, long: 15 },
    intercontinental: { short: 20, medium: 35, long: 45 },
  },
  fuelChanceBps: { cheap: 2500, normal: 5000, expensive: 2500 },
  fuelCostBps: { cheap: 5000, normal: 10000, expensive: 18000 },
  forecastDays: 2,
  repositionCapacityBps: 7000,
  hub: { stage: 5, priceMultiple: 150, capacityPercent: 15 },
} as const;
