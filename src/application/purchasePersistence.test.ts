import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nodeSqliteDriver } from '@/infrastructure/nodeSqliteDriver';
import { openSqlSaveStore } from '@/infrastructure/sqlSaveStore';
import { freshGameState } from '@/domain/gameState';
import type { PurchaseRecord } from './purchaseLedger';

const record: PurchaseRecord = {
  ownership: {
    reference: {
      store: 'google',
      appId: 'test.app',
      environment: 'sandbox',
      purchaseId: 'purchase-token',
      productId: 'test-exemption',
    },
    productClass: 'nonConsumable',
    verification: { source: 'store', verifiedAtMs: 123 },
    completion: { owner: 'application', action: 'finish' },
  },
  entitlements: ['taxExemption'],
  result: { status: 'delivered' },
  completion: 'pending',
};

const managedRecord: PurchaseRecord = {
  ...record,
  ownership: {
    ...record.ownership,
    verification: { source: 'provider', verifiedAtMs: 123 },
    completion: { owner: 'provider' },
  },
  completion: 'completed',
};

it.each([record, managedRecord])(
  'keeps purchase receipt %# through migration, physical reopen and command pruning',
  async (savedRecord) => {
    const directory = mkdtempSync(join(tmpdir(), 'mogul-purchases-'));
    const path = join(directory, 'save.sqlite');
    const database = new DatabaseSync(path);
    try {
      const existing = await openSqlSaveStore(nodeSqliteDriver(database));
      await existing.transact((tx) =>
        tx.writeState(freshGameState({ saveId: 'existing', economyVersion: 2, wallMs: 123 })),
      );
      database.exec('DROP TABLE purchase_receipts');
      database.exec('DROP TABLE purchase_identity');
      database.exec('DELETE FROM schema_migrations WHERE version >= 6');
      const migrated = await openSqlSaveStore(nodeSqliteDriver(database));
      expect(await migrated.transact((tx) => tx.readPurchases())).toEqual([]);
      expect(await migrated.transact((tx) => tx.readPurchaseIdentity())).toBeUndefined();
      expect(await migrated.transact((tx) => tx.readSave())).toContain('existing');
      await migrated.transact(async (tx) => {
        await tx.writePurchaseIdentity({
          id: 'independent-identity',
          providerReference: 'provider-customer',
          checkout: { status: 'pending', productId: 'test-exemption' },
        });
        await tx.writePurchase(savedRecord);
      });
      database.close();
      const reopenedDatabase = new DatabaseSync(path);
      try {
        const reopened = await openSqlSaveStore(nodeSqliteDriver(reopenedDatabase));
        await reopened.transact((tx) => tx.pruneReceipts(999_999));
        expect(await reopened.transact((tx) => tx.readPurchases())).toEqual([savedRecord]);
        expect(await reopened.transact((tx) => tx.readPurchaseIdentity())).toEqual({
          id: 'independent-identity',
          providerReference: 'provider-customer',
          checkout: { status: 'pending', productId: 'test-exemption' },
        });
      } finally {
        reopenedDatabase.close();
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
);

it.each([record, managedRecord])(
  'rolls back the saved Game and purchase receipt %# when a transaction aborts',
  async (savedRecord) => {
    const database = new DatabaseSync(':memory:');
    const store = await openSqlSaveStore(nodeSqliteDriver(database));
    const before = freshGameState({ saveId: 'before', economyVersion: 2, wallMs: 123 });
    await store.transact((tx) => tx.writeState(before));
    const document = await store.transact((tx) => tx.readSave());
    await expect(
      store.transact(async (tx) => {
        await tx.writeState({ ...before, saveId: 'after' });
        await tx.writePurchase(savedRecord);
        throw new Error('interrupted commit');
      }),
    ).rejects.toThrow('interrupted commit');
    expect(await store.transact((tx) => tx.readSave())).toBe(document);
    expect(await store.transact((tx) => tx.readPurchases())).toEqual([]);
    database.close();
  },
);
it('opens legacy purchase documents and retains additive removal evidence through physical reopen', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'mogul-removal-'));
  const path = join(directory, 'save.sqlite');
  const database = new DatabaseSync(path);
  try {
    const store = await openSqlSaveStore(nodeSqliteDriver(database));
    await store.transact((tx) => tx.writePurchase(record));
    expect(await store.transact((tx) => tx.readPurchases())).toEqual([record]);
    const removed = {
      ...record,
      currentOwnership: { status: 'removed', observedAtMs: 456, revokedAtMs: 123 },
    } as const;
    await store.transact((tx) => tx.writePurchase(removed));
    database.close();
    const reopenedDatabase = new DatabaseSync(path);
    try {
      const reopened = await openSqlSaveStore(nodeSqliteDriver(reopenedDatabase));
      expect(await reopened.transact((tx) => tx.readPurchases())).toEqual([removed]);
    } finally {
      reopenedDatabase.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
