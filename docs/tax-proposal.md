# Manual taxes, wealth progression and evasion: proposal for #93

Status: approved by the owner in this implementation session, 2026-11-08; authoritative requirements are TAX01–TAX12 in docs/spec.md. Supersedes the flat-10% automatic-reserve proposal. This decision record supplies rationale and examples for the implementation. Research and first-party references: [tax-game-comparisons.md](tax-game-comparisons.md).

## Experience and scope

Taxes become an empire-management decision: earn, review a return, then report everything or report nothing and risk an audit. Wealth increases the rate on profits; simply owning an expensive asset does not generate a bill. Taps and Tap Boost remain exempt. No automatic withholding or protected reserve is used for ordinary tax.

Include every existing asset category in this design: all twelve businesses, rentals, fictional stocks, crypto, player-company shares, sales, IPOs and delisting. There are no temporary disposal exemptions. One personal tax account owns the player's obligations. The player's share of business profit is assessed when earned, including retained profit; subsequent Payout or withdrawal is a transfer. This deliberately replaces the earlier corporate-withholding proposal with pass-through accounting suited to manual filing. Outside shareholders' economic share never becomes the player's taxable income.

The eventual permanent tax-exemption purchase is fully specified here. Its store launch remains future work because the owner explicitly described microtransactions as a future feature. The tax delivery must include and test its entitlement boundary; it must not present a fake or unavailable checkout as a finished purchase feature.

## Wealth bands and rates

Use current net worth, including every existing wealth category and subtracting the player's tax liabilities once. Never use personal cash alone or irreversible peak wealth. Snapshot the rate at the beginning of each Business day, after settlement and boundary changes; record that rate with the day. Acquisitions, transfers, filing and wealth changes never reprice an earlier day.

| Portion of net worth | Weight used to calculate the income rate |
| --- | --- |
| First $10,000 | 0% |
| $10,000–$100,000 | 5% |
| $100,000–$1,000,000 | 10% |
| $1,000,000–$10,000,000 | 15% |
| Above $10,000,000 | 20% |

Blend these slices: add each occupied slice multiplied by its weight, then divide by total positive net worth. At zero/negative wealth the rate is zero. This sum is a rate calculation, not a wealth-tax charge. It gives 4.5% at $100K, 9.45% at $1M, 14.445% at $10M and approaches 20%. Crossing a band cannot suddenly apply its headline percentage to the whole fortune or all prior income. Show both the band and actual blended rate; display rounding never changes assessment arithmetic.

All tax parameters live in versioned content. These are candidate balance settings, not measured balance claims. Convert each day's blended rate to whole basis points by flooring once (one basis point is 0.01 percentage point), then freeze it. Thus $10M uses 14.44% rather than the unrounded 14.445%. Carry tax numerators over a fixed denominator of 10,000 across days and commands. This bounds save sizes and makes tiny advances agree with long advances; displayed percentages never independently round the bill. The only rate steps are this disclosed one-basis-point quantization, not a jump to the entire next band.

## Accounting and loss treatment

An accounting period is one Business day (ten simulation minutes). A return groups 36 such days (six eligible simulation hours). Day-level profit/loss reconciliation is independent of the order of receipts and deductible costs inside that day. Different days can have different rates: moving an actual expense across a day boundary is a chronological accounting change, not the same-period ordering invariant.

| Event | Treatment |
| --- | --- |
| Business profit | Actual revenue, memberships, contracts and manager bonus minus actual customer costs, upkeep, wages, signing fees, premiums, restocking, contract penalties and uninsured cash incident losses. Assess only the owner's economic share as it is earned, before applying the Payout setting. |
| Incident effects | Reduced demand/capacity reduces earned receipts; it creates no second deduction. Insurance-covered costs are not paid losses. |
| Units, upgrades, stages, signatures and takeovers | Capital spending, not immediate deductions. Company-funded spending does not add to personal ownership basis a second time. |
| Rent | Earned rent less actual upkeep. Vacant property creates neither income nor upkeep tax deductions. Property upgrades are capital. |
| External-stock dividends | Assess when earned, including pending accrued dividends; crediting that entitlement to cash later is a transfer. No invented crypto yield. |
| External stock and crypto sales | Realized gain equals sale notional minus selling fee minus allocated tax basis; buy fees are part of basis. Partial sales allocate proportionally; the final sale consumes the exact remainder. |
| Private-business sale | Cash actually received, including returned Treasury once, minus adjusted owner equity basis. Deduct a genuine disposal loss through the capital-loss pool. |
| Listed-company share sales | Net actual sale proceeds minus proportional adjusted ownership basis. A whole-business exit disposes of the remaining position once; no second tax event for the same retained shares. |
| Property sale | Actual net sale proceeds minus purchase and upgrade tax basis; gains taxable, losses deductible through the capital pool. |
| Deposits, withdrawals and Payout | No new taxable receipt. They update equity basis where appropriate, as specified below. |
| IPO | New outside funding is capital, not operating income or the player's contribution. It creates no personal realization. The owner's total existing basis carries into the retained shares; it is not reduced simply by dilution. |
| Buyback/delisting | Personal buy spending plus fees adds ownership basis. Buying all outstanding shares carries the resulting basis back into private ownership without realizing a gain or resetting history. |
| Unrealized appreciation | No income tax; it affects the next day's wealth weighting only. |
| Taps, boosts, wallet upgrades and noncash badges/ad grants | Taps are exempt; wallet spending is not deductible; noncash unlocks create no taxable receipt. |
| Tax, fines and real-money purchase | Neither an operating deduction nor investment basis. |

Maintain separate operating-loss pools per business and rental, one capital-loss pool across all disposals, and a dividend pool without loss deductions. Pools belong to the player and survive zero holdings, closure, sale, repurchase and delisting. Outside holders' losses never enter them. Same-day gains and losses net before assessment. With signed daily profit P and opening loss L, taxable base is max(0, P − L), closing loss is max(0, L − P). Losses carry indefinitely; they cannot refund an earlier day's final tax or create cash. No selling/rebuying reset of pools, basis or fractional remainders.

Company equity basis starts at personal acquisition/contribution cost, increases by the owner's earned operating profit, and decreases by owner distributions, withdrawals and operating losses. Settle under the old share count immediately before every ownership change. A withdrawal cannot both return capital tax-free and leave that same capital available as deductible disposal basis. If distributions exhaust basis, any excess becomes realized gain and basis stays zero. Transfers are not taxed merely for moving; an excess distribution represents previously unrecognized economic gain. Include profits in basis even if the player evades their tax: their evasion/audit obligation is tracked separately, preventing ordinary earnings being taxed again on sale. A company loss reduces basis once so it cannot also create a second capital deduction.

No company-level tax/fine liability exists in this pass-through model. Paying personal tax from a Treasury requires an explicit withdrawal first, which also reduces basis; company money is never silently taken. A deposit adds basis, so the round trip preserves it. Existing report-only P&L fields remain distinct from tax basis and never grant extra cash.

Current listing code values Treasury inside the quoted company value and additionally adds proportional Treasury to a whole-business sale. Resolve that inconsistency in this delivery: listed exit pays the owner's current share-sale value less the normal stock sell fee, with Treasury already represented in that value, and no extra Treasury grant. Quotes, Wealth, trading, whole-business exit and basis must use this same convention. Treat this as an explicit spec change, not an undocumented tax side effect. Simulate IPO/buyback/relisting loops before accepting the result.

## Returns and manual filing

Returns close every six eligible simulation hours, aligned from tax activation. Activation is always a shared Business-day boundary. Settle any outstanding pre-tax interval under its old economy, then settle the short interval to the next shared boundary under those old rules too; tax starts exactly at that boundary. There are no partial-day assessments or returns splitting an accounting day. State the start time in Taxes. This is a prospective activation rule, not an opportunity to reset the calendar by filing or restarting.

A positive return presents two equally clear actions:

- **Report everything:** declare the exact calculated tax T and choose Pay now or an installment plan if unaffordable. Honest reporting has no fine or audit risk.
- **Report nothing:** pay $0 now; 40% chance of one audit. If caught, owe T back tax plus a 2T fine, total 3T. The amount, probability and audit-check time are shown before confirmation.

There is no partial reporting, early prorated filing or repeated audition of a quote. File oldest first. Zero-tax returns close automatically. One return covers the personal account and every underlying source line. Preserve all source/day IDs and monetary amounts behind the aggregate.

Audit check happens ten eligible simulation minutes after filing. Use one seeded, domain-specific draw keyed to the immutable return ID, saved atomically with the filing command; reveal the stored result at that deadline. Filing again, restarting, restoring the same snapshot or advancing time in smaller chunks cannot draw again. Successful evasion is final: that return is never randomly audited a second time. Honest filing later cannot erase a prior scheduled audit.

Unfiled returns wait for a manual choice. Once a positive return is ready, block new discretionary investment until it is filed: new businesses/property, market buys, upgrades, IPO/buyback, takeovers and hires. Do not stop time or current earnings. Taps, sales, withdrawals, ordinary deposits, restocking, insurance renewal, rental status and staff/risk reductions remain usable. Previously committed takeover offers cannot settle while filing/debt restrictions apply; they lapse without spending or a punitive lock. This prevents “never file and keep investing” without choosing evasion for an absent player.

While an audit is pending, the player can invest normally unless a different bill/debt restricts it. The ten-minute delay creates a short risk/reward window without six hours of unchecked reinvestment.

## Bills, debt and collection

Pay now collects only from personal cash, up to the stated amount; it never sells an asset or takes Treasury money. If cash is insufficient, explain the remainder and let the player select the installment plan. An audit books its fixed back tax and fine, collects available personal cash once, and places any remainder on the same disclosed installment rules. The zero-report confirmation authorizes those audit consequences.

Debt never generates interest, late fees, repeated multipliers or an income freeze. A plan diverts 25% of new eligible personal cash receipts toward oldest debt, with persistent fractional remainders and a final payment capped to the remaining debt. Eligible credits are business Payout, rent, dividends, Treasury withdrawals and net sale proceeds. Process each incoming cash credit once. Its use for debt repayment is not an extra taxable receipt. Taps are excluded from automatic diversion, but the player can voluntarily pay debt using any available personal cash. A source earns into Treasury without personal cash receipts only until the player chooses Payout/withdrawal; discretionary investment remains blocked while assessed debt is outstanding, preventing that deferral becoming free expansion.

Only a positive closed return awaiting filing or assessed unpaid debt blocks discretionary investment. Current estimated tax and a pending audit do not. Payroll, operating expenses, restocking, insurance and existing profitable activity continue. Deposits are allowed so a loss-making company can reopen, but its discretionary capital spending remains blocked until the player's filing/debt restriction clears. Losses due to ordinary operations can still close a company under existing rules; tax itself cannot close it by debiting its Treasury.

The initial full-cash collection is distinct from subsequent 25% recovery. New honest returns still need filing during a plan. Taxes themselves do not create deductible losses; repaying debt does not increase assessed income. If an existing same-day operating correction reduces an estimate, correct the current estimated liability; never refund a prior finalized day as a new cash reward. The recovery base is personal cash actually credited, not an estimate of today's profit, so it is stable under later deductible operating expenses.

## Offline play, Wealth and UI

All assessment, filing availability, audit deadlines and recovery run on eligible Simulation time. Ten hours away credit at most eight hours; the discarded two hours create no returns, audit aging, penalties or debt payments. A six-hour return cadence creates at most two new returns per capped absence, depending on its starting phase. An audit already scheduled before leaving can resolve during credited time. No filing is made on the player's behalf. Return summary presents the saved result; dismissing it does nothing financial.

Book current estimated honest tax as a personal liability for conservative net worth. When zero reporting commits, remove that return's ordinary liability; keep its audit exposure visible separately. On an audit, book 3T once. Honest filing transfers the estimate into assessed debt without creating it twice. A payment reduces cash and liability together, without a second net-worth loss. Company and market values remain gross of personal tax, avoiding a company/share-value deduction plus a second personal liability deduction. Ordinary source cash continues to arrive gross until manual payment; the UI must make the difference clear.

Profile → Taxes contains current earnings/costs/basis, loss carryforwards, recorded daily rates, estimated honest bill, next return, closed returns, filing choices, scheduled audits and exact exposure, assessed back tax/fines, debt and Pay now/installments, history and lifetime totals. Preserve five bottom tabs and centered Earn. Explain the $10K protected wealth band and exempt taps before any positive bill.

Earn/top bar show actual cash income with an adjacent estimated after-tax amount; do not label gross cash as already net of collected tax. Business details show full operating profit, owner's share, estimated tax, Payout and Treasury growth separately. Trade/sale sheets show proceeds, fee, tax basis, realized gain/loss and resulting estimated tax; manual filing means that estimate is not deducted from the sale's immediate cash credit. During debt recovery show the actual recovery deduction too. Return summary separately reports gross earnings, costs, new estimated tax, actual collected tax/fines, personal cash credited and Treasury growth.

Use one persistent ledger for every displayed figure. Keep the latest 48 closed returns plus current details; never trim unresolved returns, audits or debts. Preserve lifetime totals, loss/basis records and replay protection independently. Batch notices on return rather than showing multiple blocking modals. Make every filing action, status, amount and explanation accessible without relying on color.

## Permanent tax exemption: future purchase contract

One non-consumable entitlement, target US $0.99 with the actual localized store price displayed, removes taxes permanently on that store account. It covers existing and future assets, all saves, reset saves, and restored installations. It does not remove ads. Apple/Google restoration are separate; do not promise cross-store transfer without an account system. No subscription, consumable token, repeat payment or per-save repurchase.

Verified activation settles the current interval, then waives unpaid estimates, unfiled returns, scheduled audits, tax debt and fines. Future tax is zero, no filing is needed, and old payments are not refunded. Retain history and show the exemption's savings. This is deliberate purchase amnesty; buying after an evasive filing can cancel its audit. Be candid that the benefit changes progression and removes this management mechanic.

Keep purchase access in Taxes/Settings, never a forced rescue prompt following an audit. The free game must have viable honest progression and a tolerable debt-recovery path. Do not inflate fines or impair free recovery to sell the exemption.

Implement the entitlement as verified store ownership outside resettable gameplay data, with a durable local cache and an idempotent activation command. Pending, cancelled or unverified purchases do not grant it. Normal offline play retains the last verified entitlement; a network failure does not revoke ownership. Restore Purchases rechecks store ownership, activates before advancing gameplay, and never charges again. A fresh installation without proof needs a successful store restore before exemption applies. Replayed callbacks do not grant cash or repeat financial effects. Confirmed refund/revocation ends exemption prospectively at the committed current time, with a fresh taxable day/return; waived bills never revive and past exempt income is never back-taxed.

The future checkout delivery includes actual product setup, localized pricing, verification, acknowledgment/finish, restore, revocation handling and sandbox evidence. Use a backend for Google purchase verification and voided-order handling; retain Apple verified entitlements and transaction updates. No assertion of instantaneous offline revocation. Until checkout ships, the production purchase action is absent; test entitlement transitions through a scripted port. This is a complete benefit contract, not a claim that payment infrastructure exists today.

## Prospective saves and compatibility

Add one top-level tax record defaulting to “not started”. Baseline saves load neutrally with no inferred old earnings, old tax debt, elapsed tax progress or loss credits. Settle their outstanding interval at the previous economy; at the next Business-day boundary start tax prospectively under a new economy version, retaining old content needed for settlement. New games use the same boundary rule.

At activation, grandfather pre-tax appreciation and losses: initialize separate tax basis for held assets from their then-current net realizable sale value, and record that valuation/time. Existing purchase/P&L basis remains unchanged for performance reporting. This is an explicit transitional tax-basis policy, not a zero default or fabricated acquisition history. Existing-company owner basis starts from its net realizable owner exit value under the new, single-counted Treasury sale convention; its future earned profit/distributions update that basis. New acquisitions after activation use actual purchase/contribution spending. This avoids inferring historical tax or charging pre-activation unrealized gain on an immediate sale.

Raise minimum reader capability atomically on activation so older builds refuse rather than ignoring liabilities, basis or audit state. Determine the next reader/economy numbers from the branch at implementation time; additive neutral state alone does not justify a schema bump. Any actual breaking persisted-field change requires a migration and fixture. Missing monetary fields in an active record indicate corruption, never a zero-money repair.

Save receipts, all money, rates, loss/basis remainders, filing state, scheduled audit outcomes, debt, purchase transitions and Return summary atomically. Save failure publishes nothing. Restores and repeated command IDs cannot collect twice. Reset Save removes game progress/debt but never verified purchase ownership; reset remains the existing explicit destructive action.

## Worked examples and delivery gates

Detailed rate tables, business cash flows and disposal examples: [tax-worked-examples.md](tax-worked-examples.md).

For listed companies, Treasury withdrawals follow the shareholder split just like distributions: distributing $100 at 70% ownership credits $70 personally and pays $30 outside. Show both in the quote. This companion rule prevents Withdraw bypassing the Payout ownership split; private-business withdrawals remain unchanged.

At $100K opening wealth, the blended rate is 4.5%. An owned business earns $1,000 revenue and pays $400 eligible costs: $600 owner profit, $27 tax and $573 economic net. The same costs before or after the receipts in that Business day produce the same tax. Payout does not change $27. At 50% ownership, the player's profit is $300 and estimated tax is $13.50; the other owner's share is outside this personal ledger.

A $1,000 honest return costs $1,000. Reporting nothing costs $0 immediately; its single audit check either clears it (60%) or assesses $1,000 back tax plus $2,000 fine (40%). Expected undiscounted cost is $1,200. This does not prove honesty has better progression: reinvestment during the ten-minute window and recovery behavior must be simulated.

A $3,000 audited bill with $500 personal cash collects $500 and leaves $2,500 debt. A subsequent $100 eligible cash receipt pays $25 toward it and leaves $75 cash. A $100 tap batch credits the full $100; the player may voluntarily pay it. No asset is automatically sold and no Treasury is raided.

After owner approval, deliver the complete tax gameplay, full asset accounting, UI, saves, balance report and tests in the implementation PR; internal work can be staged, but acceptance is against the complete feature. Store checkout remains the explicitly future purchase launch, with its full contract fixed above. Update the authoritative spec and decision log to supersede #93's earlier exclusions. Do not close #93 based on a scaffolding-only PR.

Proposed test seams for that approval: domain assessment/basis/quotes; Game commands and persistence; rendered Taxes, sale/order and Return-summary screens. Include cost ordering, day/rate boundaries, tiny versus long advances, partial/final disposals, retained shares, outside ownership, IPO/delist/relist, loss harvesting, transfer/Payout neutrality, capped offline returns, one-shot audits, investment restrictions, installments, crash/replay/recovery, old-save activation, reader refusal and exemption/restore/revocation transitions.

Use the existing manager/hands-on, tapping, purchase-policy, payout-sweep and offline simulations with honest, evasive and exempt variants. Measure first business, $1M and later milestones, evasion reinvestment advantage, audit debt and recovery. Reject dominance or intolerable recovery and present measured tuning before changing rates. Arithmetic examples are not balance results. Run bun run check and the required review before committing/opening the implementation PR. No implementation or test pass is claimed by this research proposal.
