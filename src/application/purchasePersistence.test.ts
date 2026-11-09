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
  benefit: 'taxExemption',
  result: { status: 'delivered' },
  completion: 'pending',
};

it('migrates an existing database and keeps purchase receipts and completion work through physical reopen and command pruning', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'mogul-purchases-'));
  const path = join(directory, 'save.sqlite');
  const database = new DatabaseSync(path);
  try {
    const existing = await openSqlSaveStore(nodeSqliteDriver(database));
    await existing.transact((tx) =>
      tx.writeState(freshGameState({ saveId: 'existing', economyVersion: 2, wallMs: 123 })),
    );
    database.exec('DROP TABLE purchase_receipts');
    database.exec('DELETE FROM schema_migrations WHERE version = 6');
    const migrated = await openSqlSaveStore(nodeSqliteDriver(database));
    expect(await migrated.transact((tx) => tx.readPurchases())).toEqual([]);
    expect(await migrated.transact((tx) => tx.readSave())).toContain('existing');
    await migrated.transact((tx) => tx.writePurchase(record));
    database.close();
    const reopenedDatabase = new DatabaseSync(path);
    try {
      const reopened = await openSqlSaveStore(nodeSqliteDriver(reopenedDatabase));
      await reopened.transact((tx) => tx.pruneReceipts(999_999));
      expect(await reopened.transact((tx) => tx.readPurchases())).toEqual([record]);
    } finally {
      reopenedDatabase.close();
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it('rolls back both the saved Game and purchase completion work when a transaction aborts', async () => {
  const database = new DatabaseSync(':memory:');
  const store = await openSqlSaveStore(nodeSqliteDriver(database));
  const before = freshGameState({ saveId: 'before', economyVersion: 2, wallMs: 123 });
  await store.transact((tx) => tx.writeState(before));
  const document = await store.transact((tx) => tx.readSave());
  await expect(
    store.transact(async (tx) => {
      await tx.writeState({ ...before, saveId: 'after' });
      await tx.writePurchase(record);
      throw new Error('interrupted commit');
    }),
  ).rejects.toThrow('interrupted commit');
  expect(await store.transact((tx) => tx.readSave())).toBe(document);
  expect(await store.transact((tx) => tx.readPurchases())).toEqual([]);
  database.close();
});
