import type { CatalogueProduct } from './purchaseLedger';

export const PURCHASE_CATALOGUE: readonly CatalogueProduct[] = [
  { productId: 'pm_tax_exemption', entitlements: ['taxExemption'] },
  { productId: 'pm_remove_ads', entitlements: ['removeAds'] },
  { productId: 'pm_vip_pass', entitlements: ['vipPass', 'removeAds'] },
];
