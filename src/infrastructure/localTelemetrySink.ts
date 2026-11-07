import type { TelemetryEvent, TelemetryPort } from '@/application/telemetry';

export type LocalTelemetrySink = TelemetryPort & {
  readonly events: () => readonly TelemetryEvent[];
};

export function localTelemetrySink(kept: number): LocalTelemetrySink {
  const events: TelemetryEvent[] = [];
  return {
    record(event) {
      events.push(event);
      if (events.length > kept) events.splice(0, events.length - kept);
    },
    events: () => [...events],
  };
}
