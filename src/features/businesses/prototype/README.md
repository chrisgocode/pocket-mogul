# #82 — throwaway UI study

Question: which hierarchy makes twelve businesses, each with its own management game, understandable on a portrait phone?

Run `bun run prototype:82` and open the local URL printed by Bun. Append `?variant=A`, `?variant=B`, or `?variant=C`. The floating arrows and keyboard left/right cycle layouts; URL state survives reload. Game state is memory-only and resets on reload. The sample selector covers first session, operating empire, and empty vending stock.

This browser artifact sits next to the native Businesses feature. It reproduces the host top bar, five-tab navigation and related Earn/Wealth surfaces to provide context. It is deliberately separate from Expo Router: this is a browser comparison of native screen structures, not a web version of the production app. Nothing is imported into the app. No native API, engine, content, save, or production screen was changed. `?mode=production` hides the study switcher for captures; the artifact is never included in an app build.

## The three hypotheses

- **A — The Ledger:** scan compact Owned / Tier rows, then open a predictable Overview → mechanic → Grow → Staff → Risks → Deals detail page. Prioritizes repeat visits and information density.
- **B — Command Center:** scene and cash flow first, followed by the next operational action. On detail, the mechanic appears first, with jump links to all six sections. Tests a deliberate departure from the specified Overview-first order.
- **C — Empire Journey:** stage progression first, with businesses along a vertical path. Detail leads with Grow. Tests motivation and discovery against the extra distance to routine management.

All retain Vault's green-black, gold and ivory direction described in #63 / PR #70. The current checkout's tokens are still light. These are hierarchy explorations within that direction, not three palette swaps. Markets and Properties deliberately stay outside this study.

## Drive it

Switch to First session → Earn → tap to $250 → Businesses / Tier 1 → buy Vending. Buying is one tap. In the operating sample, open Vending, add a machine or restock from treasury, change payout, deposit personal cash, or review a whole-treasury withdrawal. Sell and withdrawal show confirmation; reset restores the sample. Inspect the expanded state below the phone after each action.

All amounts are illustrative fixture values. The sample is not an economy calculator: growth does not recompute demand or profit, time does not accrue, and staff, pricing, insurance and deals are discovery-only. The stock value can be refilled, not simulated down. The first-session buy quote and the Local detail snapshot represent different stages. Wealth valuation/allocation are illustrative composition examples. A native implementation must use selector quotes and engine results, not these numbers.

## Provisional verdict — no owner decision yet

Use A as the structural baseline, and consider B's single actionable prompt above the Owned rows. Keep the specified six-section order and all business actions inside the full-screen business page. C's stage trail may work as a Grow section, but leading the whole catalog with it makes routine operations harder to find.

Validate with the owner before implementing. No winning variant has been folded into real code. The study belongs on a throwaway branch, never main.

## Suggested implementation slices after selection

1. Shared top bar: distinguish cash, income to cash, and next-goal progress; include Goals and Settings entry points.
2. Catalog: Owned / Tier chips, clean rows, permanent tier unlocks, one-tap buys with earned-income feedback and pending protection.
3. Full-screen business detail: six sections, treasury-funded growth, stage-2 mechanics, confirmations for the specified transactions.
4. Earn: wallet and one clear next step, respecting optional boost and tutorial rules.
5. Wealth: allocation, income sources and activity, with exact amounts available in details.

Each production slice needs its own PR, per #82. Native accessibility, safe areas, font scaling and device media remain implementation work.
