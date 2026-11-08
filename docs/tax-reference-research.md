# MOGUL tax reference: observed mechanics and Pocket Mogul implications

Planning ticket: [#93 — taxes](https://github.com/chrisgocode/pocket-mogul/issues/93).

Research date: 2026-11-08. Scope: retained source inspection, not runtime verification or real-world tax advice.
This records source observations and design proposals. Tax rules remain unapproved; the current spec and economy are unchanged.

## Evidence and confidence

- Primary source: `/root/.t3/research/mogul-decompiled/bundle.js`; line spans below refer to this exact retained file.
- Supporting source: `/root/.t3/research/mogul-decompiled/strtable.txt`; its line numbers are separate.
- **Confirmed** means an explicit constant, state transition or arithmetic operation in the retained code.
- **Path-dependent inference** means behavior inferred from callers, state shape or multiple cooperating functions.
- **Risk** means a design concern or unverified interaction, not a demonstrated runtime bug.
- The decompiler contains implausible type tests, register reuse and iterator output. Read named functions, data fields, constants and callers together; do not execute this reconstructed JavaScript as authoritative source.
- No proprietary implementation, asset names, art or player-facing prose is reproduced here; identifiers below are evidence anchors.

## Confirmed: rates and two different tax models

1. The exported company tier rates are 18%, 25%, 30%, 35%; the dividend/personal-income rate is 18%, property rate 20%, tap rate 30%.
   Evidence: tax-module export bindings, `bundle.js:389348–389425`; constant assignments, `389458–389490`.
2. `corporateTaxTerms` selects a rate by business kind, applies the country's multiplier, and caps the honest company rate at 50%.
   Honest filing keeps that rate, creative filing halves it, offshore filing makes it zero; an unrecognized business kind starts at zero.
   Evidence: `corporateTaxTerms`, `879247–879346`; `businessTaxTermsFor`, `886450–886498` passes country and filing method.
3. The personal cash-flow model records `personalIncome`, `ownerIncome` and `corporateSavings` separately, with version 1 and an epoch.
   Evidence: `newCashFlowTax`, `879188–879206`; `repairCashFlowTax`, `879041–879187`.
4. `accruePersonalTaxIncome` adds only positive credited amounts; it does not itself subtract spending or losses from the accumulated base.
   Evidence: `accruePersonalTaxIncome`, `879207–879246`.
5. `cashFlowPersonalTax` taxes accumulated personal income at the dividend rate and taps at the tap rate, each adjusted for country and capped at 50%.
   `ownerIncome` is absent from ordinary income-tax arithmetic, but included in the income used to limit wealth tax.
   Evidence: `cashFlowPersonalTax`, `879717–879812`.
6. Its wealth charge is the minimum of the supplied wealth assessment, 10% of recorded personal + owner + tap income, and the remaining space below a 50% combined personal-tax ceiling.
   Thus a player with valuable assets but zero recorded income has zero wealth charge on this path.
   Evidence: `cashFlowPersonalTax`, `879800–879842`; caller supplies country-adjusted wealth assessment in `runTaxCollection`, `406968–406987`.
7. `calcWealthTax` applies marginal bands above $10 million: 0.5% to $100 million, 1% to $1 billion, 1.5% to $10 billion, then 2%.
   This is a progressive assessment, not the highest rate applied to the whole fortune.
   Evidence: `calcWealthTax`, `391145–391200`; tax constants, `389488–389508`.
8. Legacy collection estimates taxes from current business profit and current portfolio yield, rather than solely from credited receipts.
   `getTaxableBizDaily` clamps profit to nonnegative and applies specialization/synergy multipliers; it is used in these estimates.
   Evidence: `runTaxCollection`, `407015–407065`, `407355–407384`; `getTaxableBizDaily`, `887678–887734`.
9. With `cashFlowTax` present, the legacy business-estimate multiplier becomes zero and the personal income/tap/wealth totals come from `cashFlowPersonalTax`.
   The old liquid-wealth cap remains in the fallback branch; the cash-flow branch uses its income cap instead.
   Evidence: `runTaxCollection`, `406922–406932`, `407374–407384`, `407427–407435`, `407654–407664`.
10. New games initialize a cash-flow record. A load path calls `repairLegacyTaxBill` before subsequent settlement.
    For an older tax record, repair replaces the estimated pending obligation with at most the retained tap-tax component, starts a cash-flow record and records legacy relief.
    Evidence: `buildInitialState`, `391204–391228`; load callback `_fun49527`, `424178–424212`; `repairLegacyTaxBill`, `879347–879550`.
    **Inference:** the cash-flow rules are the intended current model; legacy formulas still visible in the bundle are not proof that a newly created game pays both systems.

## Confirmed: receipt tracking, transfers and layered taxation

- `trackCompanyTaxReceipts` tracks positive changes in lifetime owner cash paid and corporate tax saved, only when finance changes and epochs match.
  It adds those deltas to `ownerIncome` and `corporateSavings`; it does not treat the whole treasury balance as fresh personal earnings.
  Evidence: `trackCompanyTaxReceipts`, `879552–879716`; update wrapper call, `410788`.
- Foreground settlement explicitly separates raw company cash from general passive income before adding personal receipts; it then tracks company receipts.
  The load/offline settlement path has corresponding separation and tracking.
  Evidence: foreground callback, `446475–446490`; load callback `_fun49527`, `424564–424595`.
- A concrete corporate-fee path computes tax on an earned fee, puts the after-tax amount in company treasury, and records tax paid and tax saved.
  Evidence: underwriting callback `_fun30523`, `1133083–1133197`.
- **Inference:** exclusion of owner payouts from ordinary personal income tax appears deliberate protection against taxing company profit twice as ordinary income.
  Payouts still expand the wealth-tax cap, so the personal charge can coexist with a prior company charge; this is layered taxation, not automatically a defect.
- **Risk:** neither a positive-only personal accumulator nor a lifetime owner-payout delta proves correct handling of returned deposits, borrowed principal, sale principal or refunds.
  Every credit path needs classification. Do not conclude that MOGUL taxes all transfers merely because a helper accepts a positive amount.

## Confirmed: billing, collection, unpaid balances and audits

- The tax period is 172,800,000 ms (48 wall-clock hours); grace is also 48 hours; warning thresholds are 24 and 6 hours; late collection multiplies an obligation by 1.25.
  Evidence: exports/constants, `388943–388972`, `389458–389477`.
- A 30-second foreground interval uses `Date.now`, checks issued-bill/audit age, then cycle age. On issuance it saves the amount and corporate savings, resets cycle receipts/taps, and sets the issue timestamp.
  Evidence: tax effect `_fun39048`, `447201–447253`; issuance callback `_fun45124`, `448065–448145`.
- `taxAmountDue` prefers a valid positive stored bill when one has been issued; otherwise it uses the nonnegative current calculation.
  An issued bill therefore does not simply shrink because the player spends cash or changes current earning rates.
  Evidence: `taxAmountDue`, `389047–389080`; `runTaxCollection`, `407692–407708`.
- Manual payment calls `runTaxCollection` at multiplier 1; before issuance it prorates by elapsed wall time divided by the tax period, bounded to 1.
  Overdue bill and audit callbacks call the same collector with the late multiplier; an audit has a separate obligation record.
  Evidence: manual-payment callback `_fun38953`, `415786–415847`; overdue callbacks `_fun45114`/`_fun45113`, `448276–448368`.
- `allocateTaxCash` normalizes available cash and due amount, consumes the lesser, and returns cash remaining, cash used and shortfall.
  Evidence: `allocateTaxCash`, `389101–389140`; collection call, `408093–408105`.
- After cash, collection can sell eligible luxury assets and market holdings; home/residency-vault restrictions filter some luxury assets.
  Collections mutate holdings and record sale proceeds for the collection report.
  Evidence: `runTaxCollection`, `408106–408190`, `408850–409166`.
- An unpaid cycle shortfall is saved back as `pendingTaxAmount` with a new issue timestamp; an unpaid audit updates its amount and assessment timestamp.
  Successful cycle collection clears the bill; successful audit collection clears the audit separately.
  Evidence: `runTaxCollection`, `409172–409288`.
- **Inference:** a remaining shortfall can face another late collection after its timestamp is renewed; applying 1.25 to that remainder can compound prior penalty debt.
  The transition supports that outcome, but no repeated-late-payment runtime experiment was performed.
- `assessTaxAudit` preserves an existing obligation, ignores honest filing, and bases risk on recorded tax savings.
  Creative filing uses 5% probability and 3× saved tax; offshore uses 12% and 4×; probability scales by bounded cycle proration.
  Evidence: `assessTaxAudit`, `389237–389347`; collection invocation, `407609–407631`; repair, `389141–389236`.
- **Risk:** proration changes audit probability; early manual collections and repeated periods deserve explicit expected-cost analysis before borrowing this mechanic.

## UI, offline and market-gain uncertainty

- The collection modal distinguishes incomplete payment, audit payment, cash paid, sold items and unpaid amounts; it is a collection report, not just a pre-payment quote.
  Evidence: `TaxModal`, `387863–387933`, `388035–388124`; report construction, `409014–409073`.
- Its rate list includes three company tiers, dividend, property and taps, while collection builds rates for four tiers plus a fifth grouping.
  **Risk:** a player cannot reconstruct every assessed category from that abbreviated rate legend.
  Evidence: `TaxModal`, `387952–387994`; `runTaxCollection`, `408007–408020`.
- Retained help claims unpaid bills stop passive earnings and also describes profits arriving directly in personal cash.
  **Confirmed as retained text only:** `strtable.txt:184682` and `220581`. These statements are not proof of current runtime behavior.
  **Risk:** they may describe older rules; cash-flow treasury code and earned-receipt tracking require a fresh explanation. No universal income-freeze claim is established here.
- Tax deadlines are wall-clock based; offline earnings accounting uses paid time and a separate company/personal split.
  **Risk:** a long absence can age debt independently of eligible earnings; do not port these deadlines into a capped simulation without defining their clock.
  Evidence: tax effect `_fun39048`, `447215–447253`; load settlement `_fun49527`, `424575–424589`.
- Market execution records realized P&L independently from holding changes and proceeds.
  The inspected tax calculator does not read realized P&L; a universal realized-gains tax was not established.
  Evidence: market callback `_fun45077`, `430618–430674`; `cashFlowPersonalTax`, `879717–879842`.
- **Risk:** forced sales change positions during collection; their basis/P&L and subsequent tax treatment need tracing before claiming either missing gains tax or recursive tax-on-tax.
  In particular, a collection sale is not evidence that its entire proceeds become taxable personal income.

## Improvements for Pocket Mogul planning

The existing model is defined by `GLOSSARY.md` (Business day, Treasury, Payout, Offline cap) and `docs/spec.md` §§5.2–5.4, 9–10, 12 (treasury settlement and cost basis).
These are design proposals, not changes to the current spec or a proposed implementation scope:

1. Use simulation time for any assessment period: 10-minute business days, with at most 48 days credited by an 8-hour offline settlement. Discarded absence must not create extra bills or penalties.
2. Prefer automatic company withholding from positive settled operating profit before the treasury/payout split; clearly show gross profit, tax, retained treasury and personal payout. Avoid a bill that freezes the earnings needed to pay it.
3. Choose one ordinary-income treatment for company profit. Keep personal deposits, withdrawals, payouts already taxed at source, loans, asset-sale principal and returned capital explicitly classified to prevent accidental double taxation.
4. Tax realized market gains from net proceeds minus allocated basis, using the existing partial-sale rules; define loss offsets and rounding. Unrealized appreciation and gross sale proceeds are not realized profit.
5. If personal income or wealth taxes are added, state their base, exclusions, period, payer and cap separately. A treasury withdrawal should not change lifetime tax merely by moving money between owned accounts.
6. Preserve personal-cash and treasury boundaries. Prefer withholding/reserves over surprise liquidation; any optional debt mechanic needs visible principal/penalty separation, bounded consequences and a feasible recovery path.
7. Use one durable settlement result for live play, offline processing and the Return summary; saving/retrying/dismissing must not assess or collect twice. Explain taxes alongside credited earnings and treasury growth.
8. Validate rate/price changes, partial sales, zero/loss profit, deposit/withdraw round trips, listed outside payouts, exact boundaries, segmentation rounding, crash recovery and long capped absences before balancing rates.

## Recommended decision path

The parent planning proposal is in #93. It favors source-level withholding/reservation with a readable statement each Business day, taps exempt initially, and explicit treatment of profit, loss offsets, returned capital and already-taxed Payout. Rates, allowances and taxable sale gains remain decisions, not accepted content.

A material additional edge case is restocking: the Pocket Mogul spec currently charges it directly from Treasury, outside the quoted day-profit calculation (§5.9). A tax base built only from displayed operating profit would omit this expense. Same-period expense reconciliation must be specified before positive-profit withholding is implemented, including reserve release, period boundaries and a business sold mid-period. This follows our spec, not a claim about MOGUL.

Reserve spendability and net-worth treatment, listed-company stake sales, prospective activation on old saves and reader compatibility also belong in the design. Taxes will affect progression: balance must be remeasured after the model is approved. The current economy and prototype are unchanged by this note.
