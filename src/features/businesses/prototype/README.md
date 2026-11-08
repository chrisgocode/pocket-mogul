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

All amounts are illustrative fixture values. The sample is not an economy calculator: growth does not recompute demand or profit, time does not accrue, and staff, pricing, insurance and deals are discovery-only. The stock value can be refilled, not simulated down. The first-session buy quote and the Local detail snapshot represent different stages. Wealth allocation percentages are illustrative composition examples; its total uses sample cash plus the same business counter. A native implementation must use selector quotes and engine results, not these numbers.

## Owner-selected direction — A, revised

The owner chose A and rejected decorative headings/taglines and the arbitrary business symbols. A now replaces “Your portfolio of businesses” / “Businesses” with a **Business net worth** counter, owned count and income to cash. The treasury explanation banner is removed. A's Earn and Wealth views also omit their motivational headings.

Business net worth follows the existing definition in spec §5 / §9: private business carrying value is capitalized investment plus treasury; listed businesses use the market value of the player's retained stake instead, counted once. This is distinct from a sale quote or profit-multiple takeover valuation. Production should reuse that accounting convention across Businesses and Wealth. No economic definition is being changed.

The prototype's private-business fixtures track investment and treasury explicitly. Buying adds investment; unit growth moves treasury to investment, preserving worth; restocking is an operating expense and reduces worth; deposits/withdrawals move value between personal cash and the business. Personal cash and unrelated investments are excluded from the business counter. Listed-business scenarios are not simulated here.

Compare the artwork selector above the phone (shareable via `?art=illustrated|outline|none`):

- **Two-tone illustrations:** small, recognizable vending machine/cart/kiosk/washer/wash bay/bakery drawings. Stronger game identity and distinct silhouettes, without depending on emoji fonts.
- **Outline icons:** the same literal objects, with quieter strokes and no tile. Lower visual weight.
- **No icons:** text-led rows with more space for business names and figures. The most compact choice.

These are inline SVG studies, not final production assets or a new icon package. Two-tone is the initial preview; no artwork direction has been selected by the owner. A's structure is selected, but no prototype code has been promoted to production. B/C are retained as the original comparison archive.

## Suggested implementation slices after selection

1. Shared top bar: distinguish cash, income to cash, and next-goal progress; include Goals and Settings entry points.
2. Catalog: Owned / Tier chips, clean rows, permanent tier unlocks, one-tap buys with earned-income feedback and pending protection.
3. Full-screen business detail: six sections, treasury-funded growth, stage-2 mechanics, confirmations for the specified transactions.
4. Earn: wallet and one clear next step, respecting optional boost and tutorial rules.
5. Wealth: allocation, income sources and activity, with exact amounts available in details.

Each production slice needs its own PR, per #82. Native accessibility, safe areas, font scaling and device media remain implementation work.
