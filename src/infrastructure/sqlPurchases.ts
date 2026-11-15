import { z } from 'zod';
import type { SaveTransaction } from '@/application/ports';
import { purchaseKey } from '@/application/purchaseLedger';
import { ENTITLEMENTS } from '@/domain/entitlements';
import type { SqlExecutor } from './sqlDriver';

export const CREATE_PURCHASE_IDENTITY =
  'CREATE TABLE purchase_identity (id INTEGER PRIMARY KEY CHECK (id = 1), document TEXT NOT NULL)';

export const CREATE_PURCHASES =
  'CREATE TABLE purchase_receipts (purchase_key TEXT PRIMARY KEY, document TEXT NOT NULL)';

const savedRecord = z.object({
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
  benefit: z.literal('taxExemption').optional(),
  entitlements: z.array(z.enum(ENTITLEMENTS)).optional(),
  result: z.object({ status: z.literal('delivered') }),
  completion: z.enum(['pending', 'completed']),
  currentOwnership: z
    .discriminatedUnion('status', [
      z.object({ status: z.literal('active'), observedAtMs: z.number() }),
      z.object({
        status: z.literal('removed'),
        observedAtMs: z.number(),
        revokedAtMs: z.number().optional(),
      }),
    ])
    .optional(),
});
const LEGACY_ENTITLEMENTS = ['taxExemption'] as const;

const purchaseRecord = savedRecord.transform((saved) => ({
  ownership: saved.ownership,
  entitlements: saved.entitlements ?? LEGACY_ENTITLEMENTS,
  result: saved.result,
  completion: saved.completion,
  ...(saved.currentOwnership === undefined ? {} : { currentOwnership: saved.currentOwnership }),
}));

const identity = z.object({
  id: z.string(),
  providerReference: z.string().optional(),
  checkout: z
    .object({
      status: z.enum(['pending', 'interrupted', 'delivered']),
      productId: z.string(),
    })
    .optional(),
});

const rows = z.array(z.object({ document: z.string() }));

export function purchasesOver(
  sql: SqlExecutor,
): Pick<
  SaveTransaction,
  'readPurchases' | 'writePurchase' | 'readPurchaseIdentity' | 'writePurchaseIdentity'
> {
  return {
    readPurchaseIdentity: async () => {
      const saved = rows.parse(await sql.all('SELECT document FROM purchase_identity'));
      const row = saved.at(0);
      return row === undefined ? undefined : identity.parse(JSON.parse(row.document));
    },
    writePurchaseIdentity: (value) =>
      sql.run(
        'INSERT INTO purchase_identity (id, document) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET document = excluded.document',
        [JSON.stringify(value)],
      ),
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
