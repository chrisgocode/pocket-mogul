const MS_PER_MINUTE = 60_000;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const TWO_DIGITS = 2;

const padded = (value: number) => String(value).padStart(TWO_DIGITS, '0');

export function durationText(ms: number): string {
  const totalMinutes = Math.floor(ms / MS_PER_MINUTE);
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);
  const minutes = totalMinutes % MINUTES_PER_HOUR;
  if (hours === 0) return `${minutes}m`;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

export function gameClockText(simulationMs: number): string {
  const totalMinutes = Math.floor(simulationMs / MS_PER_MINUTE);
  const minutesPerDay = MINUTES_PER_HOUR * HOURS_PER_DAY;
  const day = Math.floor(totalMinutes / minutesPerDay) + 1;
  const hour = Math.floor((totalMinutes % minutesPerDay) / MINUTES_PER_HOUR);
  return `Day ${day}, ${padded(hour)}:${padded(totalMinutes % MINUTES_PER_HOUR)}`;
}
