export const ownership = {
  reference: {
    store: 'apple',
    appId: 'test.app',
    environment: 'sandbox',
    purchaseId: 'transaction-1',
    productId: 'test-exemption',
  },
  productClass: 'nonConsumable',
  verification: { source: 'store', verifiedAtMs: 1_800_000_000_000 },
  completion: { owner: 'application', action: 'finish' },
} as const;
export const purchasePolicy = {
  scopes: [{ store: 'apple', appId: 'test.app', environment: 'sandbox' }],
  products: [
    { productId: 'test-exemption', productClass: 'nonConsumable', benefit: 'taxExemption' },
  ],
} as const;
