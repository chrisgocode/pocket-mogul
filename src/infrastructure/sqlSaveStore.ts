import { z } from 'zod';

import type { SaveStore, SaveTransaction } from '@/application/ports';
import { decodeOutcome, decodeSave, encodeOutcome, encodeSave } from '@/application/saveFormat';

import { appendMarketHistory, CREATE_MARKET_HISTORY, loadAssetHistory } from './sqlMarketHistory';
import type { SqlDriver, SqlExecutor } from './sqlDriver';

const MIGRATIONS: readonly (readonly string[])[] = [
  [
    'CREATE TABLE save_state (id INTEGER PRIMARY KEY CHECK (id = 1), document TEXT NOT NULL)',
    'CREATE TABLE command_receipts (command_id TEXT PRIMARY KEY, outcome TEXT NOT NULL, recorded_wall_ms INTEGER NOT NULL)',
  ],
  [
    'CREATE TABLE diagnostics (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, detail TEXT NOT NULL, recorded_wall_ms INTEGER NOT NULL)',
  ],
  [CREATE_MARKET_HISTORY],
];

const versionRow = z.object({ version: z.number().int().nullable() });
const documentRow = z.object({ document: z.string() });
const outcomeRow = z.object({ outcome: z.string() });
const diagnosticDetail = z.object({ checkpointWallMs: z.number(), observedWallMs: z.number() });
const diagnosticRows = z.array(
  z
    .object({
      type: z.literal('BACKWARD_WALL_CLOCK'),
      detail: z.string(),
      recorded_wall_ms: z.number(),
    })
    .transform((row) => ({
      ...diagnosticDetail.parse(JSON.parse(row.detail)),
      type: row.type,
      recordedWallMs: row.recorded_wall_ms,
    })),
);

const isMissing = (row: unknown) => row === undefined || row === null;

function inOrder(steps: readonly (() => Promise<void>)[]): Promise<void> {
  return steps.reduce<Promise<void>>((previous, step) => previous.then(step), Promise.resolve());
}

async function migrate(sql: SqlExecutor): Promise<void> {
  await sql.run('CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY)');
  const { version } = versionRow.parse(
    await sql.first('SELECT MAX(version) AS version FROM schema_migrations'),
  );
  const applied = version ?? 0;
  const pending = MIGRATIONS.map((statements, index) => ({
    statements,
    version: index + 1,
  })).filter((migration) => migration.version > applied);
  await inOrder(
    pending.flatMap((migration) =>
      migration.statements
        .map((statement) => () => sql.run(statement))
        .concat(() =>
          sql.run('INSERT INTO schema_migrations (version) VALUES (?)', [migration.version]),
        ),
    ),
  );
}

function transactionOver(sql: SqlExecutor): SaveTransaction {
  return {
    async findOutcome(commandId) {
      const row = await sql.first('SELECT outcome FROM command_receipts WHERE command_id = ?', [
        commandId,
      ]);
      return isMissing(row) ? undefined : decodeOutcome(outcomeRow.parse(row).outcome);
    },
    writeReceipt: (receipt) =>
      sql.run(
        'INSERT INTO command_receipts (command_id, outcome, recorded_wall_ms) VALUES (?, ?, ?)',
        [receipt.commandId, encodeOutcome(receipt.outcome), receipt.recordedWallMs],
      ),
    writeDiagnostic: ({ type, recordedWallMs, ...detail }) =>
      sql.run('INSERT INTO diagnostics (type, detail, recorded_wall_ms) VALUES (?, ?, ?)', [
        type,
        JSON.stringify(detail),
        recordedWallMs,
      ]),
    appendMarketHistory: (history) => appendMarketHistory(sql, history),
    writeState: (state) =>
      sql.run(
        'INSERT INTO save_state (id, document) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET document = excluded.document',
        [encodeSave(state)],
      ),
  };
}

export async function openSqlSaveStore(driver: SqlDriver): Promise<SaveStore> {
  await driver.exclusive(migrate);
  return {
    load: () =>
      driver.exclusive(async (sql) => {
        const row = await sql.first('SELECT document FROM save_state WHERE id = 1');
        return isMissing(row) ? undefined : decodeSave(documentRow.parse(row).document);
      }),
    loadAssetHistory: (assetId) => driver.exclusive((sql) => loadAssetHistory(sql, assetId)),
    loadDiagnostics: () =>
      driver.exclusive(async (sql) =>
        diagnosticRows.parse(
          await sql.all('SELECT type, detail, recorded_wall_ms FROM diagnostics ORDER BY id'),
        ),
      ),
    transact: (work) => driver.exclusive((sql) => work(transactionOver(sql))),
  };
}
