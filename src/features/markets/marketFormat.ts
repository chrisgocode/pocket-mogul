import type { NewsItem } from '@/application/marketNews';
import type { PriceChart } from '@/application/priceChart';
import { formatPriceCompact } from '@/domain/money';
import type { LineTrend } from '@/ui/LineChart';

const BPS_PER_PERCENT = 100;
const PERCENT_DECIMALS = 2;
const MINUTE_MS = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MINUTES_SHOWN_UP_TO = 120;
const HOURS_SHOWN_UP_TO = 48;

function percent(bps: number): string {
  const magnitude = Math.abs(bps);
  const whole = Math.floor(magnitude / BPS_PER_PERCENT);
  const fraction = String(magnitude % BPS_PER_PERCENT).padStart(PERCENT_DECIMALS, '0');
  return `${whole}.${fraction}%`;
}

export function changeWords(bps: number): string {
  if (bps === 0) return 'unchanged';
  return `${bps > 0 ? 'up' : 'down'} ${percent(bps)}`;
}

export function changeBadge(bps: number): string {
  if (bps === 0) return `— ${percent(bps)}`;
  return `${bps > 0 ? '▲' : '▼'} ${percent(bps)}`;
}

export function trendOf(bps: number): LineTrend {
  if (bps === 0) return 'flat';
  return bps > 0 ? 'gain' : 'loss';
}

function counted(count: number, unit: string): string {
  return `${count} market ${unit}${count === 1 ? '' : 's'}`;
}

function marketDuration(ms: number): string {
  const minutes = Math.floor(ms / MINUTE_MS);
  if (minutes < MINUTES_SHOWN_UP_TO) return counted(minutes, 'minute');
  const hours = Math.round(minutes / MINUTES_PER_HOUR);
  if (hours < HOURS_SHOWN_UP_TO) return counted(hours, 'hour');
  return counted(Math.round(hours / HOURS_PER_DAY), 'day');
}

export function chartRangeText(chart: PriceChart): string {
  if (chart.spanMs === 0) return `No market history yet. Price ${formatPriceCompact(chart.last)}.`;
  const range = marketDuration(chart.spanMs);
  const move = `${formatPriceCompact(chart.first)} to ${formatPriceCompact(chart.last)}, ${changeWords(chart.changeBps)}`;
  return `Past ${range}: ${move}. High ${formatPriceCompact(chart.high)}, low ${formatPriceCompact(chart.low)}.`;
}

export function newsTiming(item: NewsItem): string {
  if (item.timing.status === 'live') {
    return `Live now · ends in ${marketDuration(item.timing.endsInMs)}`;
  }
  const ago = marketDuration(item.timing.agoMs);
  return `Ended ${ago} ago · lasted ${marketDuration(item.durationMs)}`;
}
