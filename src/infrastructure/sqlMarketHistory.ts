import { z } from 'zod';

import type { AssetHistory } from '@/application/ports';
import type { MarketHistory, Ohlc } from '@/domain/market';
import { parsePriceMicros, serializeUnits } from '@/domain/money';

import type { SqlExecutor, SqlValue } from './sqlDriver';

export const CREATE_MARKET_HISTORY =
  'CREATE TABLE market_history (asset_id TEXT NOT NULL, resolution TEXT NOT NULL, period INTEGER NOT NULL, open TEXT NOT NULL, high TEXT NOT NULL, low TEXT NOT NULL, close TEXT NOT NULL, PRIMARY KEY (asset_id, resolution, period)) WITHOUT ROWID';

const ROWS_PER_INSERT = 100;
const ROW_PLACEHOLDERS = '(?, ?, ?, ?, ?, ?, ?)';

type Resolution = 'minute' | 'hour';
type HistoryRow = { assetId: string; resolution: Resolution; period: number; candle: Ohlc };

const priceText = z.string().transform(parsePriceMicros);
const historyRows = z.array(
  z.object({
    resolution: z.enum(['minute', 'hour']),
    period: z.number().int(),
    open: priceText,
    high: priceText,
    low: priceText,
    close: priceText,
  }),
);

function rowsOf(history: MarketHistory): HistoryRow[] {
  const minutes = history.minutes.map((minute) => ({
    assetId: minute.assetId,
    resolution: 'minute' as const,
    period: minute.tick,
    candle: { open: minute.price, high: minute.price, low: minute.price, close: minute.price },
  }));
  const hours = history.hours.map(({ assetId, hour, ...candle }) => ({
    assetId,
    resolution: 'hour' as const,
    period: hour,
    candle,
  }));
  return [...minutes, ...hours];
}

function rowValues(row: HistoryRow): SqlValue[] {
  const { open, high, low, close } = row.candle;
  return [row.assetId, row.resolution, row.period, ...[open, high, low, close].map(serializeUnits)];
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

function insertRows(sql: SqlExecutor, rows: readonly HistoryRow[]): Promise<void> {
  return chunks(rows, ROWS_PER_INSERT).reduce<Promise<void>>(
    (previous, chunk) =>
      previous.then(() =>
        sql.run(
          `INSERT OR REPLACE INTO market_history (asset_id, resolution, period, open, high, low, close) VALUES ${chunk.map(() => ROW_PLACEHOLDERS).join(', ')}`,
          chunk.flatMap(rowValues),
        ),
      ),
    Promise.resolve(),
  );
}

export async function appendMarketHistory(sql: SqlExecutor, history: MarketHistory): Promise<void> {
  const rows = rowsOf(history);
  if (rows.length === 0) return;
  await insertRows(sql, rows);
  await sql.run("DELETE FROM market_history WHERE resolution = 'minute' AND period < ?", [
    history.keepFrom.minuteTick,
  ]);
  await sql.run("DELETE FROM market_history WHERE resolution = 'hour' AND period < ?", [
    history.keepFrom.hour,
  ]);
}

export async function loadAssetHistory(sql: SqlExecutor, assetId: string): Promise<AssetHistory> {
  const rows = historyRows.parse(
    await sql.all(
      'SELECT resolution, period, open, high, low, close FROM market_history WHERE asset_id = ? ORDER BY resolution DESC, period',
      [assetId],
    ),
  );
  return {
    minutes: rows
      .filter((row) => row.resolution === 'minute')
      .map((row) => ({ assetId, tick: row.period, price: row.close })),
    hours: rows
      .filter((row) => row.resolution === 'hour')
      .map(({ period, open, high, low, close }) => ({
        assetId,
        hour: period,
        open,
        high,
        low,
        close,
      })),
  };
}
