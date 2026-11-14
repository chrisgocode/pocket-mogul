import type { CatalogueProduct } from './purchaseLedger';

export const PURCHASE_CATALOGUE: readonly CatalogueProduct[] = [
  {
    productId: 'pm_mogul_bundle',
    entitlements: ['taxExemption', 'vipPass', 'removeAds', 'goldenWallet', 'nightManager'],
  },
  { productId: 'pm_tax_exemption', entitlements: ['taxExemption'] },
  { productId: 'pm_remove_ads', entitlements: ['removeAds'] },
  { productId: 'pm_vip_pass', entitlements: ['vipPass', 'removeAds'] },
  { productId: 'pm_golden_wallet', entitlements: ['goldenWallet'] },
  { productId: 'pm_night_manager', entitlements: ['nightManager'] },
  { productId: 'pm_founder', entitlements: ['founder'] },
];
