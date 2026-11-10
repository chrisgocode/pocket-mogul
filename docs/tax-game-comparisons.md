# Tax references and a complete discussion candidate for #93

Research date: 2026-11-08. Research only; no owner approval, gameplay change or spec amendment. The earlier `docs/tax-proposal.md` (flat 10%, automatic reserve) is superseded as a discussion direction and was left untouched. The candidate below is the research agent’s discussion draft, not a claim about another game or measured balance. The parent’s revised recommendation in `docs/tax-proposal.md` takes precedence, notably choosing one personal taxpayer rather than separate company debts, and a ten-minute audit delay.

## Evidence standard and scope

MOGUL retained code and Big Ambitions developer announcements provide the strongest mechanical evidence. Sim Companies supplies official-hosted guidance; Democracy 4 supplies a historical presentation lesson. Developer documentation describes intended behavior, not a runtime test. MOGUL evidence is retained application code, with decompiler limitations; no runtime verification was performed. No Reddit claims or community-wiki-only mechanics are used. Undated web pages were checked on the research date; search-engine crawl dates are not publication dates.

Pocket Fortune context: `docs/spec.md` §§5–12 specifies separate business treasuries, outside shareholders, twelve businesses, rental property, fictional stocks, crypto, taps, simulation-time settlement and an eight-hour offline cap. §9 counts treasuries, stakes and pending dividends in wealth. §14 and the supplied repository instructions require prospective activation, neutral additive state, explicit monetary history and reader compatibility. Current save/economy versions must be inspected at implementation time: the old proposal's version numbers are not an authoritative migration plan.

## Game comparisons

### MOGUL: closest mechanical comparison; medium confidence about shipped behavior

Primary artifact: `/root/.t3/research/mogul-decompiled/bundle.js`, with `strtable.txt` retained alongside it. Provenance/version/publication date are not established here. Exact anchors below identify this local artifact, not a public download. Earlier source-audit note: `/root/.t3/worktrees/pocket-mogul/t3-69209f71/docs/tax-reference-research.md`. There is no independently verified public URL for these precise mechanics; do not invent one. No proprietary code or player text is reproduced.

- `assessTaxAudit`, lines 389237–389347: honest filing returns no audit; creative uses 5% risk and an obligation of 3 times saved tax; offshore uses 12% and 4 times saved tax. Risk is scaled by bounded cycle proration. Existing obligations survive. These are amounts of saved tax, not multiples of gross wealth.
- `corporateTaxTerms`, 879247–879346: creative halves the corporate rate; offshore makes it zero. This establishes corporate evasion, not zero tax everywhere.
- `calcWealthTax`, 391145–391201; constants 389458–389510: marginal assessment of 0.5% over $10M up to $100M, 1% up to $1B, 1.5% up to $10B, 2% above. This is not a highest-rate charge on the entire fortune.
- `cashFlowPersonalTax`, 879717–879843: ordinary personal arithmetic excludes `ownerIncome`; that income participates in the wealth-charge cap. Wealth tax is bounded by 10% of recorded personal + owner + tap income and space below the combined 50% personal-tax ceiling. Do not merge this path with older rate-based estimates or infer that offshore eliminates this personal component.
- Earlier audit anchors for collection: `allocateTaxCash` 389101–389140; `runTaxCollection` 408093–408190 and 408850–409288. Cash can be followed by eligible asset liquidation; unpaid amounts persist. These collection observations rely on the earlier audit rather than a new full caller trace in this pass. Any repeated-penalty compounding is a path-dependent inference, not runtime proof.

Useful reference: separate honest/evasive filing, immutable saved-tax evidence, explicit outstanding debt and marginal wealth calculation. Recommendation: borrow the legibility, not its low audit chances or forced liquidation. At full-period probability, 5% × 3 = 0.15 and 12% × 4 = 0.48 of avoided tax as expected audit cost; those numbers alone do not meet our requested high-risk design. No permanent paid tax bypass is established by this artifact audit.

### Big Ambitions: explicit bills, partial payment and forecasts

Developer Hovgaard Games' [August 14, 2026 full-release preview](https://store.steampowered.com/news/app/1331550/view/693137779588071504) says taxes were rebalanced with more deductions, late payment carries a 10% fee, partial payments are allowed, and Econoview shows both current amounts owed and next year's estimate. **High confidence in the developer's dated description; not a runtime verification.** It does not establish an evasion probability or paid exemption.

The Steam page is JavaScript-heavy. The same first-party announcement was retrieved through [Valve's news API](https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=1331550&count=80&maxlength=0): title “Big Ambitions Full Release is TWO WEEKS AWAY”, news ID 1840944183780461, timestamp 1786730647. Parent independently inspected its Taxes section. Lesson: make upcoming bills visible and support partial payment rather than surprising players with unaffordable all-or-nothing collection. Our recovery percentage and no-late-fee choice are our own design.

### Sim Companies: liquid-holdings pressure, not manual tax evasion

[Official-site FAQ, section 14](https://www.simcompanies.com/pages/faq/) describes an accounting base of net bonds plus cash minus executives' allowance, a protected initial band, and fees automatically deducted daily. The page's current direct fetch returns the game's loader; indexed FAQ text exposed the mechanics during this research. The [publisher-hosted guide](https://guides.simcompanies.com/books/faq/page/frequently-asked-questions) and [official in-game newspaper issue 80](https://www.simcompanies.com/library/0/newspaper/80/) corroborate the theme, but the newspaper article is player-authored. **Medium confidence in the described system, with authorship/fetch limitations.** No audit or paid-exemption mechanism was established.

Lesson: wealth bands can make empire growth visible, but taxing cash holdings encourages moving cash elsewhere. We propose using whole net worth to weight profit tax instead, so a Treasury transfer does not change the rate. Exact rates are our own proposal, not copied from Sim Companies.

### Democracy 4: useful accounting/presentation lesson, weak evasion analogue

Developer Cliff Harris, [June 23, 2020: The fixed income rewrite](https://www.positech.co.uk/cliffsblog/2020/06/23/democracy-4-the-fixed-income-rewrite/), explains replacing exclusively proportional income effects with a model supporting fixed amounts too, after a voter-income breakdown exposed implausible distributional effects. **High confidence about the described development change; historical, not a current-build audit.** Lesson for us: display the causal income breakdown and test absolute as well as percentage effects; a superficially plausible rate can produce a bad progression experience.

His [May 23, 2020: Real World Numbers](https://www.positech.co.uk/cliffsblog/2020/05/23/real-world-numbers-in-democracy-4/) describes balancing the country's revenue mix and says the game then lacked a government-debt default option. This is a government-budget simulation, not a player personally filing a zero return. **High confidence in that dated statement, low applicability to our recovery design.** Neither post establishes a personal binary evasion probability, back-tax multiplier or permanent paid exemption. Do not use the author's discussion of his real company's tax rate as a Democracy gameplay constant.

### Comparables deliberately not claimed

Targeted searches for Torn tax-evasion announcements did not yield a first-party mechanic explanation sufficient for this comparison. No usable first-party BitLife tax-filing/audit/bypass specification was established either. This does not prove those games lack such content. No searched game establishes the complete requested combination of manual zero reporting, high audit risk, all-asset treatment and a roughly $0.99 lifetime exemption. Our final combination is a product decision.

## Discussion candidate: progressive income tax informed by net worth

All numbers below are concrete starting proposals for owner discussion and later balance simulation. The objective is a satisfying wealth progression with a consequential occasional filing choice, not repeated bookkeeping every ten-minute business day.

### Progression without cliffs

Use net worth to set an income-tax rate; do not repeatedly tax the asset principal itself. Include every asset in the existing §9 valuation, deduct assessed tax debt, clamp the rate's wealth input at zero, and use current wealth rather than irreversible peak wealth. Peak wealth continues to drive existing unlocks only. Exempt taps, including boosted taps, permanently, so manual recovery always earns money without generating new tax.

Define a weighted rate using these marginal wealth slices:

| Wealth slice | Weight in blended income rate | Presentation milestone |
| --- | --- | --- |
| First $10,000 | 0% | Getting started |
| $10,000–$100,000 | 5% | Small operator |
| $100,000–$1,000,000 | 10% | Investor |
| $1,000,000–$10,000,000 | 15% | Mogul |
| Above $10,000,000 | 20% | Empire |

Let F(W) be the sum of slice width × slice percentage up to W. The income-tax rate is F(W)/W for positive W, otherwise zero. F is a weighting calculation, **not a second bill on wealth**. At $100K the rate is 4.5%, at $1M 9.45%, at $10M 14.445%, approaching 20% for very large fortunes. Label the blended rate explicitly; milestone labels must not promise that the entire income suddenly switches to the slice percentage.

Snapshot W and its exact rational rate at each business-day opening, after prior-boundary settlement. That rate applies only to that day's eligible profit. A command at a boundary uses the new day; intra-day wealth changes affect tomorrow, never recompute earlier earnings. Opening the app or filing early cannot reset the day. This retains a one-day rate lag, deliberately disclosed, rather than sampling at filing time where spending could change an old bill.

Why avoid ordinary step rates: moving from 5% to 10% on *all* accumulated income at $100K could cost thousands for one extra dollar of wealth. Marginal slices make F continuous; blending makes the income rate continuous. A direct recurring wealth tax can charge a cash-poor investor despite zero income; it is unnecessary for the requested net-worth progression.

### Complete source accounting: one manual return, explicit company and personal lines

Proposed accounting model: company operating profits are assessed at the company, before payout, with no automatic cash reserve or payment. Personal rents, dividends from external stocks and realized capital gains are assessed personally. One return covers every owned company and the personal account; no per-company evasion settings or vague disposal exclusions.

| Source/event | Exact proposed treatment |
| --- | --- |
| Every business, including non-flagships and listed companies | Actual receipts less actual operating costs; full company's profit assessed before payout, not only the player's ownership fraction. Company bears its bill, so outside holders share its economic cost. The rate uses the player's day-opening wealth for this single-player game. |
| Business receipts/costs | Include customer receipts, memberships, contracts, manager bonus; deduct upkeep, per-customer costs, wages, signing, insurance, restocking, contract penalties and actual uninsured treasury losses once. Covered losses and reduced demand are not duplicate deductions. |
| Treasury deposits/withdrawals and payouts | Transfers/distributions, no new personal income tax: profit was already assessed at the company. Deposits from personal cash add owner's equity basis; withdrawals of capital reduce it. Treasury pays no separate wealth levy. Outside-holder distributions never enter personal income. |
| Rental property | Earned rent less actual upkeep; vacant property owes zero operating tax. Upgrade spending is capital. |
| External stocks | Earned dividends assessed when entitlement accrues, including pending earned dividends in the statement; later cash credit is a transfer. Sales realize proceeds after fees minus allocated purchase basis including buy fees. |
| Crypto | Same realized-gain rules, no invented staking or yield. |
| Private business sale | Tax disposal proceeds minus adjusted owner equity basis; treasury returned by the sale is included once in proceeds. The 60% capital-spending resale haircut normally creates a loss, not an exemption. |
| Listed player-company share sale or whole-business sale | Actual proceeds under §5.8, including its treasury component if that sale grants one, minus proportional adjusted basis. Tax only realized gain; do not substitute a second hypothetical valuation or exempt the whole category. |
| Buying back shares and delisting | Personal purchase spending adds basis in the shares acquired; delisting preserves total basis and undistributed-profit adjustments. No realization just because the listing ends. |
| IPO | New outside capital into treasury is financing, no operating income. Retained owner basis stays with retained owner shares; do not turn new outside funding into the owner's deductible contribution. Dilution itself is not a personal realization. |
| Takeovers, units, stage/quality/efficiency/signature upgrades | Capital, no immediate profit deduction. A takeover buys assets into the company, no duplicate personal gain. |
| Property sale | Actual 95%-of-value proceeds minus the sum of purchase price and recorded upgrade costs; no blanket exemption. Repurchase creates new basis, never restores consumed basis. |
| Market/asset revaluation | No income assessment until realization; included in next day's wealth weighting. |
| Taps/Tap Boost, wallet upgrades, badges, ad grants | Taps exempt; wallet spending neither deductible nor a saleable tax asset; badges and noncash ad grants create no taxable receipt. |
| Tax, audit fines, exemption purchase | Neither deductible operating costs nor asset basis. No loss credit from a tax payment or buying the IAP. |

Adjusted company equity basis is essential, not a later omission: start with personal acquisition/contribution cost; increase by the owner's share of positive operating profit already assessed by this system; decrease by owner distributions/withdrawals, ownership-allocated operating losses and the owner share of nondeductible company tax/fine liabilities when booked. Payment of an already-booked liability does not adjust basis again; reversing a provisional assessment reverses its basis adjustment. A negative residual basis is realized immediately as a personal gain and reset to zero. Retained profit is adjusted even when a zero report evades payment: the audit ledger handles that tax, preventing a later disposal from assessing the same profit twice. An unaudited zero report permanently escapes its original operating assessment, as the choice promises.

Internal company capital purchases do not add owner basis again: their funding is already represented by contributed capital or retained profit. Before every ownership change, settle profits and basis under the old share count; allocate basis pro rata on sales, record acquisition basis for buybacks, preserve deterministic remainders. Retain a company operating-loss pool across sale/rebuy by stable company ID; personal realized capital losses go to a combined capital pool (external stocks, crypto, property and business/share disposals). Rental losses stay by property; dividends have no loss pool. No cross-pool cash refund. Do not allow company operating losses also to produce a duplicate deductible disposal loss: subtract losses used against operating profit from the disposal basis as above.

For each pool/day, taxable base = max(0, signed profit − opening loss carryforward); closing loss = max(0, opening loss − signed profit). Losses offset future profit only in that pool, without repricing closed days. Within-day netting uses the opening day's rate; its order must not change final tax. Keep exact cents plus persistent fractional tax and ownership-allocation remainders. These rules require a genuine owner-basis ledger, including listing/delisting; that work belongs in the initial scope.

### Clock, filing and audit

- One tax period is 6 hours of eligible simulation time, aligned from prospective activation. It contains 36 business days. At most two new filing boundaries can occur during a capped eight-hour absence. Show one return flow with individually identified statements, not 48 popups.
- No wall-clock deadline, overnight penalties or tax periods for discarded offline time. Accrue profit to a boundary, close the old statement, resolve audits scheduled there, process ordinary boundary events, and open the next day/period before commands. Specify this order against §10's existing market/dividend-before-business ordering during implementation.
- Every positive closed statement requires a manual choice: **Full report — pay T** or **Report nothing — pay $0; 40% audit risk; if audited owe T back tax + 2T fine**. Zero-base statements close automatically with no risk. No partial filing, prorated early filing or automatic reserve. Preview ongoing estimates only.
- Filing freezes the statement and choice in the save. One seeded audit draw per evaded statement, keyed to its stable period ID and an audit stream, resolves at the first tax boundary strictly after filing. Splitting time, reopening, delaying or replaying a command cannot redraw or reduce its probability. Honest filing has no audit penalty.
- Unfiled returns wait for the player, including offline; no default zero filing. To prevent unlimited free deferral, an outstanding positive return must be filed before any new discretionary capital purchase, trade buy, upgrade, takeover offer or IPO. Existing earning, taps, sales, rent controls, risk-reducing business controls, payroll, restocking and tax actions remain available. No simulation freeze or forced real-time decision.
- File oldest first; each statement gets its own draw and outcome. An unaudited zero return is final, not secretly kept open for repeated chances. Audits do not reach earlier periods again. No buy-now-and-return-later rerolls.

### Collection and free recovery

Honest filing first collects only from the account that owes each line: company tax from that company's treasury, personal tax from personal cash. Player confirmation authorizes that debit. Full reporting with insufficient funds pays available money and creates a fixed debt for the rest, without an honesty fine; label this before confirming. An audit creates the original source-account debt for back tax and a fine twice that account's evaded tax, then collects available funds. Companies never raid another treasury or personal cash automatically; players can deposit or withdraw using existing controls.

After debt exists, divert 25% of that account's new positive net operating receipts toward its oldest assessed debt, with exact remainders; personal collection also takes 25% of incoming dividends, transfers from treasury and sale proceeds after fees. Never deduct the same incoming amount twice. Taps remain fully exempt from automatic recovery collection but can be used in a voluntary Pay debt action. Company collection occurs after operating costs and before payout; adjust cash available for payout and valuation, without changing the tax base. Same-day loss reconciliation may refund a collection taken from a now-nonpositive day's profit, up to what that day collected, and restore the debt by the refund; paid earlier-day debt is final. No interest, repeat late multipliers, frozen earnings, forced sale or negative cash.

While an account has debt, block that account's discretionary asset purchases, upgrades, buybacks and takeover commitments; personal debt also blocks funding new company deposits. Operating expenses, staff reductions, insurance renewal, restocking and profitable existing operations continue. A business/property disposal with source debt first uses its proceeds to clear that debt, including a fine, before crediting personal cash; transfer any residual company debt to the personal ledger so selling/rebuying cannot erase it. Permit voluntary debt payment, cash contributions to a company solely for immediate debt payment, and asset sales with normal confirmation. The 25% diversion can coexist with next-period taxes, whose honest rate stays below 20%, leaving positive receipts for recovery. Do not compound tax on collection itself.

Debt is a liability in net worth immediately; repayment reduces cash and debt together without a second wealth hit. Company valuation subtracts company debt before the owner's proportion is counted. A zero report removes its provisional tax estimate from booked liabilities; a successful later audit books back tax and fine once. Preserve gross asset value, net worth, estimated honest bill, paid tax, fines, evaded tax and outstanding debt as distinct figures.

This collection plan is proposed gameplay, not a reference-game fact. It needs live/offline and loss-order simulation; 25% is not claimed balanced. It guarantees the player retains an earning path and never needs the purchase to resume play.

### Expected value and strategic caveat

For a fixed honest bill T, zero reporting costs zero now and either zero or 3T after one audit. Expected undiscounted cost is 0.40 × 3T = 1.20T, versus T honestly. The fine is **2T in addition to back tax**, not an extra 3T. Two independent zero reports both escaping has probability 0.6² = 36%; ten all escaping is about 0.605%. These are calculations for this proposal, not observed game outcomes.

Expected tax alone does not prove honesty wins: retained cash can buy compounding upgrades before an audit, debt can be deferred, and an IAP could erase a scheduled audit. Simulate honest/evasive strategies with reinvestment, all payout settings, eight-hour returns, share/IPO operations and debt constraints. Reject a tuning where evasion dominates all progression paths or an audit makes recovery intolerable. Show probability and exact possible bill before confirmation; avoid implying 40% means a guaranteed audit after a certain number of filings.

## Future one-time tax exemption: official store mechanics and proposed contract

### What the stores establish

**Apple, official current documentation, accessed 2026-11-08; high confidence in documented behavior:** [In-App Purchase overview](https://developer.apple.com/in-app-purchase/) supports non-consumables, restore mechanisms and US $0.99 pricing within its listed price conventions. [Set an IAP price](https://developer.apple.com/help/app-store-connect/manage-in-app-purchases/set-a-price-for-an-in-app-purchase/) describes a base storefront, localized prices adjusted for exchange rates/taxes, and regional overrides. [Product.displayPrice](https://developer.apple.com/documentation/storekit/product/displayprice) supplies the localized price string. Thus $0.99 is a US target, not a worldwide literal.

[Current entitlements](https://developer.apple.com/documentation/storekit/transaction/currententitlements) omits refunded/revoked products. [Transaction verification](https://developer.apple.com/documentation/storekit/transaction) distinguishes verified from unverified data. [Restore purchases](https://developer.apple.com/documentation/storekit/restoring-purchased-products) requires a user-accessible restoration mechanism; that article contains StoreKit 1 guidance, so do not copy its replay mechanism into a StoreKit 2 integration. [AppStore.sync](https://developer.apple.com/documentation/storekit/appstore/sync()) is the StoreKit 2 reconciliation API. Use automatic current-entitlement reconciliation plus an explicit Restore Purchases action; verify transactions and handle entitlement updates. Pending/unverified results must not grant exemption.

**Google, official current documentation, accessed 2026-11-08; high confidence in documented behavior:** [One-time products](https://developer.android.com/google/play/billing/one-time-products) distinguishes consumable and non-consumable benefits. [Billing integration](https://developer.android.com/google/play/billing/integrate) requires verification, grants only PURCHASED rather than PENDING, recommends querying purchases on billing connection/foreground, and requires acknowledging non-consumables within three days or they are refunded/revoked. Never consume this product or enable repeat/multiple-quantity purchasing. Product details supply localized display information; query current details before checkout.

[Play security guidance](https://developer.android.com/google/play/billing/security) recommends backend verification and revoking voided orders; [Voided Purchases](https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.voidedpurchases) covers cancellation, refunds and chargebacks. [Play price setup](https://support.google.com/googleplay/android-developer/answer/6334373) describes currency conversion, taxes in selected countries and local pricing conventions. Configure a US $0.99 target if permitted in the actual console/regions and review localized prices; no console configuration or storefront availability was verified here. Store documentation has no universal guaranteed exchange price.

### Complete proposed benefit and failure behavior

Use one permanent, non-consumable tax exemption per store account, with a single platform product mapping to one game entitlement. One purchase covers all saves and future resets on that platform/account. Do not promise Apple-to-Google transfer without an account/backend design: neither platform's restore API restores the other's purchases. Leave Apple Family Sharing disabled initially; do not advertise it.

On the first verified activation, settle the current game interval atomically, then cancel every unpaid ordinary tax estimate, unfiled statement, scheduled audit, back-tax debt and fine in that save; retain historical payments and give no cash refunds. Exempt all future companies, rentals, dividends and capital disposals automatically, including acquisitions after purchase. This is a deliberate amnesty benefit so “never pay taxes” has no hidden old-bill exception. It also makes buying after evasion economically attractive; that is a product tradeoff to approve, not an accident. Show the purchase in Settings/Taxes rather than as a rescue modal after an audit.

Maintain the entitlement outside resettable gameplay data. New verified restores activate exemption before advancing restored/new gameplay. A local save containing a claimed flag is not proof of a purchase. Normal offline play retains the last verified entitlement; a transient network error is not a revocation. A fresh installation without verified cached proof offers Restore and requires a successful store check before granting the benefit. Do not accrue retrospective tax for intervals already played under a valid cached entitlement.

On confirmed refund/revocation, end exemption prospectively at the next committed settlement boundary, open a new taxable interval and explain the change. Never reconstruct waived old tax or revive forgiven debt. Replayed purchase/restore callbacks do not repeat amnesty or grant money. An actual later valid repurchase may activate the benefit again; verify it rather than trusting old local records. Use verified transaction identity plus an idempotent game command and persist transaction handling before final acknowledgement/finish.

A purely local game cannot guarantee instantaneous offline revocation or prevent editing its own files. Explicit engineering recommendation for the later IAP issue: native verified entitlement handling and durable local cache, with a small backend for Google token verification/voided-order processing and store notifications if dependable revocation is required. That is real added infrastructure, not completed by this research. The tax feature can ship first with an entitlement port that defaults to unavailable; do not show a dead purchase button or imply the IAP already exists.

## Owner decision and implementation boundary

The candidate closes the asset-scope question rather than postponing player-company equity, but it is appreciably more work than flat withholding: owner basis, separate company/personal debt, grouping returns, a seeded audit lifecycle, collection recovery and later store entitlement handling are all explicit scope. Before implementation, decide whether this complete candidate matches the desired experience, especially the blended wealth rate, 6-hour cadence, 40%/3T risk, investment restrictions and purchase amnesty.

After approval, measure wealth milestones and recovery, reconcile statement/wealth/quote/return-summary presentation, specify source ownership transitions and migration fixtures, then update the authoritative spec through the normal issue/PR workflow. No balance result, store approval, runtime comparable verification or implementation test is claimed by this note.
