# Studio UI · #82

The approved Ledger/Studio study is implemented as native Expo screens. The historical HTML reference is preserved at commit `88591bc` on this PR's history; it is not bundled or shipped. Screens use actual engine snapshots, application selectors and existing commands. No sample economy, tax ledger, clock, state fixtures or browser controls enter the app.

## Approved direction

- Businesses / Markets / Earn / Properties / Profile. Earn is the center tab and the initial landing route. Each section uses its Studio accent against charcoal surfaces: teal, lavender, amber, terracotta and blue.
- A shared cash/cash-flow header replaces repeated cash cards. Cash includes pending taps and elapsed settlement; the cash-flow estimate quotes existing tax-debt recovery with its carried remainder. Filing tax is not ordinary withholding.
- Businesses shows carrying net worth, Owned / Tier chips and clean illustrated rows. Business detail separates the native back navigation from tier/stage and name. Startup shows the shared core; Local exposes the flagship mechanic, manager and insurance. Regional exposes Deals. Active incidents remain visible regardless of stage. Daily accounting is behind a disclosure; real stage eligibility, growth and confirmation quotes remain authoritative.
- Earn keeps the wallet tap target and Tap Boost in one card, above the permanent wallet upgrade. The player chooses “Watch ad · 5x for 60s”; only an earned reward starts the boost. The same card shows ad availability, pending rewards and the active countdown.
- Earn shows pinned goals, net worth, payouts/rent, prioritized attention, the wallet and growth opportunities. Closed businesses and empty vending stock route to Treasury or the mechanic; ready returns/debt and vacant property route to their real screens. Additional attention is collapsed. Nothing is automatically spent or filed.
- Markets separates Portfolio, Explore and Watchlist. Portfolio shows quantity, average basis, position value and personal unrealized P&L. Explore supports stocks/crypto, search and sorting, with price/change this market hour. Production market time units replace the study's illustrative 24h labels. Trading unlock, fees, revisions and confirmations are unchanged.
- Properties uses an original numbered register, small vector buildings, renovation metadata, estimated value and net/gross rental figures. Owned filtering, buying, renting, upgrades and selling operate on the existing property commands.
- Profile groups compact Wealth, allocation, Holdings and Activity with Goals, Taxes and Settings. Holdings open the corresponding detail. Goals filters and pinning preserve earned badges; no bonus money is introduced.
- Tax choices are Pay & file / Don’t report. Current estimates show the future choices disabled. Ready returns show the available payment and audit risk before confirmation. Source accounting, rules and payment history use disclosures; assessment, debt, fine and cash consequences remain explicit at the decision.

## Validation

Native screen tests follow the visible filters/disclosures while retaining accounting and command assertions. Application selector tests cover attention order, growth eligibility, market search/sorting and recovery-aware cash-flow estimates. The PR contains Release simulator screenshots and recording, independent Standards/Spec review and the full repository check results. The later pre-release UX pass remains separate from this implementation.

## Native review follow-up

Independent Standards and Spec review found two P2 requirements issues: coin news used the stock feed, and the business counter omitted retained listed stakes. Both are fixed and covered by native/selector regressions. The business-specific counter includes private carrying value and retained listed equity; Profile allocation still classifies that equity under Markets, so total net worth counts it once.

Review also improved complete property-card accessibility labels, focus/layout handling for business section anchors, and Earn selector cost. Attention now settles once and reads only operations/restock data; growth reads stage/unit eligibility. Earn computes attention once and skips growth work while attention exists. The same 12-business/200ms-pending fixture improved from about 22ms to 2ms per selector pass in Bun; this is a development benchmark, not a device performance guarantee.

Simulator inspection also verified native attention → Locations scrolling and a real Treasury restock. Business, market and property details now expose explicit category back actions, including direct entry from Earn. Shared spacing is compact, and the default Earn goal strip shows the next achievement and earned badge count. These refinements are included in the final native media.

## Visual UX once-over

A subagent reviewed nine native screenshots, recording frames and alternate-state source for placement, copy, navigation and financial clarity. Three follow-ups are implemented: assessed debt/payment precedes return history and future filing controls; closed Owned rows say “Closed · deposit to reopen” and use “Manage” instead of implying they are open/earning; Goals consistently names the Earn tab. Native regressions cover closed-state presentation, debt-action order and Earn wording. Optional pre-release polish remains shortening the Profile liability label and keeping large-text `/min` together; larger text is readable and scrollable.

## Studio objects · option A

The selected A direction replaces thin business wireframes and their unrelated background rectangles with compact solid SVG objects. All twelve businesses have a distinct silhouette, using muted mint, cream, clay, slate and lavender. The artwork is decorative; business names and status remain the accessible content of each row.

Primary buttons retain their section accent with a subtle gradient, top highlight and shallow lower edge. Pressing depresses the control; reduced motion uses opacity feedback. Secondary buttons use a quiet surface and outline. Disabled actions keep their disabled semantics and lose the highlight and shadow. Touch targets and wrapping labels remain intact. This implements A without the stage-dependent artwork or progression cards explored in C.
