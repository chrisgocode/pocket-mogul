export const factoryMechanic = {
  kind: 'factory',
  unlockStage: 2,
  defaultProduct: 'standard',
  retoolDays: 1,
  retoolCapacityBps: 5000,
  products: {
    standard: { priceBps: 10000, demandBps: 10000, costBps: 10000 },
    precision: { priceBps: 12500, demandBps: 7000, costBps: 12000 },
    custom: { priceBps: 16000, demandBps: 4500, costBps: 14000 },
  },
  bulk: {
    offerDays: 3,
    maxOrders: 2,
    clients: [
      { id: 'northfield_rail', name: 'Northfield Rail' },
      { id: 'harborline_shipyards', name: 'Harborline Shipyards' },
      { id: 'brightwell_appliances', name: 'Brightwell Appliances' },
      { id: 'summit_tools', name: 'Summit Tool Works' },
      { id: 'redwood_motors', name: 'Redwood Motor Works' },
    ],
    sizePercents: [20, 30, 40],
    rateBps: { min: 10500, max: 13000 },
    penaltyBps: 5000,
    days: { min: 5, max: 10 },
  },
  automation: { stage: 5, priceMultiple: 150, costSavingPercent: 20 },
};
