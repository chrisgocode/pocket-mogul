# #82 — throwaway UI study

Question: which hierarchy makes twelve businesses, each with its own management game, understandable on a portrait phone?

Run `bun run prototype:82` and open the local URL printed by Bun. Append `?variant=A`, `?variant=B`, or `?variant=C`. The floating arrows and keyboard left/right cycle layouts; URL state survives reload. Game state is memory-only and resets on reload. The sample selector covers first session, operating empire, empty vending stock and diversified holdings. The default opens Earn with diversified holdings. Every reload opens Earn, including old links with a `screen` parameter. Share a scenario with `?scenario=diversified|operating|attention|first`; select the other tabs in the prototype.

This browser artifact sits next to the native Businesses feature. It reproduces the host top bar, five-tab navigation and related Earn/Wealth surfaces to provide context. It is deliberately separate from Expo Router: this is a browser comparison of native screen structures, not a web version of the production app. Nothing is imported into the app. No native API, engine, content, save, or production screen was changed. `?mode=production` hides the study switcher for captures; the artifact is never included in an app build.

## The three hypotheses

- **A — The Ledger:** scan compact Owned / Tier rows, then open a predictable Overview → mechanic → Grow → Staff → Risks → Deals detail page. Prioritizes repeat visits and information density.
- **B — Command Center:** scene and cash flow first, followed by the next operational action. On detail, the mechanic appears first, with jump links to all six sections. Tests a deliberate departure from the specified Overview-first order.
- **C — Empire Journey:** stage progression first, with businesses along a vertical path. Detail leads with Grow. Tests motivation and discovery against the extra distance to routine management.

The original study used Vault green-black, gold and ivory. After owner feedback about the colors, the study explored Graphite/mint, Midnight/blue and Ash/ivory; it now defaults to Studio with distinct category accents (see latest iteration below). The production checkout's tokens remain unchanged. A/B/C still compare hierarchy; the palette selector is independent of those layouts. All five tabs are now navigable. Markets and Properties have sample lists, details and confirmation flows.

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

## Mixed colors, independent properties and market workspace

Owner feedback: colors can vary across categories; properties should have their own identity rather than repeat MOGUL's image-card composition; consider MOGUL's market organization.

### Design patterns researched

- [Carbon: categorical, sequential and alert color](https://www.carbondesignsystem.com/building-blocks/data-visualization/color-palettes): distinguish categories with different hues; do not treat categories like a numerical scale of one hue. We apply that principle to asset categories and keep gain/loss signs alongside semantic colors. This is our adaptation, not a claim that Carbon prescribes our specific colors or their accessibility.
- [Carbon: structured lists](https://www.carbondesignsystem.com/building-blocks/core/components/structured-list/guidelines): stacked information in scannable rows, clear hierarchy and short labels. We use a compact property register with an asset identifier, small illustration and a consistent figures strip.
- [Carbon: tabs](https://www.carbondesignsystem.com/building-blocks/core/components/tabs/guidelines): tabs organize related tasks; content filters live at a lower hierarchy. Markets now separates Portfolio / Explore / Watchlist from the Stocks / Crypto filters within Explore.

### Current direction

**Studio** (`palette=mixed`, now the default) uses a neutral graphite shell with amber for Earn, teal for Businesses, lavender for Markets, terracotta for Properties and sky blue for Wealth. Asset allocation uses those same category hues. Gain/loss remains green/red with signs; prices and totals stay mostly neutral. The center Earn button stays amber across sections. Business identity colors are attached to the business ID so filtering does not change them. The older palettes remain selectable for comparison.

Properties is now a numbered **asset register**, not a large landscape-image listing. Each entry has a P01-style identifier, ownership status outside the artwork, original small building art, a prominent value and a bottom strip for net/gross rent. Property types use different scene palettes. Details use a small elevation alongside the heading rather than repeating a full-width hero image. The same purchase, rent, renovation and sale flows remain. This is a deliberate composition change from the earlier MOGUL-inspired cards.

MOGUL market source inspected: retained `/root/.t3/research/mogul-decompiled/bundle.js`, `MarketScreenInner` starting around line 2165584 and market rendering around 2173000–2189690. Observed portfolio/search modes, a watchlist area, class filters, search, holding badges and aligned price/change rows. Our adaptation stays within v1 Stocks/Crypto and uses three task views: Portfolio with cost basis and P&L; Explore with text search, class filters, 24h mover summaries and sorting; Watchlist with saved assets. Compact sparklines and ticker marks are original sample visuals. No source code, brands, copy, mechanics or assets imported.

Search matches name/ticker, sorting supports name/price/24h change, watchlist edits persist in sample memory, and market trades continue to update Wealth. Prices, percentage changes and sparklines remain static illustrative fixtures, not live simulation. Earn still occupies the center and is the landing page on every load.

## Five additional palette options

Owner likes the mixed-color direction and requested at least five more choices. Studio remains the default. Added five original palettes, all with distinct Earn / Businesses / Markets / Properties / Wealth accents:

| Palette | URL key | Character |
|---|---|---|
| After Hours | `afterhours` | Plum surfaces; peach, mint, lilac, rose and cyan accents |
| Marina | `marina` | Deep navy surfaces; citrus, aqua, periwinkle, coral and sky blue |
| Arcade | `arcade` | Ink surfaces; bright lime, turquoise, pink, apricot and electric blue |
| Espresso | `espresso` | Cocoa surfaces; butter, sage, lavender, peach and soft blue |
| Paper | `paper` | Light ivory surfaces; ochre, jade, indigo, clay and deep blue |

Six labeled swatch buttons compare Studio and the five new palettes directly above the phone. The dropdown also keeps the three earlier monochromatic options. Selection updates `?palette=<key>` without changing the current tab, sample balances, holdings or activity. Reload still opens Earn, with the palette restored from the URL. Paper also sets a light control color scheme, dark readable accents, and pale gain/loss badge backgrounds.

Palette changes apply to all five sections, center navigation, actions, wallet area, summary figures, category allocation and market marks. Existing property illustrations retain their own asset-specific art palettes.

Validation: all nine palette URL keys load; the six direct comparison buttons and category styles render; switching preserves sample state. A numeric contrast check of the five new palettes confirms at least 4.5:1 for primary/muted text, section accents and gain/loss text against each palette's base/panel backgrounds. This is a token-pair check, not a full accessibility or browser visual audit. Chrome preview still fails to launch, so visual verification remains limited.

## Studio selected; Profile, Goals and Settings navigation

**Owner decision:** Studio is the chosen palette. It remains the default; other palette experiments have moved to a collapsed archive below the prototype so they no longer dominate the review.

### Diagnosis

The native app still has `src/app/goals.tsx` and `src/app/settings.tsx`, registered in `src/ui/RootStack.tsx`. `src/ui/HeaderActions.tsx`, mounted through `src/ui/TabStack.tsx`, opens both from the native tab headers. The browser study had replaced that chrome with a sample top bar: its Goals label was inert and Settings had no entry point. This was a missing prototype navigation path, not removed native routes.

### Proposed information architecture

Keep the five business/task tabs and centered Earn. Add a **labeled Profile button in the shared header**, reachable from every tab and detail page. Profile groups **Goals & achievements** and **Settings**. The header's achievement-progress strip also directly opens Goals. Utility pages use explicit back navigation and restore the originating tab or selected asset/property/business detail.

A sixth bottom tab would compromise the symmetric center Earn position; replacing Wealth with Profile would make the frequently used financial view less direct. The header gives Profile a stable home while preserving the agreed five-tab layout. This is the proposed Profile placement, not an owner-approved production routing change.

### What is interactive

- Profile shows peak net worth and achievements, then routes to Goals or Settings. It adds no account/login, invented username or cloud-save flow.
- Goals represents the existing thirteen v1 achievements and their stable content IDs: six first actions plus seven peak-wealth milestones. All / In progress / Earned filters work. One open goal can be pinned to Earn, unpinned or automatically cleared on completion. Badge completion and peak wealth persist through simulated asset sales and spending; no cash is awarded.
- Settings exposes sound/haptics preferences, reduced motion, compact/full summary numbers, About and a confirmed progress reset. Number formatting changes the sample header and profile/Earn summaries; transaction amounts stay exact. Reduced-motion selection changes the sample's press/scroll behavior. Sound/haptics are stored in sample state; this browser study does not create device feedback.
- Reset affects memory only, returns to the first-session sample and keeps preferences. Cancel preserves all progress. This does not touch native saves or files.

The first-dividend achievement remains discoverable but cannot complete because the prototype does not advance time or pay dividends. Native implementation must reuse the existing goal/settings selectors and commands, not the sample evaluation in this HTML. The native ad-report action has not been simulated; its existing contact destination needs production handling separately. No production route, save, engine or native API was changed.

Validation covers Profile/Goals entry points across all five tabs, nested utility/back navigation (including return to asset detail), goal filters, pin/unpin and completion, permanent badges, no bonus cash, settings, About, and cancel/confirm reset. Full repo checks pass. Chrome visual preview remains unavailable; no browser visual verification is claimed.

## UI continuation after merged taxes (#94)

Synced this branch with main's approved TAX01–TAX12. The merged **manual** tax model supersedes the historical withholding proposal in #93 and the research note. The prototype is still throwaway HTML; the merged native engine is the source of truth for production accounting.

The agreed five-tab order now follows merged main: **Businesses / Markets / Earn / Properties / Profile**. Profile retains the compact Wealth summary, allocation, Holdings and Activity, with Goals / Taxes / Settings shortcuts above. This keeps the financial data easy to reach while putting player utilities in the fifth tab. Earn is still centered and opens on every reload. Studio remains selected.

Profile → Taxes explores a compact statement, source accounting, the day-opening blended rate, filing confirmations, pending audit exposure, assessed debt and exemption. Current estimates, six-hour returns, a 40% audit chance, original tax plus a 2× fine, ten credited-minute audit delay, personal-cash collection and 25% eligible-credit recovery follow the approved model. An honest shortfall has no fine. The demo applies recovery to its simulated withdrawals and net asset sale credits while keeping taps exempt. Purchases/expansion pause for a ready return or assessed debt; operations and sales remain available.

The **Tax sample** selector outside the phone switches Current / Ready / Pending audit / Debt / Exempt / Resolved states. A separate external control advances the pending-audit sample; it uses one fixed assessed outcome for review, not production seeded randomness or a claim that every zero filing is audited. No in-product fast-forward button or fake exemption purchase is introduced.

Figures are deliberate historical fixtures: $50,000 day-opening wealth → 4% blended rate; a $25,000 taxable return → $1,000 tax, with $2,000 fine if audited. Current-period sample is $300 gross less $50 operating costs → $250 base / $10 estimate. These are not recalculated from the toy asset simulation. No live tax accrual, elapsed-time engine or full tax-basis ledger is reimplemented here; source/rate/filing state composition is the design question.

Tax liabilities reduce the displayed net worth once. Paying assessed amounts reduces cash and liability together; it is not another net-worth loss. Allocation shares use gross assets and show tax liability separately. Pending audit exposure is separate from an assessed liability. Business detail labels the owner's forecast before Payout and says it is paid at filing, not withheld. Production quotes, statements and notifications must use the merged selectors, command revisions, basis and clock rules.

Runtime checks cover Profile/center Earn navigation, all tax fixtures, full/zero-report confirmation, honest installment shortfalls, purchase restrictions, audit sample idempotency, debt payment and transfer recovery. Existing markets, property register, achievements and settings remain. Native tax engine and screen checks run with merged main. Chrome visual preview remains unavailable.

## Copy reduction and clearer tax choices

Owner requested less text across the app and asked where the tax-payment choice is. Reduced default-view copy across the current study: figures and short action labels carry the interface; business figures, insurance and tax mechanics sit behind disclosures. Removed repeated status explanations, motivational copy, sample/engine implementation notes from product views, redundant market/chart labels, and property helper sentences. The external prototype note remains brief; detailed fixture limits remain here.

Tax filing now uses **Pay & file** and **Don’t report**. Both choices are visible but disabled during a current estimate, with a concise filing-open time; they become usable only when the return closes. Choose **Tax: return ready** in the outside-phone selector to review the interactive filing state. Before zero reporting, 40% audit risk and the $3,000 sample assessment remain visible; confirmation keeps the finality, cash effects, installment balance and audit delay. No early filing was added.

Tax default panels now prioritize status, amount, action and the relevant timer or recovery rate. Source accounting and rules are collapsed, rather than explained in several paragraphs. Essential transaction consequences, financial units, accessibility labels and the required fictional-assets notice remain. This is a copy/layout pass only; native rules and saves are unchanged.

## Review improvements: money, header, progression and small phones

Implemented the owner's approved review changes and the business-detail spacing correction:

- A shared cash-credit quote now drives both debt recovery and sale/withdrawal previews. Confirmations show before-recovery proceeds, recovery, cash received and cash after; stock sale activity records the net receipt. Cash flow in the header and Profile shows the same recovery-aware one-minute sample estimate. Final debt recovery is capped to the balance. This remains sample accounting; production must use the merged engine's receipt/remainder rules and reviewed quotes.
- The header keeps cash and cash flow. The goal strip appears on Earn only, including a pinned goal, without repeating a separate pinned card below. Profile stays in the fifth tab; its header shortcut remains only on detail/utility pages where the tab bar is absent.
- The Business back link and tier/stage label occupy separate blocks, with a 16px gap after the back block. The badge and title also have a clear gap.
- Grow shows machine count, current capacity and the next machine's capacity benefit alongside its Treasury price. It does not invent a profit increase where demand/stock could constrain it. Property records show renovation level instead of generic Residential metadata.
- Narrow layouts hide nonessential miniature market charts, give names/prices room to wrap, stack Profile shortcut content and use full-width primary confirmation actions. Bottom-tab captions are shorter with full accessibility labels; narrow columns preserve the center Earn position. Sample controls are collapsed outside the phone.

### Browser verification

The shared T3 preview failed twice with “T3 server is running as root; Chrome's sandbox cannot start.” The server was not restarted or changed. A separate local Playwright/Chromium process using the installed browser and a local file was used for checks, then closed.

Measured fourteen page/confirmation states at 320px and 390px, at normal and simulated 160% font size (56 combinations). The checks found no remaining horizontal overflow in the tested phone/header/content/row/sheet containers, and no page errors. Inspected business-detail, enlarged Profile and enlarged property-sale screenshots; that inspection led to full-width confirmation actions and readable bottom-tab captions. This is browser study evidence, not native Dynamic Type, safe-area or device verification.

Runtime smoke checks verify preview/commit cash agreement for market, property and business sales and withdrawals, capped final recovery, unchanged withdrawal net worth, consistent cash-flow figures, header entry points, machine-capacity updates and renovation metadata. Full repo checks pass on the merged branch.

## Decision-focused pass: Startup, attention and personal returns

Question: can the chosen compact Studio design make the next decision clearer without adding explanatory copy? Implemented the first three priorities approved in the UX review:

- **Progressive business detail.** A newly purchased Vending Machine starts at Startup with Overview, Grow and basic Operations staffing. Placement/stock, manager and insurance become visible at Local; the next unlocks stay behind a disclosure. Grow shows stage capacity, days owned, Treasury cost and unlocks. Unit caps (3/8/20/50/120), eligibility days (3/10/30/60) and Vending upgrade prices ($500/$2,000/$7,500/$30,000) follow BUS15. An outside-phone **Advance stage sample day** control moves only eligibility; it accrues no income, tax or simulated time. Staffing and later-stage deals remain discovery-only.
- **Actionable Earn attention.** One primary action addresses closed businesses, empty stock, ready returns/assessed debt or vacant property, with additional items collapsed. Restore stopped earnings before filing, then address unused property. Actions open the specific business section, tax statement or property; cash-to-Treasury transfers show their amount. A closed-business sample allows an explicit $100 deposit/reopen; a stock shortfall suggests its exact funding transfer before restocking. After resolution, the item disappears. When attention is clear, an affordable stage/unit upgrade can replace the former unowned-catalog suggestion. These are priority rules for this study, not an optimizer or a claim of best investment return.
- **Personal market performance.** Portfolio rows show quantity, average cost, position value and unrealized P&L in money and percent. Explore/Watchlist retain unit price and 24-hour market change. The supplied BKC holding loses $20 even though its market is up today, making the distinction reviewable. Asset detail and order confirmations remain reachable.

The Vending income illustration is linear ($100 daily profit per sample machine, $140 revenue less $40 costs), with the same ten-minute business-day display conversion already used in this study. Closed or empty Local businesses show zero sample earnings. This deliberately does not reproduce demand, staffing, wages, stock settlement or the native flagship economy; no production balance or accounting rule changed. A fresh purchase resets the sample to Startup. Production must consume actual stage, operations, quotes and eligibility selectors.

Validation: runtime smoke checks cover Startup-to-Local feature reveal and unit/day/Treasury gates, attention priority and resolution, deep links, explicit restock funding, reopening, vacancy and personal P&L versus market movement. Existing recovery/transaction checks still pass. Browser measurements cover 17 page/confirmation states at 320px/390px and normal/simulated 160% text size (68 combinations), with no checked-container horizontal overflow or page errors. Inspected Startup, attention and Portfolio screenshots. A wrapping Portfolio summary fixes the enlarged-text overflow found during this pass. The local browser closes after verification. Full repository checks pass; native implementation is unchanged.

Remaining ideas from the review—broader Treasury funding tools, production bottleneck diagnosis, actionable return summaries and stage-aware art—are separate future work.
