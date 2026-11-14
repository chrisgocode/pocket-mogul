export const AD_REWARD_TAX_SOURCE = 'ad_rewards';
export const businessTaxSource = (id: string) => `business:${id}` as const;
export const propertyTaxBasis = (id: string) => `property:${id}` as const;
export const collectibleTaxBasis = (id: string) => `collectible:${id}` as const;
export const rentalTaxSource = (id: string) => `rental:${id}` as const;
export const instrumentTaxBasis = (id: string) =>
  id.startsWith('listing:')
    ? businessTaxSource(id.slice('listing:'.length))
    : (`position:${id}` as const);
