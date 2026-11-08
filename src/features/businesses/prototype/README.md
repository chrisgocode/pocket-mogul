# #82 — throwaway UI study

Question: which hierarchy makes twelve businesses, each with its own management game, understandable on a portrait phone?

Run `bun run prototype:82` and open the local URL printed by Bun. Append `?variant=A`, `?variant=B`, or `?variant=C`. The floating arrows and keyboard left/right cycle layouts; URL state survives reload. Game state is memory-only and resets on reload. The sample selector covers first session, operating empire, empty vending stock and diversified holdings. The default opens Earn with diversified holdings. Every reload opens Earn, including old links with a `screen` parameter. Share a scenario with `?scenario=diversified|operating|attention|first`; select the other tabs in the prototype.

This browser artifact sits next to the native Businesses feature. It reproduces the host top bar, five-tab navigation and related Earn/Wealth surfaces to provide context. It is deliberately separate from Expo Router: this is a browser comparison of native screen structures, not a web version of the production app. Nothing is imported into the app. No native API, engine, content, save, or production screen was changed. `?mode=production` hides the study switcher for captures; the artifact is never included in an app build.

## The three hypotheses

- **A — The Ledger:** scan compact Owned / Tier rows, then open a predictable Overview → mechanic → Grow → Staff → Risks → Deals detail page. Prioritizes repeat visits and information density.
- **B — Command Center:** scene and cash flow first, followed by the next operational action. On detail, the mechanic appears first, with jump links to all six sections. Tests a deliberate departure from the specified Overview-first order.
- **C — Empire Journey:** stage progression first, with businesses along a vertical path. Detail leads with Grow. Tests motivation and discovery against the extra distance to routine management.

The original study used Vault green-black, gold and ivory. After owner feedback about the colors, the current study defaults to neutral Graphite/mint, with Midnight/blue and Ash/ivory alternatives. The production checkout's tokens remain unchanged. A/B/C still compare hierarchy; the palette selector is independent of those layouts. All five tabs are now navigable. Markets and Properties have sample lists, details and confirmation flows.

## Drive it

Switch to First session → Earn → tap to $250 → Businesses / Tier 1 → buy Vending. Buying is one tap. In the operating sample, open Vending, add a machine or restock from treasury, change payout, deposit personal cash, or review a whole-treasury withdrawal. Sell and withdrawal show confirmation; reset restores the sample. Inspect the expanded state below the phone after each action.

All amounts are illustrative fixture values. The sample is not an economy calculator: growth does not recompute demand or profit, time does not accrue, and staff, pricing, insurance and deals are discovery-only. The stock value can be refilled, not simulated down. The first-session buy quote and the Local detail snapshot represent different stages. Wealth allocation values and percentages are computed from sample cash, business carrying values, market positions and property values; treasury is included once in the business value. A native implementation must use selector quotes and engine results, not these numbers.

## Owner-selected direction — A, revised

The owner chose A and rejected decorative headings/taglines and the arbitrary business symbols. A now replaces “Your portfolio of businesses” / “Businesses” with a **Business net worth** counter, owned count and income to cash. The treasury explanation banner is removed. A's Earn and Wealth views also omit their motivational headings. Earn has since become the center command screen, as described below.

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

## Compact Wealth and all-tab iteration

Owner requested greater Wealth density and reference to MOGUL's decompiled APK. Primary source inspected: `/root/.t3/research/mogul-decompiled/bundle.js` (retained Hermes decompilation, MOGUL 1.2.3), approximately lines 2216200–2219000. The APK itself was previously deleted; the retained decompiled bundle was used. The Holdings rendering groups total asset value with compact liquid/invested/business summaries, then allocation by category and position rows with quantity, average cost, value and gain/loss. Observed row styles include 9-point vertical padding and horizontally grouped figures. This is a code-structure observation, not a claim of device screenshot inspection. No MOGUL code, copy or assets were imported.

The revision applies the density principle with our own design and v1 scope: compact total, four summary figures, Summary / Holdings / Activity chips, five-category allocation with calculated values and percentages, income breakdown, and expandable valuation basis. Holdings pairs quantity/average cost with market value/P&L; business and property rows navigate to their details. No static allocation percentages remain.

Markets now includes Stocks / Crypto / Watchlist, fictional-asset rows, detail charts, holdings/P&L, quantity presets, and fee-inclusive confirmed buys/sells. Prices, 24-hour changes and charts are illustrative fixtures, not a running market. First-session users can inspect assets; trading requires a business. Properties includes All / Owned listings, detail value/rent/upkeep, confirmed purchase and sale, rent toggling, and one sample renovation level. The Diversified scenario includes market positions and a rented City Studio so Wealth density and property controls can be evaluated immediately. Cash, asset values, income, realized results and activity update in memory. No engine/save connection.

Removed the “This study focuses…” message and the branch that blocked the Markets and Properties tabs. Native implementation, full upgrade tracks, fractional order entry and market simulation remain outside this throwaway artifact.

## Earn center, property presentation and palette iteration

Owner requested Earn in the center as the command screen and the landing page on every load, plus another MOGUL reference pass for property presentation and different colors.

Primary source inspected in the retained MOGUL decompilation (`/root/.t3/research/mogul-decompiled/bundle.js`):

- Around lines 200600–201520: custom tab bar and tab configuration explicitly place Earn/index third with `isCenter`, a distinct center button and label treatment.
- Around lines 2079195–2090000: Earn combines net worth, income statistics, tapping and an upgrade bar.
- Around lines 2093659–2094410: owned real estate uses a large image region (180 points), overlaid property identity/status and compact metrics below.
- Around lines 2045647 and 2120155–2123958: related property/residency rendering uses property-specific images and image-led presentation. These informed layout, not our assets or game rules.

Our five-tab order is now **Businesses / Markets / Earn / Properties / Wealth**. Earn has a distinct center control. Initial load and reset always land on Earn; tab selections deliberately do not persist to the initial route. It includes a clickable net worth total, business/rent income figures, a functional sample wallet tap and upgrade, three asset summaries and a contextual stock alert or next-business purchase target. No slogan or decorative heading is added.

Properties replaces the tiny generic house glyph rows with original SVG architectural scenes, status badges, names and paired value/rent figures. Each of the four sample property types has its own illustration. Details reuse the matching scene. These are scalable original vector studies, not MOGUL images or production art.

Palette comparison is independent of the original layout variants: `?palette=graphite|midnight|ash`. Graphite is a neutral charcoal base with mint reserved for actions and gains. Midnight uses a blue accent; Ash uses warm neutral surfaces and ivory. The previous green surfaces, gold-dominant styling and colorful allocation are toned down. This is an exploration, not an owner-approved replacement for the production theme.
