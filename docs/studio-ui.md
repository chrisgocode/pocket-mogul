# Studio UI · #82

The approved Ledger/Studio study is implemented as native Expo screens. The historical HTML reference is preserved at commit `88591bc` on this PR's history; it is not bundled or shipped. Screens use actual engine snapshots, application selectors and existing commands. No sample economy, tax ledger, clock, state fixtures or browser controls enter the app.

## Approved direction

- Businesses / Markets / Earn / Properties / Profile. Earn is the center tab and the initial landing route. Each section uses its Studio accent against charcoal surfaces: teal, lavender, amber, terracotta and blue.
- A shared cash/cash-flow header replaces repeated cash cards. Cash includes pending taps and elapsed settlement; the cash-flow estimate quotes existing tax-debt recovery with its carried remainder. Filing tax is not ordinary withholding.
- Businesses shows carrying net worth, Owned / Tier chips and clean illustrated rows. Business detail separates the native back navigation from tier/stage and name. Startup shows the shared core; Local exposes the flagship mechanic, manager and insurance. Regional exposes Deals. Active incidents remain visible regardless of stage. Daily accounting is behind a disclosure; real stage eligibility, growth and confirmation quotes remain authoritative.
- Earn shows pinned goals, net worth, payouts/rent, prioritized attention, the wallet and growth opportunities. Closed businesses and empty vending stock route to Treasury or the mechanic; ready returns/debt and vacant property route to their real screens. Additional attention is collapsed. Nothing is automatically spent or filed.
- Markets separates Portfolio, Explore and Watchlist. Portfolio shows quantity, average basis, position value and personal unrealized P&L. Explore supports stocks/crypto, search and sorting, with price/change this market hour. Production market time units replace the study's illustrative 24h labels. Trading unlock, fees, revisions and confirmations are unchanged.
- Properties uses an original numbered register, small vector buildings, renovation metadata, estimated value and net/gross rental figures. Owned filtering, buying, renting, upgrades and selling operate on the existing property commands.
- Profile groups compact Wealth, allocation, Holdings and Activity with Goals, Taxes and Settings. Holdings open the corresponding detail. Goals filters and pinning preserve earned badges; no bonus money is introduced.
- Tax choices are Pay & file / Don’t report. Current estimates show the future choices disabled. Ready returns show the available payment and audit risk before confirmation. Source accounting, rules and payment history use disclosures; assessment, debt, fine and cash consequences remain explicit at the decision.

## Validation

Native screen tests follow the visible filters/disclosures while retaining accounting and command assertions. Application selector tests cover attention order, growth eligibility, market search/sorting and recovery-aware cash-flow estimates. The PR contains Release simulator screenshots and recording, independent Standards/Spec review and the full repository check results. The later pre-release UX pass remains separate from this implementation.
