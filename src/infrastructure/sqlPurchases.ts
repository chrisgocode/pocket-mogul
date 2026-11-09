import { z } from 'zod';
import type { SaveTransaction } from '@/application/ports';
import { purchaseKey } from '@/application/purchaseLedger';
import type { SqlExecutor } from './sqlDriver';

export const CREATE_PURCHASES =
  'CREATE TABLE purchase_receipts (purchase_key TEXT PRIMARY KEY, document TEXT NOT NULL)';

const purchaseRecord = z.object({
  ownership: z.object({
    reference: z.object({
      store: z.enum(['apple', 'google']),
      appId: z.string(),
      environment: z.enum(['sandbox', 'production']),
      purchaseId: z.string(),
      productId: z.string(),
    }),
    productClass: z.enum(['nonConsumable', 'consumable', 'subscription']),
    verification: z.object({ source: z.enum(['store', 'provider']), verifiedAtMs: z.number() }),
    completion: z.union([
      z.object({ owner: z.literal('provider') }),
      z.object({ owner: z.literal('application'), action: z.enum(['finish', 'consume']) }),
    ]),
  }),
  benefit: z.literal('taxExemption'),
  result: z.object({ status: z.literal('delivered') }),
  completion: z.enum(['pending', 'completed']),
});
const rows = z.array(z.object({ document: z.string() }));

export function purchasesOver(
  sql: SqlExecutor,
): Pick<SaveTransaction, 'readPurchases' | 'writePurchase'> {
  return {
    readPurchases: async () =>
      rows
        .parse(await sql.all('SELECT document FROM purchase_receipts ORDER BY purchase_key'))
        .map((row) => purchaseRecord.parse(JSON.parse(row.document))),
    writePurchase: (record) =>
      sql.run(
        'INSERT INTO purchase_receipts (purchase_key, document) VALUES (?, ?) ON CONFLICT (purchase_key) DO UPDATE SET document = excluded.document',
        [purchaseKey(record.ownership.reference), JSON.stringify(record)],
      ),
  };
}
