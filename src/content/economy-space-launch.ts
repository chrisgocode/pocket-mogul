export const spaceMechanic = {
  kind: 'space',
  unlockStage: 2,
  defaultCadence: 'standard',
  weatherChanceBps: { clear: 6500, windy: 2500, storm: 1000 },
  forecastDays: 2,
  cadences: {
    careful: { capacityBps: 8500, launchedBps: { clear: 10000, windy: 10000, storm: 7500 } },
    standard: { capacityBps: 10000, launchedBps: { clear: 10000, windy: 8500, storm: 5000 } },
    rapid: { capacityBps: 12500, launchedBps: { clear: 10000, windy: 6000, storm: 2000 } },
  },
  payloads: {
    offerDays: 4,
    maxContracts: 2,
    clients: [
      { id: 'meridian_weather', name: 'Meridian Weather Service' },
      { id: 'polar_relay', name: 'Polar Relay Networks' },
      { id: 'deepfield_observatory', name: 'Deepfield Observatory' },
      { id: 'tidewater_mapping', name: 'Tidewater Mapping' },
      { id: 'halcyon_broadcast', name: 'Halcyon Broadcast' },
    ],
    sizePercents: [20, 30, 40],
    rateBps: { min: 11000, max: 15000 },
    penaltyBps: 10000,
    days: { min: 4, max: 8 },
  },
  boosters: { stage: 5, priceMultiple: 150, capacityPercent: 50 },
};
