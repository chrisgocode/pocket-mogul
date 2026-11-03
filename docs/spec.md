# Pocket Mogul Game Design and Implementation Specification

Version 1.0 | November 2, 2026 | Prepared for Christian Gonzalez and the implementing agent

Build a portrait mobile idle wealth game in React Native. Players tap for startup cash, improve their earnings per tap, buy and upgrade businesses across four tiers, trade fictional stocks and cryptocurrencies, and improve properties to earn rent. Deliver a playable local game with reliable persistence and explicit economy rules.

This document is the implementation contract for the first version. The Markdown file is the canonical agent handoff; the Word document contains the same specification for review. The working name is Pocket Mogul (formerly Idle Wealth). Final branding is undecided.

## 1 Product decisions and scope

### Confirmed requirements

- React Native is the application framework.
- Tapping earns money. Wallet or card upgrades add small amounts to earnings per tap, and later upgrades cost more.
- An optional rewarded ad doubles tap earnings for approximately one minute.
- Players buy businesses, upgrade them, and receive passive income. There are exactly four business tiers.
- A fictional stock market uses playful company names and original parody-inspired visual identities.
- A separate fictional cryptocurrency market provides tradable coins.
- Players buy real estate, upgrade properties, and rent them out.

### Implementation defaults

The following decisions fill gaps so implementation can proceed. They are proposed defaults, not claims that the owner explicitly approved every detail: Expo and TypeScript; iOS and Android; local single-player saves; an eight-hour offline cap; 60 seconds of eligible foreground play for the ad boost; eight business types, twelve stocks, six coins, and six properties; one owned instance of each business and property template; and the balance values in this document.

Use these defaults unless the owner changes them. Keep balance values in versioned content configuration. Numeric values are initial playtest settings, not validated retention or monetization targets.

### First version boundaries

Include the complete tap, business, stock, crypto, property, offline, save, tutorial, goal, and optional rewarded-ad loops. All gameplay uses fictional money. Core play works without a network connection; ads depend on availability.

Defer accounts, cloud synchronization, a backend, shared markets, multiplayer, leaderboards, loans, short selling, leverage, limit orders, company IPOs, prestige resets, subscriptions, paid currency, push notifications, daily streaks, and detailed tenant negotiations. Managers are a one-time business upgrade, not a staffing simulation. Additional business locations are represented by upgrades rather than unlimited duplicate purchases.

## 2 Technology stack

| Area | Decision | Responsibility |
|---|---|---|
| Application | React Native with Expo and TypeScript strict mode | Native iOS and Android screens and platform integration |
| Navigation | Expo Router | Five main tabs and nested detail screens |
| Native development | Expo development builds with expo-dev-client | Exercise native ads and other native modules [1] |
| Economy | Pure TypeScript modules | Money, progression, quotes, settlement, seeded markets |
| Persistence | expo-sqlite with explicit migrations | Canonical save, command receipts, history, recovery [2] |
| UI state | React local state and useSyncExternalStore | Read-only subscription to committed game snapshots |
| Validation | Zod | Validate content, save versions, and adapter inputs |
| Money | Native BigInt cents and separate price units | Exact balances, fractional quotes, and integer rounding |
| Charts and logos | react-native-svg | Small line charts, icons, original fictional identities [3] |
| Animation and feedback | React Native Animated and expo-haptics | Tap feedback, transitions, optional haptics [4] |
| Rewarded ads | react-native-google-mobile-ads behind an adapter | AdMob integration, test ads, reward lifecycle [5] |
| Unit and UI tests | Jest with jest-expo and React Native Testing Library | Economy invariants, commands, critical interactions [6] |
| Native smoke tests | Maestro or equivalent native automation | Cross-screen journeys on actual native builds |
| Build and checks | Expo CLI, TypeScript, ESLint, one lockfile | Repeatable development and release builds |

At setup, select the current stable Expo SDK and its supported React Native and React versions. Install Expo-compatible native dependencies through Expo tooling, verify the ad package compatibility matrix, and commit exact resolved versions in the lockfile. Record the resulting matrix in the project README. Do not independently upgrade React Native beyond the selected Expo SDK. Expo Router provides the navigation foundation [7].

Use the existing repository package manager if one exists; otherwise use npm. A JavaScript package manager is tooling, not the mobile runtime. Use the Expo-supported runtime configuration. Verify BigInt behavior on both native targets during the first build.

Expo Go may support early UI work, but acceptance testing uses development or release builds. Provide a mock ad adapter for tests and native test-unit integration for device validation. Keep gameplay functional when production ad credentials are absent.

## 3 App structure and navigation

| Surface | Primary content | Main actions |
|---|---|---|
| Home | Cash, tap card, per-tap income, boost timer, passive income, pinned goal | Tap, upgrade card, watch optional ad |
| Businesses | Owned companies, four-tier catalog, locked tier previews | Buy, open details, upgrade, hire manager, sell |
| Markets | Stocks and Crypto segments, price changes, watchlist | Open asset, buy, sell |
| Properties | Owned properties and available listings | Buy, renovate, rent, upgrade, sell |
| Portfolio | Net worth, allocation, income sources, realized and unrealized results, activity | Inspect holdings and transaction history |

Goals and Settings open from the header. Use a shared purchase confirmation sheet for businesses, upgrades, properties, and sales. Market orders have a specialized quote sheet. Every confirmation shows the cash change and resulting ownership or income. Disable repeated submissions while the command is pending.

The first session starts with zero cash, tap level zero, no assets, and Tier 1 available. A short tutorial highlights tapping, the first wallet upgrade, and the first business purchase. Tutorial steps observe completed actions and persist across restarts. Players can skip explanations; this does not change unlock rules. Ads are optional during the tutorial.

All main tabs are visible from the start. Markets are readable immediately and become tradable after the first business purchase. Property listings are always readable and can be bought when affordable. Empty states explain the next available action.

## 4 Tapping and rewarded boost

Requirement IDs TAP01 through TAP06.

- TAP01: Each completed press on the tap card earns the currently quoted amount once. Press-and-hold does not auto-repeat. The domain computes the payout from the committed wallet and boost state for the accepted batch, not a value supplied by a UI label.
- TAP02: Level zero earns $1 per tap. Each wallet level adds $0.50. The initial level cap is 100. Upgrade price starts at $25 and grows by 1.35 for each level already owned. Use the exact integer calculation in Section 12.
- TAP03: The upgrade control shows current earnings, next earnings, price, and affordability. A successful purchase updates all four together.
- TAP04: Card artwork changes at levels 0, 10, 25, 50, and 100. Artwork changes are cosmetic; the displayed payout includes every economic modifier.
- TAP05: A completed rewarded ad grants 2x tap income for 60 seconds of eligible foreground game time. Time pauses while the app is inactive or backgrounded, or while a full-screen ad covers it. Time runs across all game tabs. Only one boost can be active; duration and multiplier do not stack.
- TAP06: Tap animations respond immediately. Optional haptics are throttled so rapid tapping does not create a backlog. Animations and sound never determine the actual balance.

Example: level 2 pays $2 per tap; while boosted it pays $4. The boost affects tapping only. Businesses, rent, dividends, market prices, and resale values use their normal rules.

## 5 Businesses and four tiers

Requirement IDs BUS01 through BUS07. Each row is one purchasable business template; the player can eventually own all eight. Rates below are dollars per real minute of eligible simulation time, before upgrades.

| Tier | Business ID and name | Price | Revenue per minute | Costs per minute |
|---|---|---|---|---|
| 1 | vending Vending Machine | $250 | $14 | $4 |
| 1 | food_cart Food Cart | $1,250 | $72 | $22 |
| 2 | laundromat Laundromat | $7,500 | $350 | $100 |
| 2 | car_wash Car Wash | $30,000 | $1,300 | $400 |
| 3 | delivery Delivery Company | $250,000 | $9,500 | $3,500 |
| 3 | gym_chain Gym Chain | $1,000,000 | $30,000 | $10,000 |
| 4 | hotel_group Hotel Group | $10,000,000 | $200,000 | $80,000 |
| 4 | manufacturer Manufacturing Company | $50,000,000 | $800,000 | $300,000 |

- BUS01: Buying a business spends cash and creates one owned record atomically. It starts earning immediately. Ownership requires no manager or manual collection.
- BUS02: Every business has Capacity, Quality, and Efficiency levels from 0 to 20. Capacity increases revenue and operating costs; Quality increases revenue; Efficiency lowers operating costs. Section 12 defines the calculations.
- BUS03: A manager can be hired once per business for twice its base purchase price. The manager adds 10 percent to net profit. It does not unlock ordinary passive or offline earnings.
- BUS04: Every 15 total upgrade levels adds a 10 percent additive milestone bonus to net profit. Capacity levels 5, 10, 15, and 20 also change the visual branch count. Branch artwork adds no separate hidden bonus.
- BUS05: Details show revenue, operating costs, bonuses, final net profit, and next-upgrade benefit. The preview and purchase use the same quote function.
- BUS06: Selling pays 60 percent of the recorded purchase and upgrade spending. Manager spending is an operating expense and is excluded from this sale basis. Settle earned income before removing the business. A repurchase starts at level zero with no manager.
- BUS07: Tier 2 unlocks at $5,000 peak net worth, Tier 3 at $200,000, and Tier 4 at $8,000,000. Tier unlocks are permanent. The catalog previews the next milestone.

Business capitalized value equals purchase plus upgrade spending. Portfolio reports this carrying value separately from the lower cash sale quote. Managers are excluded. This convention avoids treating a purchase as money disappearing while making the cost of selling explicit.

## 6 Fictional stocks

Requirement IDs STK01 through STK06. The market belongs to the local save. Prices are generated by the game; there is no real market feed or user-to-user trading.

- STK01: Each stock has an immutable ID, ticker, name, sector, original logo, description, starting price, price history, and optional dividend rate.
- STK02: Show current price, available history, change over the selected period, holdings, average cost, current value, unrealized result, and a watchlist toggle.
- STK03: Support buy and sell market orders with up to six decimal places of quantity. Presets are 25, 50, and 100 percent of affordable cash or owned quantity. A dollar input may be converted to quantity with the same quote function.
- STK04: Show notional, trading fee, total cash change, quantity, and quote timestamp before confirmation. A changed market tick invalidates the quote and requires review of the refreshed amount.
- STK05: Company, sector, and market events affect prices. A compact news feed explains the event and duration without claiming to predict the next price.
- STK06: Three launch stocks pay dividends. Entitlement accrues in proportion to quantity and eligible holding time, and is paid at each simulation-hour boundary. Buying just before a payout earns only the time actually held.

| ID and ticker | Fictional company | Sector | Initial price | Dividend per whole share per simulation hour |
|---|---|---|---|---|
| pear PEAR | Pear Technologies | Technology | $25 | $0.02 |
| macro MCR | Macrosoft | Technology | $40 | $0 |
| jungle JGL | JungleCart | Commerce | $35 | $0 |
| cart CBR | CartBarn | Commerce | $12 | $0 |
| volt VLT | Voltara Motors | Mobility | $50 | $0 |
| loop LPR | LoopRide | Mobility | $8 | $0 |
| brick BRK | Brickbank | Finance | $20 | $0.03 |
| vault VCR | VaultCard | Finance | $30 | $0 |
| sun SGR | SunGrid | Energy | $15 | $0 |
| barrel BRL | BarrelWorks | Energy | $18 | $0.02 |
| brew BRW | BrewBucks | Food | $10 | $0 |
| bun GBN | Golden Bun | Food | $6 | $0 |

These are working fictional identities. Create original vector marks from simple shapes, such as a geometric pear, a parcel with a vine, or a lightning road. Keep them visibly part of the game's own visual system. Runtime assets must not depend on remote company logo services.

## 7 Fictional cryptocurrencies

Requirement IDs CRY01 through CRY04. Reuse stock portfolio and trade components while giving crypto its own content and price parameters.

- CRY01: Each coin has an ID, ticker, original icon, short project story, price, history, holdings, and profit or loss.
- CRY02: Trading supports the same fractional quantities and quote review as stocks. The initial crypto fee is higher and volatility is greater.
- CRY03: Coin news includes fictional project updates, listings, and community hype. Price moves can be negative. Neither market has real-world opening hours.
- CRY04: Crypto has no dividends, staking, mining, wallets, deposits, withdrawals, or blockchain integration in version one.

| ID and ticker | Coin | Theme | Initial price |
|---|---|---|---|
| block BKC | Block Crown | Established network | $250 |
| ether EMB | Ember Chain | Application network | $80 |
| moss MOS | Moss Network | Utility project | $5 |
| spark SPK | Spark Token | Payments project | $1 |
| bark BRKX | Bark Coin | Meme coin | $0.10 |
| moon MBN | Moon Bean | Speculative community | $0.25 |

## 8 Properties and rental income

Requirement IDs RE01 through RE06. Each property is a unique listing, purchasable once while owned. Amounts below are dollars; rates are per eligible simulation minute.

| ID and property | Purchase price | Base rent per minute | Upkeep per minute | Expansion allowed |
|---|---|---|---|---|
| studio City Studio | $20,000 | $120 | $20 | No |
| house Starter House | $80,000 | $450 | $70 | No |
| duplex Duplex | $250,000 | $1,300 | $200 | Yes |
| apartments Apartment Building | $1,000,000 | $4,800 | $800 | Yes |
| retail Retail Building | $5,000,000 | $20,000 | $3,000 | Yes |
| offices Office Building | $20,000,000 | $70,000 | $12,000 | Yes |

- RE01: A purchase creates an unrented property. Its details offer Rent Out immediately; upgrading first is optional.
- RE02: Rent Out fills the property immediately. A rented property produces rent minus upkeep automatically. Version one has full occupancy, fixed net-positive operating rates, and no tenant negotiation.
- RE03: Renovation and Furnishings each have levels 0 to 10 and increase rent. Building Systems has levels 0 to 10 and reduces upkeep. Eligible properties have Expansion levels 0 to 4 that increase rent and upkeep together.
- RE04: Upgrades take effect immediately after paying, including while rented. Show cost, new rent, new upkeep, and value change before purchase.
- RE05: Unrent stops both rent and upkeep after settlement. Vacant upkeep is deliberately zero in version one. The property remains an owned asset.
- RE06: Selling pays 95 percent of estimated property value after settling rent. Remove ownership and rental income atomically. A later repurchase uses the catalog price and resets upgrades.

Estimated value equals the base purchase price plus 80 percent of recorded upgrade spending. This version has fixed property valuations rather than a second fluctuating asset market. Section 12 defines upgrade prices and rental calculations.

## 9 Wealth goals and player feedback

Requirement IDs UX01 through UX05.

UX01: Distinguish spendable cash, owned asset value, and total net worth. Show businesses and rent as net income per minute. Show dividend estimates per simulation hour, plus pending accrued dividends. Do not add unrealized market gains to cash.

UX02: Net worth is cash plus business carrying value, estimated property value, current stock and crypto position value, and pending earned dividends. Use integer cents. Display the valuation convention in an expandable explanation. Peak net worth only increases and drives permanent unlocks. Update the peak and unlocks after financial commands and each settled market or dividend boundary, including during offline processing.

UX03: Include goals for the first wallet upgrade, first business, first rental, first stock purchase, first crypto purchase, first dividend, and peak wealth of $1,000, $10,000, $100,000, $1,000,000, and $10,000,000. Goals award badges and feedback, with no extra cash rewards in version one. Players can pin one purchase goal.

UX04: Show a readable activity history for purchases, sales, upgrades, trades, dividends, and offline settlement. Aggregate tap batches and ordinary income accrual rather than displaying every tap or second. Preserve lifetime totals separately from a bounded history.

UX05: On return, automatically credit earned passive income and show a summary. The Continue button dismisses the summary; it does not grant a second reward. Include time away, credited duration, earnings by source, and whether the offline cap was reached.

## 10 Time and offline behavior

There are two explicit clocks. Simulation time drives passive income, market ticks, events, and dividends. Boost time counts eligible foreground game time only. A render frame is neither clock.

During foreground play, advance simulation by monotonic elapsed time. During resume, calculate nonnegative wall-clock elapsed time since the last durable checkpoint and credit at most eight hours. Advance every economy system by the same eligible interval. Afterward, move the wall checkpoint to the current wall time even when excess absence was discarded.

This means markets also advance by at most eight simulation hours per absence. Charts use labels such as past 60 market minutes rather than implying a continuous live exchange history. Prices, rent, business income, and dividends all continue without network access.

On a backward wall-clock change, grant zero offline elapsed time, reset the wall baseline, and record a local diagnostic event. Foreground monotonic progress continues. This is a convenience rule for a local game, not secure protection against device-clock manipulation. A trusted shared economy would require a different architecture.

The simulation advances in segments ending at scheduled boundaries: market ticks, dividend payouts, event starts or ends, and the requested target time. Settle the old rates up to a boundary, then apply its changes. At an exact shared boundary, accrue prior-period dividends, post their payout, process event changes, and generate the next market quote before accepting a new player command.

For business and rent income, maintain a remainder per income stream. A constant rate of one cent per minute advanced sixty times by one second must pay the same total as one sixty-second advance. Selling the last asset does not erase a stream's sub-cent remainder.

On app inactivity, flush pending tap batches and checkpoint. Also checkpoint during foreground play at least every five seconds and after each financial action. A forced kill may lose only an uncommitted tap batch of at most 250 milliseconds; committed purchases, trades, ownership, and grants must survive. Passive elapsed time is reconstructed from the durable checkpoint.

## 11 Market simulation rules

A quote changes every 60,000 simulation milliseconds. Each save has a random market seed created once. Generate random draws from stable keys containing the seed, tick index, scope ID, and stream name. Use a specified integer hash or PRNG with golden fixtures. Viewing a chart, restarting, or trading must not consume different random draws or change the price path.

All calculations below are proposed game rules. Quote prices use BigInt millionths of a dollar, separately from cash cents. This lets a ten-cent coin move by less than one cent. A basis point is one hundredth of a percent.

| Parameter | Stocks | Crypto |
|---|---|---|
| Common shock each tick | Integer from -20 to +20 basis points | Integer from -80 to +80 basis points |
| Sector shock | Integer from -10 to +10 basis points per sector | Zero |
| Asset shock | Integer from -40 to +40 basis points | Integer from -180 to +180 basis points |
| Regime drift | Bear -3, neutral 0, bull +3 basis points | Bear -8, neutral 0, bull +8 basis points |
| Event drift while active | Positive or negative 30 basis points | Positive or negative 100 basis points |
| Event duration | 10 ticks | 6 ticks |
| Trading fee | 25 basis points of notional | 50 basis points of notional |

Choose a shared bear, neutral, or bull regime every 30 ticks with probabilities 25, 50, and 25 percent. Use separate shock streams for stocks and crypto. Once every 30 ticks per asset class, select exactly one event: company or coin event 50 percent, sector event 25 percent, market event 25 percent. For crypto, replace the sector choice with a coin event. Select direction equally. Events do not directly change business rates or property rent in version one.

Add a weak anchor pull to each asset: calculate five basis points times the relative difference between its initial price and current price, rounded toward zero and clamped to -25 through +25 basis points. Sum the common, sector, asset, regime, event, and anchor contributions. Clamp total return to -2,000 through +2,000 basis points. Apply that return to the previous price, round to the nearest microdollar with half upward, and enforce a one-microdollar minimum. Use integer arithmetic for the ratios. A $0.10 coin with a +100-basis-point return becomes $0.101, rather than remaining frozen at ten cents.

Store 480 one-minute observations and 720 hourly OHLC observations per asset, with a partially built hourly candle. Keep completed history in a separate SQLite table so tapping does not rewrite thousands of chart points. Trim older observations deterministically. Offer 1 hour, 8 hours, and 30 market days when history exists; show the available range for new saves. Record explicit opening and closing prices for period-change calculations.

Stock dividends use the fixed configured cents per whole share per simulation hour, not current price times a yield. Accrue pro rata before every trade and boundary. Keep fractional entitlement in an integer numerator with denominator 1,000,000 quantity units times 3,600,000 milliseconds. At hourly boundaries transfer whole accrued cents to cash and retain the remainder. Selling a holding retains previously accrued entitlement until payout. Avoid retroactive dividends on newly bought shares.

## 12 Money and progression calculations

All examples are normative fixtures for the initial configuration. Store cash and transaction totals as BigInt cents, quote prices as BigInt millionths of a dollar, and quantities as BigInt millionths of a share or coin. Use distinct types such as MoneyCents, PriceMicros, and QuantityMicrounits to prevent unit mistakes. Serialize them as base-ten strings. Timestamps and bounded levels may be ordinary safe integers. UI formatting must not convert large balances to floating point first.

### Tapping

Use integer powers so the price and purchase agree exactly. L is the current wallet level.

```text
tapCents(L) = 100 + 50 * L
upgradeCents(L) = ceil(2500 * 135^L / 100^L)
boostedTapCents = tapCents(L) * 2
```

Level zero costs $25 to upgrade. Level one costs $33.75. Level two costs $45.57. Retain these as rounding fixtures. Show Max level once L equals 100.

### Business rates and upgrades

C, Q, and E are the current Capacity, Quality, and Efficiency levels. Base revenue, base costs, and purchase prices are integer cents.

```text
revenue = floor(baseRevenue * (100 + 10*C) * (100 + 10*Q) / 10000)
costs = floor(baseCosts * (100 + 6*C) * (100 - 2*E) / 10000)
milestoneBps = 10000 + 1000 * floor((C + Q + E) / 15)
managerBps = managerOwned ? 11000 : 10000
netPerMinute = floor(max(0, revenue - costs) * milestoneBps * managerBps / 100000000)
upgradeCost = ceil(basePurchase * weightBps * 118^currentTrackLevel / (10000 *
    100^currentTrackLevel))
```

Upgrade weight is 2,000 basis points for Capacity, 2,500 for Quality, and 1,500 for Efficiency. Each track stops at level 20. Manager cost is twice the catalog purchase price. Apply the milestone and manager once, in the formula above.

A base Vending Machine earns $10 per minute. Its first Capacity upgrade costs $50; revenue becomes $15.40 and costs become $4.24, producing $11.16 per minute. Its incremental payback is about 43.10 minutes. This is an illustration of the specified values, not proof that the balance is optimal.

### Property rates and upgrades

R is Renovation, F is Furnishings, S is Building Systems, and X is Expansion. Unavailable Expansion stays at zero.

```text
rent = floor(baseRent * (100 + 10*R + 5*F) * (100 + 25*X) / 10000)
upkeep = floor(baseUpkeep * (100 - 4*S) * (100 + 25*X) / 10000)
netPerMinute = rented ? max(0, rent - upkeep) : 0
upgradeCost = ceil(basePrice * weightBps * 125^currentTrackLevel / (10000 *
    100^currentTrackLevel))
estimatedValue = basePrice + floor(totalUpgradeSpend * 80 / 100)
saleProceeds = floor(estimatedValue * 95 / 100)
```

Weights are 1,000 basis points for Renovation, 800 for Furnishings, 600 for Systems, and 2,500 for Expansion. At base level the City Studio nets $100 per minute. Its first Renovation costs $2,000, raises rent to $132, leaves upkeep at $20, and raises estimated value to $21,600. Selling then pays $20,520 against $22,000 invested, so buying, upgrading, and selling is not a cash-generating loop.

### Passive accrual

For each constant-rate business or rental stream:

```text
numerator = rateCentsPerMinute * elapsedMilliseconds + previousRemainder
earnedCents = floor(numerator / 60000)
nextRemainder = numerator mod 60000
```

Settle before every ownership or rate change. There is no compounding from idle cash and no automatic reinvestment. Eight hours with one base Vending Machine pays $4,800. Ten hours away still pays $4,800 under the initial cap, and a second immediate resume cannot claim the discarded two hours.

### Trade settlement and cost basis

New buys have a minimum $1 notional. Permit a full-position sell below that minimum to clear small holdings. Compute the integer quantity first; an affordable maximum must include fees. Quote both transaction types through one domain module.

```text
buyNotional = ceil(priceMicros * quantityMicrounits / 10000000000)
sellNotional = floor(priceMicros * quantityMicrounits / 10000000000)
fee = ceil(notional * feeBps / 10000)
buyCashChange = -(buyNotional + fee)
sellCashChange = sellNotional - fee
```

The notional outputs above are cents: the denominator combines the quantity scale with 10,000 microdollars per cent. Mark a position with the sell-notional formula before fees. Add buy fees to the position cost basis. On a partial sale, allocate basis proportionally with integer flooring; the final sale consumes all remaining basis. Realized profit equals net sale proceeds minus allocated basis. Unrealized profit equals current marked value minus remaining basis. Profit fields are reports, not additional cash grants.

Fixture: buy 10 shares at $10 with a 0.25 percent fee. Cash falls by $100.25 and basis becomes $100.25. Sell 4 shares at $12: gross proceeds $48, fee $0.12, net proceeds $47.88, allocated basis $40.10, and realized profit $7.78. Six shares remain with $60.15 basis. At a $12 quote their value is $72 and unrealized profit is $11.85.

## 13 Domain boundaries and command contract

Use one application, with clear module boundaries rather than an initial monorepo. React components issue commands and render selectors. They do not directly change cash, holdings, levels, or clocks.

| Module or directory | Responsibility |
|---|---|
| src/app | Expo Router routes and screen composition |
| src/features | Home, businesses, markets, properties, portfolio, goals, settings |
| src/domain | Pure commands, quotes, money, progression, settlement, market simulation |
| src/content | Versioned business, property, stock, coin, event, and balance definitions |
| src/application | Serialized command service, clock coordination, selectors, subscriptions |
| src/infrastructure | SQLite repository, migrations, ad and telemetry adapters |
| src/ui | Shared controls, typography, tokens, charts, original SVG assets |
| tests and scripts | Fixtures, integration journeys, balance simulations, content validation |

Core commands are TapBatch, UpgradeWallet, BuyBusiness, UpgradeBusiness, HireManager, SellBusiness, BuyProperty, UpgradeProperty, SetRentalStatus, SellProperty, ExecuteTrade, SetWatchlist, PinGoal, RecordAdReward, ActivateBoost, AdvanceTime, AcknowledgeReturnSummary, and UpdateSettings. ResetSave is a separate destructive settings action requiring an explicit in-app confirmation.

Each command envelope has a unique ID, expected state revision, accepted clock input, and validated payload. Quotes include their configuration version and relevant state revision; market quotes also include tick index. The domain returns a new state, ledger entries, and typed results or errors. External effects occur through adapters after transaction boundaries.

Use typed errors including INSUFFICIENT_CASH, ALREADY_OWNED, LOCKED_TIER, MAX_LEVEL, INVALID_QUANTITY, INSUFFICIENT_HOLDING, STALE_QUOTE, BOOST_ACTIVE, AD_UNAVAILABLE, SAVE_FAILED, and UNSUPPORTED_SAVE_VERSION. Map them to clear UI text. Preserve entered trade quantity when a quote becomes stale.

## 14 Save model and transaction flow

Use one validated state snapshot as the authoritative representation of ownership and balances. Other database tables support deduplication, history, and recovery; they are not independent competing balances.

| Record | Important fields |
|---|---|
| GameState | saveId, schemaVersion, economyVersion, revision, cashCents, peakNetWorthCents, lifetime totals |
| ClockState | simulationMs, lastWallCheckpointMs, lastMarketTick, active boost milliseconds remaining |
| TapState | walletLevel, totalAcceptedTaps, artwork milestone |
| OwnedBusiness | definitionId, three upgrade levels, managerOwned, capitalizedSpendCents |
| OwnedProperty | definitionId, four upgrade levels, rented, upgradeSpendCents |
| Position | instrumentId, quantityMicrounits, remainingBasisCents, realizedProfitCents |
| DividendAccrual | instrumentId, pending whole cents, fractional numerator; survives selling all units |
| MarketState | seed, regime, events, current priceMicros quotes, partially built candles |
| IncomeState | business and rent remainders, earned totals by source |
| ProgressState | unlocked tiers, tutorial progress, completed goals, pinned goal, watchlist |
| RewardState | ad grant ID, pending activation, active boost, processed reward references |
| ReturnSummary | credited interval, earnings by source, cap flag, acknowledged status |
| Settings | sound, haptics, reduced motion preference, number formatting preference |

SQLite tables are save_state, command_receipts, ledger_entries, market_history, save_backups, and schema_migrations. Save JSON stores integer money and quantities as strings, with explicit parsing into BigInt. Retain the most recent 2,000 player-visible history entries and two validated snapshot backups. Keep cumulative statistics in GameState. Keep processed ad reward IDs for the lifetime of the save; prune ordinary command receipts after 30 real days while rejecting commands older than that window.

The snapshot holds current market prices and simulation state; market_history holds bounded past observations for display. History never determines the current quote or financial balance. Append observations only when their tick or candle closes, and commit them with the corresponding state change. A failed chart read must not fabricate a new price path.

Process every command through one serialized queue:

1. Check for an already processed command ID and return its recorded result without reapplying it.

2. Load the committed snapshot and validate the expected revision.

3. Advance time to the accepted command time, handling scheduled boundaries.

4. Validate ownership, quote, availability, and affordability against the updated state.

5. Calculate the state change, ledger entries, and any closed market observations with pure functions.

6. Commit the new snapshot, receipt, ledger entries, and market observations in one exclusive SQLite transaction.

7. Publish the committed snapshot to UI subscribers, then run non-financial effects such as animation or telemetry.

The actual implementation must preserve this single-transaction guarantee across reads and writes. With expo-sqlite, use the transaction-scoped handle from withExclusiveTransactionAsync and parameterized queries. Its documented transaction scope avoids unrelated async queries joining a transaction [2].

Batch taps for at most 250 milliseconds to limit write load. Flush a batch before a wallet upgrade, trade, other financial action, lifecycle checkpoint, or boost boundary. Keep batches homogeneous by payout and boost state. UI may animate pending taps, but any provisional number must roll back on a failed commit and pending cash must not fund a purchase before it commits.

Store backup checkpoints after verified successful saves at a bounded cadence, including before migrations. Backups in the same database help with logical snapshot damage, not complete database or device loss. A corrupt latest snapshot may restore the latest valid backup with a visible recovery notice. A future schema version must fail safely without overwriting the save. Never silently reset a damaged save. Local play does not promise reinstall or cross-device recovery.

Keep save schema version and economy configuration version separate. On an economy update, settle the outstanding interval with the save's old configuration before switching to the new one. Bundle the old configurations required by supported saves or provide an explicit tested migration. Apply new rates prospectively and preserve recorded purchase spending, cost basis, ownership, and grants. A migration must never retroactively pay an upgraded rate for the entire absence.

## 15 Ad integration and failure behavior

Ads are the only monetization in version one. Present one optional rewarded placement on Home with the exact reward and duration. Use test unit IDs during development [5]. Initialize the real SDK through its documented consent and privacy sequence; keep this concern inside the platform adapter. Production IDs and store declarations are owner-provided release configuration.

The ad adapter exposes availability, load, show, earned-reward, closed, and failed events. The application creates a unique presentation ID before showing an ad. Persist a reward grant only when the SDK emits its earned-reward event. Closing an ad alone grants nothing. Duplicate or reordered callbacks for the same presentation must resolve to a single reward.

Persist an earned grant as pending activation until the game is interactive again. Then activate one 60-second boost atomically. If the process dies after the reward is saved but before activation, activate the pending grant on the next launch. Do not replay the ad. If the SDK never reports a reward before a process kill, the local app cannot prove completion; log the case without fabricating a grant.

Disable starting an ad while another presentation, pending grant, or boost exists. If an ad is unavailable, fails, or the device is offline, display the status and keep ordinary tapping usable. Use a mock adapter with deterministic success, close-without-reward, duplicate reward, no-fill, and crash-recovery cases.

The local save is not an authoritative anti-cheat service. Do not add a backend merely to imply that client-side rewards or device time are tamper-proof. A future shared economy requires server-owned balances and validated grants as a separate project decision.

## 16 Interface and content standards

Use a clean financial dashboard style with a prominent illustrated tap card, readable asset cards, and simple charts. Start with a light theme, neutral surfaces, one primary accent, and semantic positive and negative colors. Represent gains and losses with text or symbols as well as color.

Use a consistent spacing scale, reusable typography, comfortable touch targets of at least 44 logical points, safe-area handling, and scrollable content. Test long company names, small phones, and enlarged text. Charts need text summaries; screen readers should not announce every animation or tap increment. Respect reduced motion and allow haptics and sound to be disabled.

Use compact amounts in summaries with exact amounts available in details and confirmations. Display cash and transaction totals to two decimal places. Quote prices and quantities use the needed precision up to six places. Use string-based formatting for values beyond Number safe integer precision. Show the units on every income rate.

Definitions are stable-ID data, separate from the save and screens. Include economyVersion, unlock thresholds, formulas or named formula versions, caps, fees, prices, rates, multipliers, and asset metadata in content configuration. Validate unique IDs, positive prices, legal tiers, required icons, referenced IDs, and level caps at startup and in tests. Never reuse a retired ID for a different asset.

## 17 Balance validation and instrumentation

Build a small headless simulation script around the same domain functions. It must accept a seed, starting state, action policy, tap rate, and session schedule, then output cash, asset allocation, net worth, unlock times, and upgrade payback. Keep the seed tables editable without changing screen code.

Initial playtest targets are a first wallet upgrade within 15 to 30 seconds at approximately two taps per second, a first business within 1 to 3 minutes, and a meaningful choice between reinvesting and buying another asset in the first session. These are hypotheses. Record actual results before changing values.

Compare at least three policies: buying the cheapest next upgrade, choosing the shortest incremental payback, and saving for the next business. Include an ad-free run and sessions separated by capped offline intervals. Flag permanently dominant choices, unaffordable progression stalls, and profit from repeatedly buying and selling an unchanged asset. Tune configuration rather than adding unexplained cash grants.

Define a TelemetryPort with a no-op production default and a local development event sink. Events include tutorial_step, first_business, wallet_upgrade, business_upgrade, rental_started, trade_executed, offline_settled, ad_requested, ad_rewarded, boost_activated, save_failed, and migration_completed. Include configuration version and relevant non-identifying game state. Aggregate taps. An external analytics provider is a later integration decision.

## 18 Acceptance criteria and critical tests

| ID | Scenario | Required outcome |
|---|---|---|
| AC01 | Fresh save | $0, level zero, no assets, Tier 1 available, tutorial starts |
| AC02 | Ten unboosted level-zero taps | Exactly $10 committed cash |
| AC03 | Wallet upgrade from level zero | Spend $25 once; payout becomes $1.50; next cost $33.75 |
| AC04 | Repeat a command ID | Same recorded result; no additional cash or ownership change |
| AC05 | Insufficient cash purchase | No partial spending, ownership, or upgrade |
| AC06 | Base Vending Machine runs 60 seconds | Exactly $10 income |
| AC07 | First Capacity upgrade | Costs $50 and changes net income to $11.16 per minute |
| AC08 | Segmented passive accrual | Sixty one-second advances equal one sixty-second advance, including remainder |
| AC09 | Ten-hour absence with base vending | Credit $4,800 and discard excess interval once |
| AC10 | Crash after offline commit | Return summary may reappear; money is not credited twice |
| AC11 | Tier threshold then wealth falls | Unlocked tier stays available |
| AC12 | City Studio renovation and sale | Values match the $2,000, $21,600, and $20,520 fixture |
| AC13 | Unrent or sell property | Income stops at the settled command time |
| AC14 | Trade and partial sale fixture | $7.78 realized profit and $60.15 remaining basis |
| AC15 | Buy maximum including fees | Total debit never exceeds cash |
| AC16 | Quote crosses a tick | Require a refreshed confirmation; no silent repricing |
| AC17 | Restart or change chart frequency | Same seed and simulated time produce the same prices |
| AC18 | Earn dividend then sell | Preserve accrued entitlement; newly purchased units receive no retroactive amount |
| AC19 | Reward callback delivered twice | Exactly one 60-second boost |
| AC20 | Ad closes without earned callback | No boost; ordinary play remains available |
| AC21 | Background during boost | Remaining eligible boost time pauses and survives restart |
| AC22 | Upgrade at boost expiration | No mixed-rate tap batch or extra doubled tap |
| AC23 | Save corruption or future schema | Recover visibly or stop safely; preserve original data |
| AC24 | Very large money values | Exact arithmetic and formatting beyond Number safe integer range |
| AC25 | Migration fixture from previous schema | Preserve balances, assets, cost basis, time, and grant IDs |
| AC26 | Airplane-mode journey | Taps, upgrades, rent, trades, settlement, and saves work; ads show unavailable |
| AC27 | Write failure during purchase | Entire transaction rolls back and UI shows a recoverable error |
| AC28 | Native application journey | Complete tap, business, rental, trade, return, and test-ad flows on iOS and Android |
| AC29 | Ten-cent coin moves by 100 basis points | Quote becomes $0.101; sub-cent moves are preserved |
| AC30 | Economy configuration changes while away | Settle old rates first; new rates apply only after migration |

Add invariant tests for nonnegative cash and quantities; no sell beyond holdings; identical results from segmented time advances; valid quote rounding; and conservation of cash changes against ledger entries. UI tests should cover consequential interactions rather than snapshot every screen.

Measure a maximum capped resume with all assets and chart histories on a representative physical device in a release build. Target settlement under one second and responsive foreground interaction. If simulation work blocks input, process it in bounded chunks behind a restoring-state screen and commit the final result atomically. Do not reduce economic accuracy to meet the target.

## 19 Implementation phases and completion gates

| Phase | Deliverable | Completion gate |
|---|---|---|
| 1 Foundation | Expo native builds, tabs, styles, validated content, money utilities | Both platforms start; dependency matrix and lockfile committed |
| 2 Economy and persistence | Pure commands, clocks, SQLite repository, receipts, migrations, recovery | AC01, AC04, AC05, AC08, AC23 through AC25, AC27, AC30 pass |
| 3 Tapping and businesses | Wallet upgrades, four tiers, business upgrades, managers, sales, goals | AC02, AC03, AC06, AC07, AC11 pass; first playable loop |
| 4 Property and offline | Rental upgrades, valuation, capped settlement, return summary | AC09, AC10, AC12, AC13 pass |
| 5 Markets and portfolio | Stocks, crypto, seeded prices, news, dividends, quotes, activity | AC14 through AC18 and AC29 pass; balance simulation runs |
| 6 Ads and native validation | Mock and native test ads, boost lifecycle, accessibility, performance | AC19 through AC22, AC26, AC28 pass; remaining criteria verified |

Each phase leaves a runnable app and updates the README. The final handoff includes source, setup instructions, exact dependency versions, seed content, migration policy, tests, a balance report with reproducible seeds, and a list of owner-supplied release configuration. Provide evidence for each completion gate and identify any platform checks the available environment could not execute.

Before public distribution, the owner supplies the final app identity, signing and store accounts, production ad IDs, and store-facing assets and disclosures. These do not block local gameplay or test-ad implementation. Do not label a mock integration as production complete.

## 20 Instructions for the implementing agent

Implement this specification phase by phase. Start by inspecting the target repository and its instructions. Preserve existing user work. If no project exists, scaffold a single Expo React Native application and record the selected dependency versions.

Treat confirmed requirements as fixed. Use the documented implementation defaults and balance values without asking about routine choices. Keep a short decision log for necessary clarifications or changes. If a new owner instruction conflicts with this document, follow that instruction and update the affected requirements and tests together.

Build the domain and persistence before adding visual polish to the full asset catalog. Use one set of quote functions for previews and mutations. Keep money out of component state as an independent authority. Test failure and recovery paths with injected clocks, random seeds, ad events, and database errors.

Complete the first version before implementing deferred features. Report what runs, which acceptance criteria passed, what remains blocked by the environment or owner-supplied release configuration, and the next concrete action. Do not claim device testing, balanced progression, or production ad delivery unless it was actually verified.

## 21 Technical references

These primary documentation links support integration choices. Game formulas, seed values, and product rules above are proposed designs, not recovered competitor implementations. Documentation was checked on November 2, 2026; the implementing agent must verify compatibility again when pinning dependencies.

1. Expo development builds explains development builds and native integration.

2. Expo SQLite documents persistence and exclusive transaction scope.

3. Expo react native SVG reference documents the SVG package integration.

4. Expo Haptics documents platform feedback APIs.

5. React Native Google Mobile Ads and its ad format documentation document the native adapter, test ads, and consent initialization sequence.

6. Expo testing with Jest documents jest-expo and React Native test setup.

7. Expo Router documents file-based routing and project setup.

## 22 Decision log

Owner decisions that changed this specification. Each entry links the planning ticket that holds the detail. Planning map: https://github.com/chrisgocode/pocket-mogul/issues/1
