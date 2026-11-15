# Performance audit

Audited November 15, 2026 against `03b1687`, with a repeatable host benchmark and two application-layer optimizations. This measures JavaScript computation, not mobile frame rate, launch time, SQLite latency, memory consumption or battery use.

## Measurements

Times in milliseconds. Median improvements compare the complete change with the original implementation.

| Workload | Before median | After median | Less time | Before → after p95 |
| --- | ---: | ---: | ---: | ---: |
| Three foreground preview readers per tap | 0.8638 | 0.0639 | 92.6% | 0.9392 → 0.0991 |
| Business catalogue selector | 0.3237 | 0.1167 | 63.9% | 0.3996 → 0.1749 |
| Tap command, excluding SQLite | 0.4297 | 0.2933 | 31.7% | 0.4858 → 0.3657 |
| Eight-hour offline simulation, excluding SQLite | 308.5605 | 277.6925 | 10.0% | 340.5625 → 297.7011 |

All four monetary checksums match. The complete offline save SHA-256 matches: `31b0c2ec1d5dc0a3fbdea53ca41fee83eee318743b42ebc9ecad7cd40e68b987`.

Raw results: [before](performance-audit/before.json), [after](performance-audit/after.json). The larger foreground improvement reflects reuse within and across pending-tap publications. The smaller offline improvement shows that static catalogue construction explains only part of settlement cost.

## Findings and solutions

Cash previews previously called `advanceTaxTime` independently for every reader. Home's Tap card, Wallet upgrade and attention rail consume this projection; pending taps publish new snapshots even when the committed state and displayed elapsed time are unchanged. The fix shares the most recent projection for each content object, keyed by committed state identity and elapsed milliseconds. Pending tap payouts are still calculated separately, so each tap immediately changes displayed cash. Committing, advancing time, resetting or replacing content invalidates reuse.

`businessEconomy` previously converted all twelve content businesses into domain definitions on every call, including BigInt arithmetic, mechanic wrappers, rivals and synergy arrays. The business catalogue selector calls this conversion for each offer, and tax settlement calls it repeatedly for every time segment. A WeakMap now retains one derived business economy per content object. Different content objects remain isolated even when they share an economy version. Both caches rely on the application's existing immutable state/content convention; content edits must replace the content object. The projection cache retains only one committed state and one projected state per live content object.

## Method

Run `bun run performance:audit`. The harness uses the real selectors, `applyEnvelope` and `advanceTaxTime`, with deterministic initial state and the engine's saved random seed. It initializes all twelve businesses at their opening stage, eight rented properties, $1B cash and $1B Treasury per business. This is a broad ownership fixture, not a maximum-upgrade save or a recorded play session. There are no stock positions or listed businesses in the fixture.

Each scenario runs five warmups and fifteen measured samples. Foreground samples each contain 100 iterations; reported times are per iteration. p95 is the nearest-rank percentile of sample timings, not individual tap latency. The preview scenario has three readers per publication and changes the displayed elapsed time every five publications, exercising both cache hits and misses. The command scenario applies 100 sequential single-tap batches with 250 ms elapsed per command. Offline settlement advances eight hours in one call. Command and offline timings exclude persistence and native bridges.

Before and after use the same harness, fixture, dependencies and host, in separate processes without the check suite running. The before run uses the original `cashView.ts` and `economy.ts`; the after run uses both optimizations. Hardware: Linux x86_64, Intel Core i7-7700T @ 2.90 GHz, Bun 1.4.3. These are warm-process timings, not cold launch measurements. Host load, JIT and garbage collection introduce noise; differences must not be interpreted as equivalent Hermes or physical-device speedups.

The raw JSON includes monetary checksums for each workload and a SHA-256 of the complete encoded offline save. Before and after must match these outputs. Regression tests additionally cover shared readers, pending tap payouts, elapsed-time changes, committed-state replacement and same-version content replacement. Existing logic and screen suites cover the financial and UI behavior.

## Remaining audit scope

The foreground loop already refreshes at one second and checkpoints at five seconds; taps already batch within 250 ms. Artwork already uses memory/disk caching. Market history and activity are retained with limits, and old command receipts are pruned on opening a save. These paths were inspected, but their native execution was not profiled.

The next device investigation should record React commits and JS/UI frame timings while tapping, navigating between tabs and resuming a developed save. Many components subscribe to the complete game snapshot, including settings/format consumers; narrower subscriptions may reduce unnecessary renders, but no device-level saving is claimed here. Separately measure SQLite save transactions, cold launch, image decoding, allocations and a 24-hour Night manager return. Tax settlement still processes chronological boundaries and accumulates accounting/history; defer changes to that financial algorithm until profiling identifies its dominant remaining cost.
