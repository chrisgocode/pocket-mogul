import type { DatabaseSync } from 'node:sqlite';

import type { SqlDriver, SqlExecutor } from './sqlDriver';

export function nodeSqliteDriver(database: DatabaseSync): SqlDriver {
  const executor: SqlExecutor = {
    run: (sql, params = []) => {
      database.prepare(sql).run(...params);
      return Promise.resolve();
    },
    first: (sql, params = []) => Promise.resolve(database.prepare(sql).get(...params)),
  };
  return {
    async exclusive(work) {
      database.exec('BEGIN EXCLUSIVE');
      try {
        const result = await work(executor);
        database.exec('COMMIT');
        return result;
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    },
  };
}
