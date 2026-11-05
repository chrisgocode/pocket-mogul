export type SqlValue = string | number | null;

export type SqlExecutor = {
  run: (sql: string, params?: readonly SqlValue[]) => Promise<void>;
  first: (sql: string, params?: readonly SqlValue[]) => Promise<unknown>;
};

export type SqlDriver = {
  exclusive<T>(work: (sql: SqlExecutor) => Promise<T>): Promise<T>;
};
