import type { SqlDriver, SqlExecutor } from '@/infrastructure/sqlDriver';
import { deferred } from './testDeferred';

type HeldResponse = {
  matching: RegExp;
  committed: ReturnType<typeof deferred>;
  response: ReturnType<typeof deferred>;
};

export function transactionResponses(driver: SqlDriver) {
  let held: HeldResponse | undefined;
  const wrapped: SqlDriver = {
    exclusive: async (work) => {
      const statements: string[] = [];
      const result = await driver.exclusive((sql) => work(observedSql(sql, statements)));
      const pending = held;
      if (
        pending !== undefined &&
        statements.some((statement) => pending.matching.test(statement))
      ) {
        held = undefined;
        pending.committed.resolve();
        await pending.response.promise;
      }
      return result;
    },
  };
  return {
    driver: wrapped,
    hold: (matching: RegExp) => {
      const pending = { matching, committed: deferred(), response: deferred() };
      held = pending;
      return { committed: pending.committed.promise, release: pending.response.resolve };
    },
  };
}

function observedSql(sql: SqlExecutor, statements: string[]): SqlExecutor {
  return {
    run: (statement, params) => {
      statements.push(statement);
      return sql.run(statement, params);
    },
    first: (statement, params) => {
      statements.push(statement);
      return sql.first(statement, params);
    },
    all: (statement, params) => {
      statements.push(statement);
      return sql.all(statement, params);
    },
  };
}
