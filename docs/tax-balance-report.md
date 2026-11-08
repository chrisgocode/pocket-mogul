# Tax balance report

Seed: pocket-mogul-balance-1. Old economy 1; current economy 2.

Runs use the existing manager/hands-on, purchase-policy and offline schedules, two taps/second and five-second action steps. Milestones show active / elapsed minutes. Runs stop at $1B peak net worth or 40 active hours. Rates and audit outcomes use the real engine and seeded ledger.

Honest players file every ready return; evaders file zero every time. Both use personal cash, then explicitly withdraw Treasury money and voluntarily pay assessed debt before discretionary investment. Exempt runs use the scripted entitlement boundary. No reward ads or actual purchases occur. Purchase policies retain the existing gross-profit payback heuristic so comparisons use the same decision policy.

One seed is a reproducible example, not a statistical audit-risk study. Expected evasion cost at a fixed bill is 40% × (back tax + 2× fine) = 120% of honest tax; early reinvestment and observed recoveries still affect progression. Recovery uses existing income and explicit transfers, never invented cash or asset liquidation.

| Tax policy | Schedule / management | Purchase policy | First business | $1M | $1B | Tax paid | Fines paid | Outstanding debt | Successfully evaded | Audits |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| baseline | Continuous active play, manager | cheapestNext | 3.42 / 3.42 | 191.42 / 191.42 | 864.58 / 864.58 | $0.00 | $0.00 | $0.00 | $0.00 | 0 |
| baseline | Continuous active play, handsOn | cheapestNext | 3.42 / 3.42 | 216.08 / 216.08 | 816.50 / 816.50 | $0.00 | $0.00 | $0.00 | $0.00 | 0 |
| baseline | Continuous active play, manager | bestPayback | 11.25 / 11.25 | 133.50 / 133.50 | 550.17 / 550.17 | $0.00 | $0.00 | $0.00 | $0.00 | 0 |
| baseline | Continuous active play, handsOn | bestPayback | 11.25 / 11.25 | 137.33 / 137.33 | 478.17 / 478.17 | $0.00 | $0.00 | $0.00 | $0.00 | 0 |
| baseline | Continuous active play, manager | saveForNextBusiness | 2.08 / 2.08 | 419.42 / 419.42 | not reached | $0.00 | $0.00 | $0.00 | $0.00 | 0 |
| baseline | Continuous active play, handsOn | saveForNextBusiness | 2.08 / 2.08 | 392.83 / 392.83 | not reached | $0.00 | $0.00 | $0.00 | $0.00 | 0 |
| baseline | Sessions with offline gaps, manager | cheapestNext | 3.42 / 3.42 | 68.75 / 428.75 | 198.25 / 2358.25 | $0.00 | $0.00 | $0.00 | $0.00 | 0 |
| baseline | Sessions with offline gaps, handsOn | cheapestNext | 3.42 / 3.42 | 79.83 / 439.83 | 210.00 / 2550.00 | $0.00 | $0.00 | $0.00 | $0.00 | 0 |
| baseline | Sessions with offline gaps, manager | bestPayback | 11.25 / 11.25 | 60.00 / 420.00 | 150.00 / 1590.00 | $0.00 | $0.00 | $0.00 | $0.00 | 0 |
| baseline | Sessions with offline gaps, handsOn | bestPayback | 11.25 / 11.25 | 60.00 / 420.00 | 150.00 / 1590.00 | $0.00 | $0.00 | $0.00 | $0.00 | 0 |
| baseline | Sessions with offline gaps, manager | saveForNextBusiness | 2.08 / 2.08 | 108.92 / 1188.92 | 390.00 / 4890.00 | $0.00 | $0.00 | $0.00 | $0.00 | 0 |
| baseline | Sessions with offline gaps, handsOn | saveForNextBusiness | 2.08 / 2.08 | 100.58 / 1180.58 | 390.00 / 4890.00 | $0.00 | $0.00 | $0.00 | $0.00 | 0 |
| honest | Continuous active play, manager | cheapestNext | 3.42 / 3.42 | 195.50 / 195.50 | 925.58 / 925.58 | $81,668,847.99 | $0.00 | $0.00 | $0.00 | 0 |
| honest | Continuous active play, handsOn | cheapestNext | 3.42 / 3.42 | 221.58 / 221.58 | 875.67 / 875.67 | $92,045,479.30 | $0.00 | $0.00 | $0.00 | 0 |
| honest | Continuous active play, manager | bestPayback | 11.25 / 11.25 | 136.00 / 136.00 | 573.83 / 573.83 | $18,790,796.95 | $0.00 | $0.00 | $0.00 | 0 |
| honest | Continuous active play, handsOn | bestPayback | 11.25 / 11.25 | 140.08 / 140.08 | 501.25 / 501.25 | $48,788,465.10 | $0.00 | $0.00 | $0.00 | 0 |
| honest | Continuous active play, manager | saveForNextBusiness | 2.08 / 2.08 | 438.08 / 438.08 | not reached | $24,635,725.21 | $0.00 | $0.00 | $0.00 | 0 |
| honest | Continuous active play, handsOn | saveForNextBusiness | 2.08 / 2.08 | 412.33 / 412.33 | not reached | $34,265,718.17 | $0.00 | $0.00 | $0.00 | 0 |
| honest | Sessions with offline gaps, manager | cheapestNext | 3.42 / 3.42 | 73.58 / 433.58 | 210.00 / 2550.00 | $127,082,912.39 | $0.00 | $0.00 | $0.00 | 0 |
| honest | Sessions with offline gaps, handsOn | cheapestNext | 3.42 / 3.42 | 85.67 / 445.67 | 210.00 / 2550.00 | $113,448,500.73 | $0.00 | $0.00 | $0.00 | 0 |
| honest | Sessions with offline gaps, manager | bestPayback | 11.25 / 11.25 | 60.00 / 420.00 | 180.00 / 2340.00 | $1,256,508,120.01 | $0.00 | $0.00 | $0.00 | 0 |
| honest | Sessions with offline gaps, handsOn | bestPayback | 11.25 / 11.25 | 60.00 / 420.00 | 180.00 / 2340.00 | $1,048,903,097.50 | $0.00 | $0.00 | $0.00 | 0 |
| honest | Sessions with offline gaps, manager | saveForNextBusiness | 2.08 / 2.08 | 120.00 / 1380.00 | 480.00 / 6060.00 | $219,654,580.58 | $0.00 | $0.00 | $0.00 | 0 |
| honest | Sessions with offline gaps, handsOn | saveForNextBusiness | 2.08 / 2.08 | 108.25 / 1188.25 | 420.00 / 5100.00 | $165,587,381.26 | $0.00 | $0.00 | $0.00 | 0 |
| evade | Continuous active play, manager | cheapestNext | 3.42 / 3.42 | 195.50 / 195.50 | 984.92 / 984.92 | $76,683,215.87 | $153,366,431.74 | $0.00 | $0.00 | 2 |
| evade | Continuous active play, handsOn | cheapestNext | 3.42 / 3.42 | 221.58 / 221.58 | 930.33 / 930.33 | $87,661,375.14 | $175,322,750.28 | $0.00 | $0.00 | 2 |
| evade | Continuous active play, manager | bestPayback | 11.25 / 11.25 | 136.00 / 136.00 | 588.58 / 588.58 | $18,790,796.95 | $37,581,593.90 | $0.00 | $0.00 | 1 |
| evade | Continuous active play, handsOn | bestPayback | 11.25 / 11.25 | 140.08 / 140.08 | 519.83 / 519.83 | $48,788,465.10 | $97,576,930.20 | $0.00 | $0.00 | 1 |
| evade | Continuous active play, manager | saveForNextBusiness | 2.08 / 2.08 | 467.58 / 467.58 | not reached | $608,682.00 | $1,217,364.00 | $0.00 | $33,253,192.16 | 2 |
| evade | Continuous active play, handsOn | saveForNextBusiness | 2.08 / 2.08 | 409.42 / 409.42 | not reached | $1,060,098.81 | $2,120,197.62 | $0.00 | $54,884,088.12 | 2 |
| evade | Sessions with offline gaps, manager | cheapestNext | 3.42 / 3.42 | 78.67 / 438.67 | 210.00 / 2550.00 | $869,530.20 | $1,739,060.40 | $0.00 | $159,090,082.80 | 2 |
| evade | Sessions with offline gaps, handsOn | cheapestNext | 3.42 / 3.42 | 90.00 / 450.00 | 210.00 / 2550.00 | $696,527.39 | $1,393,054.78 | $0.00 | $117,226,246.59 | 2 |
| evade | Sessions with offline gaps, manager | bestPayback | 11.25 / 11.25 | 60.00 / 420.00 | 171.08 / 1611.08 | $5,127,477.80 | $10,254,955.60 | $0.00 | $31,763,952.25 | 2 |
| evade | Sessions with offline gaps, handsOn | bestPayback | 11.25 / 11.25 | 60.00 / 420.00 | 169.42 / 1609.42 | $4,202,813.26 | $8,405,626.52 | $0.00 | $31,705,460.87 | 2 |
| evade | Sessions with offline gaps, manager | saveForNextBusiness | 2.08 / 2.08 | 120.00 / 1380.00 | 480.00 / 5880.00 | $105,078,543.89 | $210,157,087.78 | $0.00 | $105,990,252.16 | 5 |
| evade | Sessions with offline gaps, handsOn | saveForNextBusiness | 2.08 / 2.08 | 115.92 / 1195.92 | 450.00 / 5850.00 | $117,541,570.82 | $235,083,141.64 | $0.00 | $70,587,700.36 | 5 |
| exempt | Continuous active play, manager | cheapestNext | 3.42 / 3.42 | 191.42 / 191.42 | 864.58 / 864.58 | $0.00 | $0.00 | $0.00 | $0.00 | 0 |
| exempt | Continuous active play, handsOn | cheapestNext | 3.42 / 3.42 | 216.08 / 216.08 | 816.50 / 816.50 | $0.00 | $0.00 | $0.00 | $0.00 | 0 |
| exempt | Continuous active play, manager | bestPayback | 11.25 / 11.25 | 133.50 / 133.50 | 550.17 / 550.17 | $0.00 | $0.00 | $0.00 | $0.00 | 0 |
| exempt | Continuous active play, handsOn | bestPayback | 11.25 / 11.25 | 137.33 / 137.33 | 478.17 / 478.17 | $0.00 | $0.00 | $0.00 | $0.00 | 0 |
| exempt | Continuous active play, manager | saveForNextBusiness | 2.08 / 2.08 | 419.42 / 419.42 | not reached | $0.00 | $0.00 | $0.00 | $0.00 | 0 |
| exempt | Continuous active play, handsOn | saveForNextBusiness | 2.08 / 2.08 | 392.83 / 392.83 | not reached | $0.00 | $0.00 | $0.00 | $0.00 | 0 |
| exempt | Sessions with offline gaps, manager | cheapestNext | 3.42 / 3.42 | 68.75 / 428.75 | 198.25 / 2358.25 | $0.00 | $0.00 | $0.00 | $0.00 | 0 |
| exempt | Sessions with offline gaps, handsOn | cheapestNext | 3.42 / 3.42 | 79.83 / 439.83 | 210.00 / 2550.00 | $0.00 | $0.00 | $0.00 | $0.00 | 0 |
| exempt | Sessions with offline gaps, manager | bestPayback | 11.25 / 11.25 | 60.00 / 420.00 | 150.00 / 1590.00 | $0.00 | $0.00 | $0.00 | $0.00 | 0 |
| exempt | Sessions with offline gaps, handsOn | bestPayback | 11.25 / 11.25 | 60.00 / 420.00 | 150.00 / 1590.00 | $0.00 | $0.00 | $0.00 | $0.00 | 0 |
| exempt | Sessions with offline gaps, manager | saveForNextBusiness | 2.08 / 2.08 | 108.92 / 1188.92 | 390.00 / 4890.00 | $0.00 | $0.00 | $0.00 | $0.00 | 0 |
| exempt | Sessions with offline gaps, handsOn | saveForNextBusiness | 2.08 / 2.08 | 100.58 / 1180.58 | 390.00 / 4890.00 | $0.00 | $0.00 | $0.00 | $0.00 | 0 |
