# Tax numbers and worked examples

Proposed settings for #93, 2026-11-08; supplements [tax-proposal.md](tax-proposal.md). These are worked arithmetic, not measured balance forecasts or implemented behavior.

## Rate calculation

Weight the first $10K of wealth at 0%, the next $90K at 5%, the next $900K at 10%, the next $9M at 15%, and the excess at 20%. Divide the weighted sum by total positive net worth, then floor the rate to 0.01 percentage point. Apply that rate to taxable profit, not wealth.

| Day-opening net worth | Daily income-tax rate | Tax on $1,000 taxable profit |
| --- | --- | --- |
| $10,000 or less | 0% | $0 |
| $25,000 | 3.00% | $30 |
| $50,000 | 4.00% | $40 |
| $100,000 | 4.50% | $45 |
| $250,000 | 7.80% | $78 |
| $500,000 | 8.90% | $89 |
| $1,000,000 | 9.45% | $94.50 |
| $5,000,000 | 13.89% | $138.90 |
| $10,000,000 | 14.44% | $144.40 |
| $100,000,000 | 19.44% | $194.40 |
| $1,000,000,000 | 19.94% | $199.40 |

At $100K: ($10K × 0% + $90K × 5%) / $100K = 4.5%. A $100K portfolio earning nothing owes no income tax. Its price appreciation is not taxable until realized. It can change tomorrow's rate. Taps remain exempt even above $1B wealth.

## One wholly owned business

Assume day-opening wealth of $100K and a business with $1,000 actual daily receipts, $250 customer costs, $75 wages, $25 upkeep, $20 premiums and $30 restocking. Actual costs total $400; profit is $600. Owner tax is $27. Economic after-tax profit is $573. Restocking before versus after receipts during that same accounting day gives the same result.

| Payout setting | Cash credited personally | Treasury growth | Tax accrued personally |
| --- | --- | --- | --- |
| 0% | $0 | $600 | $27 |
| 50% | $300 | $300 | $27 |
| 100% | $600 | $0 | $27 |

Ordinary tax is paid later, not withheld from these cash credits. At 0% Payout the owner can withdraw $27 from Treasury to fund the eventual bill; this withdrawal creates no additional ordinary tax. If the money has been invested/spent, an installment plan is available. Cash remains spendable before the return is due; the running estimate makes this visible.

Buying a $300 unit that day does not reduce $600 taxable profit to $300: the unit is capital. Paying an additional $300 of genuine operating expenses does reduce it to $300, so tax becomes $13.50. New company units/upgrades are funded from capital already represented by contributions or retained profits, so they do not add personal ownership basis again.

## Businesses at their catalog starting configuration

These examples use spec §5.1 stage-1, one-unit, Standard-price revenue/cost figures. Each row assumes 100% ownership, no prior losses and the stated opening wealth. These are not results for upgraded businesses or active flagship mechanics.

| Business | Opening wealth | Revenue per day | Costs per day | Profit per day | Tax per day |
| --- | --- | --- | --- | --- | --- |
| Vending Machine | $50K | $140 | $40 | $100 | $4 |
| Car Wash | $100K | $13,000 | $4,000 | $9,000 | $405 |
| Bakery | $1M | $40,000 | $12,000 | $28,000 | $2,646 |
| Delivery Company | $1M | $95,000 | $35,000 | $60,000 | $5,670 |
| Hotel Group | $100M | $2,000,000 | $800,000 | $1,200,000 | $233,280 |
| Space Launch Company | $1B | $100,000,000 | $40,000,000 | $60,000,000 | $11,964,000 |

A new player's Vending Machine owes $0 while day-opening net worth stays at/below $10K. Staff, prices, managers, restocking, incidents and contracts alter actual profit. No business-type surcharge exists: two sources with the same taxable profit use the same recorded owner rate.

## Losses and ownership

At 4.5%, day one profit of -$200 creates no tax and a $200 loss carryforward. Day two profit of $500 consumes that loss, leaving a $300 base and $13.50 tax. Day three profit of $500 has no loss left, so tax is $22.50, assuming the same opening rate. A Bakery's operating loss cannot offset a Car Wash's profit; it stays with the Bakery pool across sale/rebuy. Later-day losses never refund an earlier finalized day's tax.

At 70% ownership and $600 company profit, the owner's share is $420 and their tax is $18.90 at 4.5%. At 50% Payout the company distributes $300: $210 goes to the owner, $90 to outside shareholders and $300 stays in Treasury. The owner's economic share of retained profit is $210. Neither the outside $90 nor the outside share of retained earnings is in the owner's taxable base.

Listed Treasury withdrawals must use the same ownership split as distributions. An instruction to distribute $100 from a 70%-owned company pays $70 to the player and $30 outside; the player cannot withdraw the entire $100 personally. The quote must show both figures. This is a deliberate companion rule to the tax proposal; private, 100%-owned withdrawals are unchanged.

Operating profit increases ownership tax basis before distributions reduce it. Example: a listed stake acquired for $10K earns $2K attributable profit and pays the owner $1K. Its basis becomes $11K. If a later sale nets $13K, disposal gain is $2K, not $3K: the retained $1K was already included in operating profit. Together, $2K operating profit plus $2K sale gain equal the $4K economic gain ($1K distribution + $13K exit − $10K initial spending). Fractional ownership, partial sales and final exits preserve this identity.

## Other asset numbers

- Rental: $120 rent less $20 upkeep is $100 taxable profit; at 4.5%, tax is $4.50. A vacant property has zero rent and no upkeep deduction under current game rules.
- External dividend: $100 earned dividend accrues $4.50 tax at 4.5%. Later crediting that same $100 to cash does not assess it again.
- Stock/crypto sale: $1,300 proceeds less $10 selling fee and $1,000 tax basis gives $290 gain and $13.05 estimated tax. Immediate cash credit is $1,290; tax is paid with the return. A debt plan may separately divert part of that cash credit.
- Property disposal: the existing upgraded City Studio fixture sells for $20,520 against $22,000 invested, creating a $1,480 capital loss for a post-activation purchase. Against $2,000 of same-day capital gains, that leaves $520 taxable, or $23.40 at 4.5%. If the gain was on an already finalized earlier day, carry the loss forward instead of refunding old tax.
- IPO: $10K of new outside funding entering Treasury creates $0 operating income tax. A later personal share sale can realize a gain; its proceeds are not automatically all profit.
- Personal-to-Treasury deposit of $1K and its later withdrawal create $0 ordinary income tax and restore ownership basis to its starting amount. Returning contributed money is not profit.

## Six-hour return and changing rates

A six-hour return adds 36 daily assessments; it never multiplies today's quoted profit by six hours. If the $600/day example could hold its 4.5% rate and operating figures constant throughout, profit would be $21,600 and the bill $972. At 50% Payout, personal cash and Treasury would each have gained $10,800 before filing. Paying $972 from that cash leaves $9,828 personal cash plus $10,800 Treasury growth: $20,628 economic net.

In real play, wealth, rates and operations change. For example, three days with $600 profit each and recorded rates of 4.5%, 7.8% and 9.45% contribute $27, $46.80 and $56.70, or $130.50 total. A later higher bracket does not reprice the first day's $27. The constant-rate six-hour example is an explanation, not a predicted run.

## Evasion and debt

For a $1K honest bill, full reporting costs $1K. Zero reporting costs $0 now, followed by one audit check ten credited simulation minutes later: 60% clear forever, 40% owe $1K back tax plus $2K fine. Expected undiscounted cost is $1,200; reinvestment opportunity means this alone does not establish which strategy progresses fastest.

For a player evading five identical $1K returns, expected total audit cost is $6K versus $5K honest tax. The probability of escaping all five independent checks is 0.6^5 = 7.776%. This is neither a promise of a specific audit count nor escalating risk: each return remains a separate 40% event.

If an audit bills $3K while personal cash is $500, collect $500 and record $2,500 debt. Each subsequent $1K eligible personal cash credit pays $250 debt and leaves $750 cash. Ten such credits clear this particular debt, absent other payments/new bills. Treasury money is not taken automatically. A later $100 tap batch credits its full $100, which can voluntarily pay debt. Existing cash from past taps can still be used for the initial bill; tap exemption is not a protected cash balance.

An unfiled positive return or unpaid assessed debt restricts discretionary expansion. Operations keep earning; operating purchases continue; selling and transferring money for recovery stay available. No late interest or repeated fine is added, but new honest tax on new profit still accumulates normally.

## Offline and exemption

At a six-hour return cadence, an eight-hour credited absence crosses one or two filing boundaries depending on the starting phase; a ten-hour absence still credits only eight hours. Audits scheduled before departure can resolve within that interval. No absent player is automatically made to choose zero reporting. All results are saved once; Return summary dismissal never collects again.

The future permanent exemption waives pending unpaid ordinary bills, audit checks, back tax and fines on verified activation, then makes every future source tax-exempt. A player with a $2,500 tax debt would owe $0 after activation, without a $2,500 cash grant; already-paid amounts are not refunded. Its target US $0.99 price is real money, unrelated to game wealth or daily income.
