<img src="assets/icon.svg" width="64" height="64" alt="">

# Pocket Mogul

A portrait mobile idle wealth game for iOS and Android: tap for cash, then build wealth through businesses, fictional markets and rental property. Built with Expo, React Native and TypeScript.

- **Design contract:** [`docs/spec.md`](docs/spec.md) (v1.1, owner-approved)
- **Build plan:** [#19](https://github.com/chrisgocode/pocket-mogul/issues/19), one sub-issue per phase
- **Terms:** [`GLOSSARY.md`](GLOSSARY.md)

## Status

| Phase | Issue | State |
|---|---|---|
| 1 Foundation | [#38](https://github.com/chrisgocode/pocket-mogul/issues/38) | Built; starts on iOS and Android |
| 2 Economy and persistence | [#21](https://github.com/chrisgocode/pocket-mogul/issues/21) | Tapping, the Game engine, the SQLite save, and save safety ([#27](https://github.com/chrisgocode/pocket-mogul/issues/27)) built |
| 3 Tapping and businesses | [#22](https://github.com/chrisgocode/pocket-mogul/issues/22)–[#24](https://github.com/chrisgocode/pocket-mogul/issues/24) | Wallet upgrades, businesses, upgrades, managers, sales and Tier unlocks built |
| 4 Property and offline | [#26](https://github.com/chrisgocode/pocket-mogul/issues/26) | Properties and rent built; offline earnings ([#25](https://github.com/chrisgocode/pocket-mogul/issues/25)) not started |
| 5 Markets and portfolio | [#28](https://github.com/chrisgocode/pocket-mogul/issues/28) | Seeded market simulation, stock trading ([#29](https://github.com/chrisgocode/pocket-mogul/issues/29)), dividends ([#30](https://github.com/chrisgocode/pocket-mogul/issues/30)) the crypto market ([#31](https://github.com/chrisgocode/pocket-mogul/issues/31)) and the Portfolio tab, goals and activity history ([#32](https://github.com/chrisgocode/pocket-mogul/issues/32)) built |
| 6 Ads and native validation | — | Not started |
| 7 Deep businesses | [#71](https://github.com/chrisgocode/pocket-mogul/issues/71) | Shared business core and treasury ([#73](https://github.com/chrisgocode/pocket-mogul/issues/73)), staff and growth stages ([#74](https://github.com/chrisgocode/pocket-mogul/issues/74)), risks and insurance ([#75](https://github.com/chrisgocode/pocket-mogul/issues/75)), the Vending Machine mechanic ([#76](https://github.com/chrisgocode/pocket-mogul/issues/76)), the Car Wash mechanic ([#77](https://github.com/chrisgocode/pocket-mogul/issues/77)), the Delivery Company mechanic ([#78](https://github.com/chrisgocode/pocket-mogul/issues/78)) and takeovers ([#79](https://github.com/chrisgocode/pocket-mogul/issues/79)) built |

Phase 1 is a runnable shell. It has five tabs, each with its own Stack, and Goals and Settings open from the header. It shows the validated v1 catalog read-only.

#21 adds the first slice of the Game engine. Tapping the card on Home earns $1 per tap. Taps are collected into one TapBatch command for at most 250 ms (sooner when the app leaves the foreground) and committed to an on-device SQLite save, so cash survives a restart. Every command runs through one serialized queue, and each commit writes the snapshot and the command receipt in one exclusive transaction. A repeated command ID returns its recorded result. If a save fails, the unsaved taps roll back on screen.

#27 hardens the save. After a verified commit, at most once a minute, the Game copies the save into `save_backups` (two kept). A save from an older schema is backed up, then migrated explicitly (`MIGRATIONS` in `src/application/saveFormat.ts`, tested against `src/application/fixtures/save-v1.json`). A corrupt latest snapshot restores the newest valid backup and shows a "Save restored" notice; the damaged document is kept in `diagnostics`. A save from a newer schema, an economy version this build doesn't bundle, or a damaged save with no valid backup stops on an explanation screen and is never overwritten or reset. When `economyVersion` changes, the time since the last checkpoint is settled at the save's old rates before the new ones apply; old economies stay bundled in `src/content/index.ts`. Receipts older than 30 days are pruned on launch. Settings has Reset Save behind a confirmation sheet.

#26 adds properties. The Properties tab lists all 8 listings, buyable whenever cash allows. A bought property starts vacant; Rent Out starts rent minus upkeep, and Unrent stops both. Renovation, Furnishings and Building Systems (0 to 10) and Expansion (0 to 4, not on City Studio or Starter House) apply at once, each previewed in the confirmation sheet with its cost, rent, upkeep and value change. Selling pays 95% of the estimated value, and estimated value counts toward net worth.

#28 adds the seeded market. Every save has its own market seed, and stock and coin prices move once per market minute of simulation time, including up to 8 hours of offline time. Each move is drawn from a stable key (seed, tick, scope, stream), so restarting or opening a chart never changes the price path. The Markets tab lists all 24 stocks and 6 coins with their change this market hour and a news feed of market events. Each asset opens to a price chart over 1 hour, 8 hours or 30 market days, with a text summary. Chart history (480 minutes and 720 hourly candles per asset) lives in its own SQLite table, written in the same transaction as the commit that closed it. Trading comes in the next ticket.

#29 adds stock trading. Each stock's details open a quote sheet for buying or selling: enter shares (up to 6 decimals) or a dollar amount, or use the 25%, 50% and Max presets. The sheet shows quantity, price, notional, the 25 bps fee, the cash change and the quote's market time. If the market ticks while it is open, the sheet keeps the entered amount and asks the player to review the new price before confirming; the engine refuses a quote from an older tick with STALE_QUOTE. Buys need $1 of notional, and selling a whole position is always allowed. Positions keep their cost basis and realized result, count towards net worth at their marked value, and show average cost and unrealized result on the stock. Trading opens permanently with the first business purchase. Stocks can be added to a watchlist shown at the top of Markets.

#30 adds stock dividends. The nine paying stocks pay fixed cents per whole share per simulation hour. Entitlement accrues for the time shares are actually held, kept exactly as an integer numerator over 1,000,000 × 3,600,000, and whole cents are paid into cash at each simulation hour boundary with the remainder carried over. The engine accrues before every trade and settles dividends before the market quotes for the same moment. Selling keeps what was already earned until the next payout; newly bought shares earn nothing for earlier time. Pending dividends count towards net worth, dividends advance during offline settlement and appear in the return summary, and a stock's details show the hourly estimate for the holding, pending dividends and the next payout. Saves move to schema 4.

#31 opens the crypto market. The six fictional coins on the Crypto segment use the same quote sheet, position card and watchlist as stocks, counted in coins rather than shares, with the 50 bps crypto fee. Coins move on their own shock streams with the crypto column of spec §11 (±80 bps common, ±180 bps asset, no sector shock, ±8 bps regime drift, ±100 bps 6-tick events), so listing them never changes a stock price; a golden fixture pins both price paths. There are no dividends, staking, mining or wallets.

#32 fills in the Portfolio tab, goals and activity history. Portfolio shows net worth, cash and owned assets apart, with an expandable explanation of how each asset is valued, income by source (net per minute for businesses and rent, per market hour for dividends, and lifetime earnings), every holding (businesses at carrying value beside their sale quote) and realized and unrealized market results. Goals, from the header, lists the 13 goals with badges; one goal not yet reached can be pinned to Home. Goals pay no cash, and a commit that completes any raises one `goalsCompleted` game event for later natural-break ads. The activity history records purchases, sales, upgrades, rentals, trades, dividend payouts and offline settlements in a `ledger_entries` table trimmed to the newest 2,000, groups taps and passive income into one earnings entry, and keeps lifetime totals on the save. Saves move to schema 5.

#73 replaces the business model with the deep-business core. Rates are per business day (10 simulation minutes). A business serves `min(demand, capacity)` customers at one of five price levels and pays upkeep per unit and a cost per customer; its figures are derived from the catalog in spec §5.1. Profit lands in the business's treasury, and the payout setting (50% at purchase) moves that share to cash. Extra units (up to 3 at the Startup stage) and Quality and Efficiency upgrades are paid from the treasury. The player can deposit into or withdraw from a treasury at any time. A treasury never goes below zero: a business whose loss empties it closes until a deposit reopens it, and its closure shows in the activity history and the return summary. Net worth counts every treasury, and a sale pays 60% of the business's spending plus its whole treasury. Saves move to version 2, and a version 1 save opens as a fresh game.

#74 adds staff and growth stages. Each business can hire operations staff (+20% capacity each), sales staff (+15% demand each) and, from stage 2, one manager (+10% to positive profit). Wages come out of daily profit and hiring pays a signing fee of three days' wages from the treasury; firing is free. A manager sets the most profitable price at each business day boundary, offline too. Businesses grow through five stages, Startup to Global: an upgrade is paid from the treasury once the unit count is at the stage's cap and the business has been owned long enough, and it raises the unit and staff caps.

#75 adds risks and insurance. Each business has three incidents in content, one per category (equipment, liability, supply), drawn at each business day boundary from the save's seed, so live play and offline settlement draw the same ones. An incident costs the treasury some days of catalog revenue (at most 20% of the treasury), or cuts capacity or raises the cost per customer for some days. None strike in a business's first 30 days, and a business has at most one lasting incident at a time. From stage 2 the player can insure each category for a daily premium of 2% of catalog revenue: a policy covers 80% of a treasury loss and halves a capacity loss or cost rise and its duration. A policy lapses when the treasury can't pay its premium, and a manager renews it once it can. Incidents from an absence show in the return summary and the activity history.

#76 adds the Vending Machine mechanic, the first flagship. From stage 2 (Local), with a one-time coach mark, the details show five locations (Office, Gym, School, Station and Hospital), each with slots, a traffic multiplier and a taste for snacks, drinks and healthy items. The player places machines (new ones stand at the Office) and picks each location's stock mix; how well the mix matches the taste multiplies demand there, from 60% to 140%. Machines hold stock, each day sells stock in proportion to customers served, and a location with no stock serves no one. Restocking fills a location for a fee per machine from the treasury, one location or all at once; operations staff are named Restocking and refill every location at each day boundary, offline too. A manager moves each location to its best mix. At stage 5 (Global), card readers add 20% to demand at every price.

#77 adds the Car Wash mechanic. From stage 2 (Local), with a one-time coach mark, walk-ins pick a package (Basic, Deluxe or Ultimate, 60/30/10 percent by default), each with its own price and bay time; capacity counts bay time, so the player can stop offering Deluxe or Ultimate to wash more cars on a busy day. Each day's weather comes from the save's seed (Sunny, Cloudy, Rain or After rain: 120, 100, 50 and 160 percent of walk-ins) and the details show the next three days. Members pay a daily fee whatever the weather and use bay time first; they join each day in proportion to Quality and the membership price, up to a cap the player sets, and leave when capacity is short. A manager raises the cap ahead of forecast rain. At stage 5 (Global), detailing adds a fourth package at the top price.

#78 adds the Delivery Company mechanic. From stage 2 (Local), with a one-time coach mark, operations staff become Drivers: each crews two vans and a van without a driver delivers nothing. An offers board shows up to three client contracts a day, drawn from the save's seed (parcels per day, a rate, a length and a penalty per missed parcel); unanswered offers expire after 2 days. Accepted contracts are delivered first, in acceptance order; each missed parcel pays its penalty and walk-ins get only the spare capacity. Reputation (one to five stars, the on-time share over the last 10 days) sizes and prices new offers. Efficiency becomes the Route planner, adding parcels per van, and at stage 5 (Global) a sorting hub adds 30 percent capacity. A manager never accepts or declines, but raises the walk-in price when contracts fill the vans.

#79 adds takeovers. Each business type has three fictional rivals with a unit count and a Quality level. From stage 3 (Regional) the Deals section values each rival at 10 days of its profit and lets the player offer 90, 105, 120 or 140 percent of that. One offer runs at a time; at the next day boundary the rival accepts with a chance drawn from the save's seed (none at 80 percent, certain at 140). A yes pays the offer from the treasury and merges the rival: its units join, even above the stage cap, and Quality rises to the higher of the two. A no locks offers for that rival for 5 days.

## Setup

Requires Bun 1.4 or later (the package manager and script runner) and Node 22.13 or later (used by Expo and by Jest for screen tests). The app uses **development builds only**: Expo Go can't load the native ads library this game needs.

```bash
bun install
bun run ios       # build and run a dev build on the iOS Simulator (macOS + Xcode)
bun run android   # build and run a dev build on the Android Emulator (Android SDK)
bun run start     # start Metro for an installed dev build
```

`ios/` and `android/` are generated by `expo prebuild` and are not committed. Configure native behavior in `app.json` and config plugins. Rebuild after adding a native module, changing plugin options or upgrading the SDK.

## Checks

```bash
bun run check         # typecheck + lint + format check + knip + all tests + expo-doctor
bun run test          # both suites below
bun run test:logic    # bun test: src/domain, src/content, src/application (*.test.ts)
bun run test:screens  # Jest + jest-expo: screen tests (*.test.tsx)
bun run typecheck
bun run lint          # oxlint, strict and type-aware (.oxlintrc.json); warnings fail
bun run knip:check    # unused files, exports and dependencies
bun run format        # oxfmt (.oxfmtrc.json); format:check to verify only
```

Engine tests run each Game over a fresh in-memory database from Node's built-in SQLite (`node:sqlite`, which `bun test` and Jest both load) and a fake clock. Screen tests replace `@/bootstrap/deviceGame` with the same test Game.

Logic tests use `bun test`'s global `describe`/`it`/`expect`. Screen tests use Jest because `bun test` can't load React Native, so name them `*.test.tsx` and keep them out of the logic folders. Plain `bun test` from the root would also pick up the screen tests and fail; use the scripts.

## Git hooks and CI

`bun install` sets up a Husky pre-commit hook. It formats and lints the staged files (lint-staged, `.lintstagedrc.json`), then runs the typecheck, knip and every test, so a commit only lands when they pass. It takes about 7 seconds.

`git commit --no-verify` skips the hook, so CI is the real gate. `.github/workflows/ci.yml` runs on every pull request and every push to `main`:

| Job | What it checks |
|---|---|
| typecheck, lint, format:check, knip:check, test:logic, test:screens | The same scripts as `bun run check`, one runner each |
| Expo doctor and bundles | `expo-doctor`, and the iOS and Android JavaScript bundles build |
| Workflow security | zizmor audits the workflows; actions are pinned to commit SHAs |
| Check | Passes only when every job above passes. Branch protection should require this one |

Native iOS and Android builds aren't in CI yet. They run on the owner's Mac for now.

## Layout

| Path | Responsibility |
|---|---|
| `src/app` | Expo Router routes and screen composition |
| `src/features` | Home, Businesses, Markets, Properties, Portfolio, Goals, Settings |
| `src/domain` | Pure logic: `money.ts` (exact BigInt money units and formatters), the game state, commands and tapping rules |
| `src/application` | The headless Game engine: `createGame` from injected ports (clock, SaveStore, content, IDs), the serialized command queue, tap batching, snapshot subscriptions, the save format and `testGame.ts` (fake clock plus Node SQLite) for tests |
| `src/infrastructure` | Adapters: the SaveStore over a narrow SQL driver with migrations (`save_state`, `command_receipts`, `diagnostics`, `save_backups`, `schema_migrations`), the expo-sqlite driver (WAL, `withExclusiveTransactionAsync`), the Node SQLite driver for tests, and the device clock |
| `src/bootstrap` | The composition root: builds the device Game from the real adapters. Routes reach it only through `DeviceGameProvider`, so screens never import adapters |
| `src/content` | Versioned economy content (`economy-v1.ts`), Zod schema and validation |
| `src/ui` | Design tokens, shared components, original SVG logo marks and icons |
| `lint-rules` | Project oxlint rules (`no-comments`, `no-nondeterminism`, `no-implicit-state-machine`), fixtures, and a test proving every gate fires |

Content is validated once at startup. A bad edit shows a "Game content failed to load" screen listing every issue, and `bun run test` fails on the same issues.

## Dependency matrix

Expo SDK 58, resolved on 2026-11-03. Exact versions are locked in `bun.lock`.

| Package | Version |
|---|---|
| bun (package manager) | 1.4.3 |
| expo | 58.0.23 |
| react-native | 0.88.1 |
| react | 19.3.0 |
| react-dom | 19.3.0 (peer of expo-router's web pieces; pinned to match react) |
| expo-router | 58.0.30 (JavaScript Tabs via `expo-router/js-tabs`) |
| expo-dev-client | 58.0.18 |
| expo-constants | 58.0.15 |
| expo-linking | 58.0.16 |
| expo-font | 58.0.11 |
| expo-status-bar | 58.0.4 |
| expo-system-ui | 58.0.7 |
| expo-sqlite | 58.0.15 (the save; WAL and exclusive transactions) |
| expo-crypto | 58.0.7 (`randomUUID` for save and command IDs) |
| expo-haptics | 58.0.7 (throttled tap haptics) |
| react-native-safe-area-context | 5.11.1 |
| react-native-screens | 4.30.1 |
| react-native-svg | 15.16.0 |
| zod | 4.6.7 |
| typescript | 6.0.3 (strict) |
| jest | 30.5.2 |
| jest-expo | 58.0.14 |
| @testing-library/react-native | 14.1.0 (on test-renderer 1.3.1, not react-test-renderer) |
| oxlint | 1.91.0, type-aware via oxlint-tsgolint 7.0.2005 |
| oxfmt | 0.76.0 |
| eslint-plugin-react-native | 5.0.0 (run by oxlint as a JS plugin) |
| eslint-plugin-sonarjs | 4.2.2 (JS plugin, cognitive complexity only) |
| eslint-plugin-react-you-might-not-need-an-effect | 1.1.0 (JS plugin) |
| @oxlint/plugins | 1.91.0 (types for `lint-rules/`) |
| knip | 6.44.1 (unused files, exports, dependencies) |
| expo-doctor | 1.21.6 |
| eslint-plugin-react-native-a11y | 3.5.1 (JS plugin) |
| eslint-plugin-testing-library | 7.16.2 (JS plugin, screen tests) |

Added in a later phase: react-native-google-mobile-ads ^17.4 (Phase 6). The ads package needs React Native 0.86+, the New Architecture, iOS 15.1+ and Android minSdk 24, all of which SDK 58 meets.

## Phase 1 completion gate

| Check | Result |
|---|---|
| Dependency matrix and lockfile committed | Done |
| `expo-doctor` | 20/20 checks pass |
| Hermes bundles for iOS and Android (`expo export`) | Both compile |
| Native projects generate (`expo prebuild`) | Both generate |
| Typecheck, oxlint, oxfmt, tests | Pass |
| App starts on the iOS Simulator | Done 2026-11-05 on iPhone 17 Pro (iOS 26.0), built with Xcode 27.2 |
| App starts on the Android Emulator | Done 2026-11-05 on a Pixel 7 emulator (Android 13) |
| BigInt formatting on device (spec §2) | Done: cash, prices and dividends render correctly on both |

## Xcode version

iOS builds need **Xcode 27** (SDK 58 targets Xcode 27 and iOS 27). Xcode 26.x fails to compile `expo-modules-jsi` with `sending 'slot' risks causing data races` ([expo/expo#52754](https://github.com/expo/expo/issues/52754)). Verified 2026-11-05: a clean prebuild and build on Xcode 27.2 succeeds with no patches.

## Owner-supplied release configuration

`app.json` uses the placeholder identifiers `com.pocketmogul.dev` for iOS and Android. The final app identity, signing, production ad IDs and store disclosures come from the owner before release (spec §19).
