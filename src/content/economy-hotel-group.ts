export const hotelMechanic = {
  kind: 'hotel',
  unlockStage: 2,
  seasonDays: 3,
  forecastSeasons: 2,
  seasonChanceBps: { low: 3000, shoulder: 3500, high: 2500, event: 1000 },
  seasonDemandBps: { low: 6500, shoulder: 10000, high: 13500, event: 18000 },
  stars: { max: 5, qualityPerStar: 5, unitsPerHousekeeper: 4, priceBpsPerStar: 400 },
  conference: { stage: 5, priceMultiple: 150, eventDemandPercent: 50 },
} as const;
