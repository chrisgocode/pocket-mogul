import { z } from 'zod';

import { decodeActivityEntry, encodeActivityEntry } from '@/application/activitySchemas';
import { ACTIVITY_ENTRIES_KEPT, type ActivityEntry } from '@/domain/activity';

import type { SqlExecutor } from './sqlDriver';

export const CREATE_LEDGER_ENTRIES =
  'CREATE TABLE ledger_entries (sequence INTEGER PRIMARY KEY, entry TEXT NOT NULL)';

const entryRows = z.array(z.object({ entry: z.string() }));

export async function appendActivity(
  sql: SqlExecutor,
  entries: readonly ActivityEntry[],
): Promise<void> {
  await entries.reduce<Promise<void>>(
    (previous, entry) =>
      previous.then(() =>
        sql.run('INSERT OR REPLACE INTO ledger_entries (sequence, entry) VALUES (?, ?)', [
          entry.sequence,
          encodeActivityEntry(entry),
        ]),
      ),
    Promise.resolve(),
  );
  const newest = entries.at(-1)?.sequence ?? 0;
  await sql.run('DELETE FROM ledger_entries WHERE sequence <= ?', [newest - ACTIVITY_ENTRIES_KEPT]);
}

export async function loadActivity(sql: SqlExecutor): Promise<readonly ActivityEntry[]> {
  const rows = entryRows.parse(
    await sql.all('SELECT entry FROM ledger_entries ORDER BY sequence DESC LIMIT ?', [
      ACTIVITY_ENTRIES_KEPT,
    ]),
  );
  return rows.map((row) => decodeActivityEntry(row.entry));
}
