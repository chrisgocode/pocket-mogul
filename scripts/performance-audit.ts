import { createHash } from 'node:crypto';

import { getContent } from '@/content';
import { openingSnapshot } from '@/application/gameSnapshots';
import { businessEconomy } from '@/application/economy';
import { selectCashCents, stateWithUnsavedIncome } from '@/application/cashView';
import { selectBusinesses } from '@/application/businessesView';
import { encodeSave } from '@/application/saveFormat';
import { applyEnvelope } from '@/application/commitCommand';
import { advanceTaxTime } from '@/application/taxTime';
import { freshGameState, type GameState } from '@/domain/gameState';
import { newBusiness } from '@/domain/business/owned';
import { dollars } from '@/domain/money';
import { levelZeroProperty } from '@/domain/propertyQuotes';

const JSON_INDENT = 2;
const SAMPLE_COUNT = 15;
const WARMUP_COUNT = 5;
const FOREGROUND_ITERATIONS = 100;
const MS_PER_HOUR = 3_600_000;
const OFFLINE_HOURS = 8;
const OFFLINE_MS = OFFLINE_HOURS * MS_PER_HOUR;
const READS_PER_REFRESH = 5;
const TAP_WINDOW_MS = 250;
const P95 = 0.95;
const MEDIAN_DIVISOR = 2;
const PREVIEW_MS = 4_000;
const DECIMAL_PLACES = 4;
const content = getContent();
const economy = businessEconomy(content);
const fresh = freshGameState({
  saveId: 'performance-audit',
  economyVersion: content.economyVersion,
  wallMs: 0,
});
const state: GameState = {
  ...fresh,
  cashCents: dollars('1000000000'),
  businesses: economy.catalog.map((definition) =>
    Object.assign(newBusiness(definition, { rules: economy.rules, atMs: 0 }), {
      treasuryCents: dollars('1000000000'),
    }),
  ),
  properties: content.properties.map((property) => ({
    ...levelZeroProperty(property.id),
    rented: true,
  })),
};
const snapshot = openingSnapshot({ state, notice: { kind: 'none' } });

function previews() {
  let cash = 0n;
  for (let index = 0; index < FOREGROUND_ITERATIONS; index += 1) {
    const next = {
      ...snapshot,
      unsavedElapsedMs: PREVIEW_MS + Math.floor(index / READS_PER_REFRESH),
      pendingTaps: index,
    };
    cash += selectCashCents(next, content);
    cash += stateWithUnsavedIncome(next, content).cashCents;
    cash += selectCashCents(next, content);
  }
  return cash;
}

function businesses() {
  let cash = 0n;
  for (let index = 0; index < FOREGROUND_ITERATIONS; index += 1) {
    cash += selectBusinesses({ ...snapshot, pendingTaps: index }, content).cashCents;
  }
  return cash;
}

function commands() {
  let current = state;
  for (let index = 0; index < FOREGROUND_ITERATIONS; index += 1) {
    const result = applyEnvelope(current, {
      envelope: { id: `audit-${index}`, command: { type: 'TapBatch', taps: 1, boosted: false } },
      time: {
        elapsedMs: TAP_WINDOW_MS,
        boostElapsedMs: TAP_WINDOW_MS,
        wallMs: index * TAP_WINDOW_MS,
        dayKey: 'audit',
      },
      economies: { content },
    });
    if (result.state === undefined) throw new Error('Benchmark command failed');
    current = result.state;
  }
  return current.cashCents;
}

function offline() {
  return advanceTaxTime(state, { elapsedMs: OFFLINE_MS, wallMs: OFFLINE_MS, content }).state
    .cashCents;
}

function orderedTimes(samples: readonly { ms: number }[]): number[] {
  const ordered: number[] = [];
  for (const sample of samples) {
    const index = ordered.findIndex((value) => value > sample.ms);
    ordered.splice(index === -1 ? ordered.length : index, 0, sample.ms);
  }
  return ordered;
}

function measure(name: string, scenario: { run: () => bigint; iterations: number }) {
  for (let index = 0; index < WARMUP_COUNT; index += 1) scenario.run();
  const samples = Array.from({ length: SAMPLE_COUNT }, () => {
    const started = performance.now();
    const checksum = scenario.run();
    return { ms: (performance.now() - started) / scenario.iterations, checksum: String(checksum) };
  });
  const times = orderedTimes(samples);
  const checksums = new Set(samples.map((sample) => sample.checksum));
  if (checksums.size !== 1) throw new Error('Non-deterministic benchmark');
  return {
    name,
    medianMs: Number(times[Math.floor(SAMPLE_COUNT / MEDIAN_DIVISOR)]!.toFixed(DECIMAL_PLACES)),
    p95Ms: Number(times[Math.ceil(SAMPLE_COUNT * P95) - 1]!.toFixed(DECIMAL_PLACES)),
    checksum: samples[0]!.checksum,
  };
}

process.stdout.write(
  `${JSON.stringify(
    {
      runtime: `Bun ${process.versions['bun']}`,
      businesses: state.businesses.length,
      properties: state.properties.length,
      samples: SAMPLE_COUNT,
      warmups: WARMUP_COUNT,
      offlineStateSha256: createHash('sha256')
        .update(
          encodeSave(
            advanceTaxTime(state, { elapsedMs: OFFLINE_MS, wallMs: OFFLINE_MS, content }).state,
          ),
        )
        .digest('hex'),
      results: [
        measure('Three foreground preview readers per tap', {
          run: previews,
          iterations: FOREGROUND_ITERATIONS,
        }),
        measure('Business catalogue selector', {
          run: businesses,
          iterations: FOREGROUND_ITERATIONS,
        }),
        measure('Tap command, excluding SQLite', {
          run: commands,
          iterations: FOREGROUND_ITERATIONS,
        }),
        measure('Eight-hour offline simulation, excluding SQLite', { run: offline, iterations: 1 }),
      ],
    },
    null,
    JSON_INDENT,
  )}\n`,
);
