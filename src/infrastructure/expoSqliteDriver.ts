import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { SqlDriver, SqlExecutor } from './sqlDriver';

function executorFor(connection: SQLiteDatabase): SqlExecutor {
  return {
    run: async (sql, params = []) => {
      await connection.runAsync(sql, [...params]);
    },
    first: (sql, params = []) => connection.getFirstAsync<unknown>(sql, [...params]),
  };
}

export async function openExpoSqliteDriver(databaseName: string): Promise<SqlDriver> {
  const database = await openDatabaseAsync(databaseName);
  await database.execAsync('PRAGMA journal_mode = WAL');
  return {
    async exclusive(work) {
      const results: { value: Awaited<ReturnType<typeof work>> }[] = [];
      await database.withExclusiveTransactionAsync(async (transaction) => {
        results.push({ value: await work(executorFor(transaction)) });
      });
      const [result] = results;
      if (result === undefined) throw new Error('The save transaction ended without a result');
      return result.value;
    },
  };
}
