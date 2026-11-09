# Pocket Mogul Game Design and Implementation Specification

Version 1.1 | November 3, 2026 (owner-approved) | Prepared for Christian Gonzalez and the implementing agent

Build a portrait mobile idle wealth game in React Native. Players tap for startup cash, improve their earnings per tap, buy and upgrade businesses across four tiers, trade fictional stocks and cryptocurrencies, and improve properties to earn rent. Deliver a playable local game with reliable persistence and explicit economy rules.

This document is the implementation contract for the first version. This Markdown file is the canonical agent handoff. It started as the v1.0 Word document and now includes the owner decisions listed in Section 22. The working name is Pocket Mogul (formerly Idle Wealth). Final branding is undecided.

## 1 Product decisions and scope

### Confirmed requirements

- Manual profit-based taxes, wealth-weighted rates, full/zero reporting, audits and installment recovery follow TAX01–TAX12 (§12); future permanent exemption has an explicit entitlement contract.

- React Native is the application framework.
- Tapping earns money. Wallet or card upgrades add small amounts to earnings per tap, and later upgrades cost more.
- An optional rewarded ad, started only from its own Tap Boost button, multiplies tap earnings by 5 for one minute of active play. It never appears automatically.
- Automatic ads also run: interstitials at natural breaks and app open ads on warm resume (Section 15).
- Players buy businesses and run them: each business is a small management game with units, prices, staff, growth stages, risks, a treasury, takeovers and listing on the stock market (Section 5). There are exactly four business tiers.
- A fictional stock market uses playful company names and original parody-inspired visual identities.
- A separate fictional cryptocurrency market provides tradable coins.
- Players buy real estate, upgrade properties, and rent them out.

### Implementation defaults

The following decisions fill gaps so implementation can proceed. The owner approved them on November 3, 2026, with the changes listed in Section 22: Expo and TypeScript; iOS and Android; local single-player saves; an eight-hour offline cap; 60 seconds of eligible foreground play for the ad boost; twelve business types (three per tier), twenty-four stocks, six coins, and eight properties; one owned instance of each business and property template; and the balance values in this document.

Use these defaults unless the owner changes them. Keep balance values in versioned content configuration. Numeric values are initial playtest settings, not validated retention or monetization targets.

### First version boundaries

Include the complete tap, business, stock, crypto, property, offline, save, tutorial, goal, optional rewarded-ad, and automatic-ad loops. All gameplay uses fictional money. Core play works without a network connection; ads depend on availability.

Defer accounts, cloud synchronization, a backend, shared markets, multiplayer, leaderboards, loans, short selling, leverage, limit orders, prestige resets, subscriptions, paid currency, push notifications, daily streaks, and detailed tenant negotiations. Each business is owned once; growth comes from its units, stages and takeovers rather than duplicate purchases. Three flagship businesses ship with their own mechanic in the first version; the other nine run on the shared business core until theirs ship in later updates.

Saves are local and on-device in version one. Cloud saves through the platform game services (Apple Game Center saved games on iOS and Google Play Games Services Saved Games on Android) are a planned later feature. Section 14 lists the save-model choices that keep that path open.

## 2 Technology stack

| Area | Decision | Responsibility |
|---|---|---|
| Application | React Native with Expo and TypeScript strict mode | Native iOS and Android screens and platform integration |
| Navigation | Expo Router with JavaScript `Tabs` | Five main tabs, each with a Stack for detail screens; Goals and Settings open from the header |
| Native development | Expo development builds with expo-dev-client from the first build; no Expo Go | Exercise native ads and other native modules; rebuild after adding native modules, changing config-plugin options, or upgrading the SDK [1] |
| Economy | Pure TypeScript modules | Money, progression, quotes, settlement, seeded markets |
| Persistence | expo-sqlite with explicit migrations | Canonical save, command receipts, history, recovery [2] |
| UI state | React local state and useSyncExternalStore | Read-only subscription to committed game snapshots |
| Validation | Zod | Validate content, save versions, and adapter inputs |
| Money | Native BigInt cents and separate price units | Exact balances, fractional quotes, and integer rounding |
| Charts and logos | react-native-svg | Small line charts, icons, original fictional identities [3] |
| Animation and feedback | React Native Animated and expo-haptics | Tap feedback, transitions, optional haptics [4] |
| Ads | react-native-google-mobile-ads ^17.4 via its Expo config plugin, behind an adapter | AdMob rewarded, interstitial, and app open placements, test ads, reward lifecycle [5] |
| Unit and UI tests | `bun test` for logic and engine tests; Jest 30 with jest-expo and React Native Testing Library (not react-test-renderer) for screen tests | Economy invariants, commands, critical interactions [6] |
| Native smoke tests | Agent-driven journeys on the iOS Simulator and Android Emulator on the owner's MacBook (T3 Code device tools; Maestro optional), plus manual checks on the owner's iPhone | Cross-screen journeys on actual native builds |
| Build and checks | Expo CLI, TypeScript, oxlint, oxfmt, Bun with one lockfile (`bun.lock`) | Repeatable development and release builds |

At setup, use Expo SDK 58 (React Native 0.88, React 19.3, Node 22.13 or later; checked on November 3, 2026). react-native-google-mobile-ads ^17.4 requires React Native 0.86 or later, the New Architecture, iOS 15.1 or later, and Android minSdk 24, which SDK 58 meets. Moving to a newer SDK is a separate, deliberate upgrade. Install Expo-compatible native dependencies through Expo tooling, verify the ad package compatibility matrix, and commit exact resolved versions in the lockfile. Record the resulting matrix in the project README. Do not independently upgrade React Native beyond the selected Expo SDK. Expo Router provides the navigation foundation [7].

Use Bun as the package manager and script runner (`bun.lock`, `bunx`). A JavaScript package manager is tooling, not the mobile runtime. Use the Expo-supported runtime configuration. Verify BigInt behavior on both native targets during the first build. Hermes supports BigInt; verify the chosen formatting path (a custom formatter over `toString()` is safest) on both platforms. `JSON.stringify` throws on BigInt, so save code converts amounts to base-ten strings explicitly.

Do not use Expo Go: it cannot load the native ads library. All work, including early UI work, uses development builds; acceptance testing uses development or release builds. Provide a mock ad adapter for tests and native test-unit integration for device validation. Keep gameplay functional when production ad credentials are absent.

## 3 App structure and navigation

| Surface | Primary content | Main actions |
|---|---|---|
| Earn | Tap wallet, per-tap income, boost timer, the next suggested step | Tap, upgrade the wallet, press the Tap Boost button (optional rewarded ad) |
| Businesses | Owned businesses and the four-tier catalog, filtered by Owned and Tier 1 to 4 chips | Buy, open a business |
| Markets | Stocks and Crypto segments, price changes, watchlist | Open asset, buy, sell |
| Properties | Owned properties and available listings | Buy, renovate, rent, upgrade, sell |
| Wealth | Net worth, allocation, income sources, realized and unrealized results, activity | Inspect holdings and transaction history |

A top bar on every tab shows cash, income per minute and progress to the next goal; Goals and Settings open from it. A business opens to its own full-screen page with sections: Overview (profit, treasury and payout, key figures, price), the business's own mechanic from stage 2, Grow (units, upgrades, stage), Staff, Risks (incidents and insurance), and Deals (takeovers and going public, when unlocked), with Sell at the bottom of Overview.

Buys and upgrades complete on one tap and show a short message with the income gained; each button shows its price and fills as the player saves toward it. Sales, takeover offers, going public, treasury withdrawals of the whole balance, and property purchases ask for confirmation on a shared sheet that shows the cash change and resulting ownership or income. Market orders have a specialized quote sheet. Disable repeated submissions while a command is pending.

The first session starts with zero cash, tap level zero, no assets, and Tier 1 available. A short tutorial highlights tapping, the first wallet upgrade, and the first business purchase. Tutorial steps observe completed actions and persist across restarts. Players can skip explanations; this does not change unlock rules. No automatic ads appear during the tutorial, and the Tap Boost button is optional.

The five bottom tabs are Businesses, Markets, Earn, Properties and Profile, with Earn centered. Profile includes Taxes, Goals & achievements and Settings alongside Wealth. All main tabs are visible from the start. Markets are readable immediately and become tradable after the first business purchase. Property listings are always readable and can be bought when affordable. Empty states explain the next available action.

## 4 Tapping and rewarded boost

Requirement IDs TAP01 through TAP06.

- TAP01: Each completed press on the tap card earns the currently quoted amount once. Press-and-hold does not auto-repeat. The domain computes the payout from the committed wallet and boost state for the accepted batch, not a value supplied by a UI label.
- TAP02: Level zero earns $1 per tap. Each wallet level adds $0.50. The initial level cap is 100. Upgrade price starts at $100 and grows by 1.45 for each level already owned. Use the exact integer calculation in Section 12.
- TAP03: The upgrade control shows current earnings, next earnings, price, and affordability. A successful purchase updates all four together.
- TAP04: Card artwork changes at levels 0, 10, 25, 50, and 100. Artwork changes are cosmetic; the displayed payout includes every economic modifier.
- TAP05: The player starts a rewarded ad only by pressing the Tap Boost button on Earn; it is never offered automatically. A completed rewarded ad grants 5x tap income for 60 seconds of eligible foreground game time. Time pauses while the app is inactive or backgrounded, or while a full-screen ad covers it. Time runs across all game tabs. Only one boost can be active; duration and multiplier do not stack.
- TAP06: Tap animations respond immediately. Optional haptics are throttled so rapid tapping does not create a backlog. Animations and sound never determine the actual balance.

Example: level 2 pays $2 per tap; while boosted it pays $10. The boost affects tapping only. Businesses, rent, dividends, market prices, and resale values use their normal rules.

## 5 Businesses

Requirement IDs BUS01 through BUS20. Each business is a small management game that runs on one shared core: units serve customers at a price the player sets, staff and upgrades move demand, capacity and costs, and profit lands in the business's own treasury. Three flagship businesses add a mechanic of their own (5.9); the other nine run on the shared core until theirs ship (5.10). Properties keep the simpler model in Section 8.

### 5.1 Catalog and tiers

The player can own all twelve businesses, one of each, three per tier. Revenue and costs are the business's figures at stage 1 with one unit, Standard price and no staff, in dollars per business day (5.2). Content derives the core figures from this table (5.3).

| Tier | Business ID and name | Price | Unit | Customer | Price per customer | Revenue per day | Costs per day |
|---|---|---|---|---|---|---|---|
| 1 | vending Vending Machine | $250 | machine | snack sold | $1.40 | $140 | $40 |
| 1 | food_cart Food Cart | $1,250 | cart | meal served | $9 | $720 | $220 |
| 1 | coffee_kiosk Coffee Kiosk | $4,000 | kiosk | cup sold | $4.60 | $2,300 | $700 |
| 2 | laundromat Laundromat | $7,500 | washer | load washed | $7 | $3,500 | $1,000 |
| 2 | car_wash Car Wash | $30,000 | bay | car washed | $26 | $13,000 | $4,000 |
| 2 | bakery Bakery | $100,000 | oven | order baked | $40 | $40,000 | $12,000 |
| 3 | delivery Delivery Company | $250,000 | van | parcel delivered | $9.50 | $95,000 | $35,000 |
| 3 | gym_chain Gym Chain | $1,000,000 | studio | member visit | $15 | $300,000 | $100,000 |
| 3 | hotel_group Hotel Group | $10,000,000 | room block | night booked | $250 | $2,000,000 | $800,000 |
| 4 | manufacturer Manufacturing Company | $50,000,000 | production line | batch shipped | $5,000 | $8,000,000 | $3,000,000 |
| 4 | airline Airline | $250,000,000 | plane | seat flown | $360 | $36,000,000 | $14,000,000 |
| 4 | space_launch Space Launch Company | $750,000,000 | launch pad | payload launched | $2,000,000 | $100,000,000 | $40,000,000 |

- BUS01: Buying a business spends the player's cash and creates one owned business atomically, at stage 1 with one unit, Standard price, no staff, an empty treasury and payout at 50 percent. It starts earning immediately. Earning needs no manager and no manual collection.
- BUS02: Tier 2 unlocks at $5,000 peak net worth, Tier 3 at $200,000, and Tier 4 at $8,000,000. Tier unlocks are permanent. The catalog previews the next milestone.
- BUS03: Buys and upgrades complete on one tap, with no confirmation sheet; the result shows as a short message with the income gained (Section 3). Sales, takeover offers and going public ask for confirmation.

### 5.2 Business day

- BUS04: A business day is 10 minutes of simulation time. Day boundaries fall at every multiple of 600,000 simulation milliseconds and are shared by all businesses. Income accrues continuously within a day at that day's rate (Section 12). At each boundary, in this order, the engine applies scheduled changes: ending and starting events and incidents, contract days, restocking, manager decisions, new offers, and takeover answers. The 8-hour offline cap is 48 business days.

### 5.3 Shared core

Each business has a unit count, a price level, two upgrade tracks (Quality and Efficiency), staff, a stage and a treasury.

- BUS05: Customers served per day are `min(demand, capacity)`. Revenue is served customers times the price per customer. Costs are an upkeep per unit, a cost per served customer, staff wages and insurance premiums. Section 12 defines every formula.
- BUS06: The price level is one of Budget, Value, Standard, Premium and Luxury. Each level multiplies the price per customer (70, 85, 100, 125 and 150 percent) and demand (145, 120, 100, 75 and 55 percent by default; content may set a business's own demand response). Changing price takes effect immediately. Details mark the level with the highest profit at the current settings.
- BUS07: Buying a unit adds full capacity and 60 percent of the base demand of a unit. Unit price starts at 40 percent of the business's purchase price and grows by 1.15 for each unit beyond the first. The stage caps the unit count.
- BUS08: Quality raises demand by 8 percent per level; Efficiency lowers the cost per served customer by 3 percent per level. Each track runs from 0 to 20 at the upgrade price curve in Section 12.
- BUS09: Content derives each business's core figures from the catalog: capacity per unit is revenue per day divided by price per customer; base demand is 110 percent of that capacity, so a new business has slightly more customers than it can serve; cost per served customer is 60 percent of costs per day divided by capacity; upkeep per unit is the remaining 40 percent of costs per day.

### 5.4 Treasury and payout

- BUS10: Profit goes to the business's treasury. The payout setting (0 to 100 percent in steps of 10, default 50) moves that share of each settled profit to the player's cash at once. The business's units, upgrades, staff, stage upgrades, insurance and takeovers are paid from its treasury. New businesses, properties and trades are paid from the player's cash.
- BUS11: The player can deposit cash into a treasury or withdraw from it at any time. Deposits and withdrawals are activity entries.
- BUS12: A treasury never goes below zero. A loss is taken from the treasury. If losses would take it below zero, the business closes at the moment the treasury reaches zero: it earns nothing and pays nothing, and its staff, units and levels stay. The player reopens it by depositing cash; it reopens with that deposit as its treasury. Personal cash is never taken automatically. A closure is an activity entry and appears in the return summary.

### 5.5 Staff and stages

- BUS13: Every business has three roles. Operations staff add 20 percent capacity each; sales staff add 15 percent demand each; one manager adds 10 percent to positive profit and makes the routine decisions in BUS14. Wages per day are 4, 6 and 10 percent of the business's catalog revenue per day for operations, sales and manager; hiring also pays a signing fee of three days' wages. Firing is free. The stage caps each role's headcount. A flagship may name its roles for its own setting (for example Restocker for vending operations) without changing what they do.
- BUS14: At each day boundary a hired manager sets the price level with the highest profit, renews insurance and makes the flagship's routine decisions listed in 5.9. The manager never deposits or withdraws, never makes takeover offers, never accepts a contract and never sells. Without a manager, settings stay as the player left them, offline too.
- BUS15: Businesses grow through five stages: Startup, Local, Regional, National and Global. A stage upgrade is paid from the treasury and requires the unit count at the current stage's cap and a number of business days since purchase. Each stage raises the caps and unlocks features:

| Stage | Unit cap | Operations cap | Sales cap | Upgrade price (× purchase price) | Days owned to upgrade | Unlocks |
|---|---|---|---|---|---|---|
| 1 Startup | 3 | 2 | 1 | | | Shared core |
| 2 Local | 8 | 5 | 2 | 2 | 3 | Manager, insurance, the flagship mechanic |
| 3 Regional | 20 | 12 | 4 | 8 | 10 | Takeovers |
| 4 National | 50 | 30 | 6 | 30 | 30 | Going public |
| 5 Global | 120 | 80 | 10 | 120 | 60 | The flagship's signature upgrade |

The stage replaces branch artwork: business art changes with the stage.

### 5.6 Risks and insurance

- BUS16: Each business has three incident types in content, each with a category (equipment, liability or supply), a chance per business day in basis points, and an effect: a treasury loss of some days of catalog revenue, or a capacity loss of some percent for some days. Incidents are drawn at each day boundary from the save's seed, the day index, the business ID and the stream name `incident` (Section 11), so replaying the same days draws the same incidents. Safety rules: no incidents in a business's first 30 days after purchase; at most one active incident per business; a treasury loss is capped at 20 percent of the treasury; incidents never touch personal cash. Offline incidents appear in the return summary.
- BUS17: From stage 2 the player can buy one insurance policy per category. A policy costs a premium per day of 2 percent of catalog revenue per day and covers 80 percent of a treasury loss, or halves a capacity loss and its duration, for incidents of its category. A policy renews daily while the treasury can pay its premium; it lapses otherwise.

### 5.7 Takeovers

- BUS18: Each business type has three fictional rival companies in content, each with a name, a unit count and a quality level. From stage 3 the player can make one offer at a time for a rival, paid from the treasury when accepted. The rival's valuation uses the formula in Section 12. At the next day boundary the rival accepts with a chance that rises from 0 at 80 percent of valuation to 100 percent at 140 percent, drawn from the seeded stream `takeover`. On acceptance the offer is paid and the rival merges in: its units join the business even above the stage cap, its quality raises the business's Quality to the higher of the two, and the rival leaves the list. A rejected offer locks offers for that rival for 5 business days. Merged rivals do not return.

### 5.8 Going public

- BUS19: From stage 4 the player can list a business on the in-game stock market. The player chooses a float of 10, 20, 30 or 40 percent and a ticker of 3 to 5 letters; the float times the valuation is paid into the treasury. The business becomes a listed stock in Markets with 1,000,000 shares, priced at each market tick from its valuation (Section 11). Outside shareholders receive the float's share of every payout, so the player's cash receives `payout × (100 − float)` percent. The player can buy back listed shares at the market price from cash; buying all of them delists the business. The player's stake counts in net worth at market price (Section 9). A listed business can still be sold: the buyer pays the player's stake at market price plus the treasury's share owned by the player.

### 5.9 Flagship mechanics

A flagship's mechanic unlocks at stage 2 with a coach mark; at stage 1 the business shows only the shared core. Each flagship's figures live in content.

**Vending Machine: placement and stock** (BUS20a)

- Machines are placed at locations: Office, Gym, School, Station and Hospital. Each location has slots, a traffic multiplier on demand, and a taste split between snacks, drinks and healthy items. Below stage 2 every machine stands at the Office.
- Each location has a stock mix: Snacks, Drinks, Healthy or Balanced. A location's demand is multiplied by how well the mix matches its taste, from 60 percent for a poor match to 140 percent for a perfect one.
- Machines hold stock. Each day sells stock in proportion to customers served. A location at zero stock serves no one. Restocking a location fills it and costs its restock fee from the treasury; restocking all locations is one tap. Operations staff are named Restockers and restock every location at each day boundary automatically.
- The manager moves each location's mix to its best match.
- Incidents: breakdown (equipment, capacity), vandalism (liability, treasury), expired stock (supply, treasury).
- Signature upgrade at stage 5: card readers, which add 20 percent to every price level's demand.

**Car Wash: packages and memberships** (BUS20b)

- Walk-in customers choose from three packages, Basic, Deluxe and Ultimate. Each has its own price multiplier and bay time, and a default share of walk-ins (60, 30 and 10 percent). The player can turn Deluxe and Ultimate off; their share moves to the next package down.
- Capacity counts bay time, so Ultimate washes use more of a bay than Basic washes.
- Each day has weather drawn from the seeded stream `weather`: Sunny, Cloudy, Rain, or After rain, which multiply walk-in demand by 120, 100, 50 and 160 percent. Details show the weather for the next three days.
- Memberships: members pay a daily fee whatever the weather and each uses a fixed share of bay time per day. New members join each day in proportion to Quality and the membership price level, and leave when capacity is short. The player sets the membership price level and a cap on the share of capacity members may use.
- The manager adjusts the membership cap ahead of forecast rain.
- Incidents: equipment failure (equipment, capacity), damage claim (liability, treasury), water price rise (supply, cost per customer up for some days).
- Signature upgrade at stage 5: detailing, a fourth package at a high price that uses the most bay time.

**Delivery Company: contracts and fleet** (BUS20c)

- Capacity is parcels per day from vans. Operations staff are named Drivers; a van without a driver delivers nothing.
- Most revenue comes from contracts. Each day the offers board shows up to three offers drawn from the seeded stream `contract`. An offer has a fictional client, parcels per day, a rate per parcel, a length in days, and a penalty per undelivered parcel. Unanswered offers expire after 2 days.
- Accepted contracts are served first, in acceptance order. Parcels a day cannot deliver are missed, and each missed parcel costs its contract's penalty. Spare capacity serves ordinary walk-in demand at the price level.
- Reputation, from 1 to 5 stars, is the on-time share of contract parcels over the last 10 days. Higher reputation brings bigger offers at better rates.
- The route planner upgrade replaces Efficiency for this business and adds parcels per van instead of lowering cost.
- The manager declines nothing and accepts nothing, but drops walk-in demand when contracts need the capacity.
- Incidents: van crash (equipment, capacity), lost-parcel claim (liability, treasury), fuel spike (supply, cost per customer up for some days).
- Signature upgrade at stage 5: a sorting hub, which adds 30 percent capacity.

### 5.10 The other nine

Until their own mechanic ships, these businesses run on the shared core with staff, stages, insurance, takeovers and going public. Planned mechanics: Coffee Kiosk, morning rush and bean grades; Food Cart, a daily spot and a short menu; Laundromat, machine mix and service washes; Bakery, an oven schedule and wholesale orders; Gym Chain, membership tiers and classes; Hotel Group, room rates by season and star rating; Manufacturing Company, production lines and bulk orders; Airline, routes and fleet; Space Launch Company, launch slots and payload contracts. Each follows the flagship pattern: content figures, a mechanic at stage 2, manager decisions, three incidents and a stage 5 signature upgrade.

Business value: before listing, a business's carrying value is its purchase price plus spending on units, upgrades and stage upgrades, plus its treasury. Wages, premiums, restocking and signing fees are operating expenses and excluded. Selling an unlisted business pays 60 percent of that spending plus the whole treasury, after settling income. A repurchase starts fresh at stage 1.

## 6 Fictional stocks

Requirement IDs STK01 through STK06. The market belongs to the local save. Prices are generated by the game; there is no real market feed or user-to-user trading.

- STK01: Each stock has an immutable ID, ticker, name, sector, original logo, description, starting price, price history, and optional dividend rate.
- STK02: Show current price, available history, change over the selected period, holdings, average cost, current value, unrealized result, and a watchlist toggle.
- STK03: Support buy and sell market orders with up to six decimal places of quantity. Presets are 25, 50, and 100 percent of affordable cash or owned quantity. A dollar input may be converted to quantity with the same quote function.
- STK04: Show notional, trading fee, total cash change, quantity, and quote timestamp before confirmation. A changed market tick invalidates the quote and requires review of the refreshed amount.
- STK05: Company, sector, and market events affect prices. A compact news feed explains the event and duration without claiming to predict the next price.
- STK06: Nine launch stocks pay dividends: three original payers and six blue chips. Entitlement accrues in proportion to quantity and eligible holding time, and is paid at each simulation-hour boundary. Buying just before a payout earns only the time actually held.

| ID and ticker | Fictional company | Sector | Class | Initial price | Dividend per whole share per simulation hour |
|---|---|---|---|---|---|
| prism PRZM | Prism Labs | Technology | Standard | $25 | $0.02 |
| kilobyte KBYT | Kilobyte Systems | Technology | Standard | $40 | $0 |
| parcelvine PVN | ParcelVine | Commerce | Standard | $35 | $0 |
| cart CBR | CartBarn | Commerce | Standard | $12 | $0 |
| volt VLT | Voltara Motors | Mobility | Standard | $50 | $0 |
| loop LPR | LoopRide | Mobility | Standard | $8 | $0 |
| brick BRIK | Brickbank | Finance | Standard | $20 | $0.03 |
| vault VCR | VaultCard | Finance | Standard | $30 | $0 |
| sun SGR | SunGrid | Energy | Standard | $15 | $0 |
| barrel BRL | BarrelWorks | Energy | Standard | $18 | $0.02 |
| beanstreet BNST | Bean Street | Food | Standard | $10 | $0 |
| bunvoyage BUNV | Bun Voyage | Food | Standard | $6 | $0 |
| summit SMHD | Summit Holdings | Finance | Blue chip | $850 | $0.85 |
| atlas ATIN | Atlas Insurance | Finance | Blue chip | $560 | $0.50 |
| ironclad IRCL | Ironclad Industries | Industrials | Blue chip | $410 | $0.41 |
| willowbrook WLBH | Willowbrook Health | Health | Blue chip | $320 | $0.32 |
| clearwave CLWV | Clearwave Telecom | Telecom | Blue chip | $180 | $0.27 |
| evergreen EVGU | Evergreen Utilities | Energy | Blue chip | $150 | $0.21 |
| fizzwater FZWB | Fizzwater Beverages | Food | Penny | $0.65 | $0 |
| glowbug GLBG | Glowbug Gadgets | Technology | Penny | $0.42 | $0 |
| moonshot MSBT | Moonshot Biotech | Health | Penny | $0.33 | $0 |
| couchpotato CPMD | Couch Potato Media | Media | Penny | $0.27 | $0 |
| rocketrex RRXM | Rocket Rex Mining | Mining | Penny | $0.18 | $0 |
| zapcar ZPCR | Zapcar Rentals | Mobility | Penny | $0.09 | $0 |

These are working fictional identities. Create original vector marks from simple shapes, such as a prism, a parcel with a vine, or a lightning road. Keep them visibly part of the game's own visual system. Runtime assets must not depend on remote company logo services.

Naming rule: each name nods at its sector, never at a real brand. A name carries at most one recognizable signal, ideally the sector: no shared distinctive syllables, one-letter swaps, or sound-alikes of real marks, and no copied logo shapes, motifs, or house colors. Parody names appear only inside the game, never in the app name, icon, store listing, keywords, or ads. Tickers avoid live NYSE and Nasdaq symbols. News never names real people, products, or events. Before content IDs freeze, search every name and ticker in the USPTO trademark database (classes 9, 28, and 41) and on the exchanges.

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
| wag WAGX | Wag Coin | Meme coin | $0.10 |
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
| skyline Skyline Tower | $150,000,000 | $450,000 | $75,000 | Yes |
| seaside Seaside Resort | $400,000,000 | $1,100,000 | $200,000 | Yes |

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

UX02: Net worth is cash plus business carrying value (Section 5, including each treasury), the player's stake in listed businesses at market price instead of carrying value, estimated property value, current stock and crypto position value, and pending earned dividends. Use integer cents. Display the valuation convention in an expandable explanation. Peak net worth only increases and drives permanent unlocks. Update the peak and unlocks after financial commands and each settled market or dividend boundary, including during offline processing.

UX03: Include goals for the first wallet upgrade, first business, first rental, first stock purchase, first crypto purchase, first dividend, and peak wealth of $1,000, $10,000, $100,000, $1,000,000, $10,000,000, $100,000,000, and $1,000,000,000. Goals award badges and feedback, with no extra cash rewards in version one. Players can pin one purchase goal.

UX04: Show a readable activity history for purchases, sales, upgrades, trades, dividends, and offline settlement. Aggregate tap batches and ordinary income accrual rather than displaying every tap or second. Preserve lifetime totals separately from a bounded history.

UX05: On return, automatically credit earned passive income and show a summary. Business income shows both cash received and treasury growth, and lists incidents, closures and expired contracts from the absence. The Continue button dismisses the summary; it does not grant a second reward. Include time away, credited duration, earnings by source, and whether the offline cap was reached.

## 10 Time and offline behavior

There are two explicit clocks. Simulation time drives passive income, market ticks, events, and dividends. Boost time counts eligible foreground game time only. A render frame is neither clock.

During foreground play, advance simulation by monotonic elapsed time. During resume, calculate nonnegative wall-clock elapsed time since the last durable checkpoint and credit at most eight hours. Advance every economy system by the same eligible interval. Afterward, move the wall checkpoint to the current wall time even when excess absence was discarded.

This means markets also advance by at most eight simulation hours per absence. Charts use labels such as past 60 market minutes rather than implying a continuous live exchange history. Prices, rent, business income, and dividends all continue without network access.

On a backward wall-clock change, grant zero offline elapsed time, reset the wall baseline, and record a local diagnostic event. Foreground monotonic progress continues. This is a convenience rule for a local game, not secure protection against device-clock manipulation. A trusted shared economy would require a different architecture.

The simulation advances in segments ending at scheduled boundaries: market ticks, dividend payouts, event starts or ends, and the requested target time. Settle the old rates up to a boundary, then apply its changes. At an exact shared boundary, accrue prior-period dividends, post their payout, process event changes, and generate the next market quote before accepting a new player command.

Business day boundaries (every 600,000 simulation milliseconds, Section 5.2) are scheduled boundaries like market ticks. Offline settlement walks every day boundary in the credited interval, so incidents, contract days, restocking, manager decisions, closures and offers resolve in order while the player is away, with the same results as playing through. At a shared boundary, process market and dividend changes first, then business days.

For business and rent income, maintain a remainder per income stream. A constant rate of one cent per minute advanced sixty times by one second must pay the same total as one sixty-second advance. Selling the last asset does not erase a stream's sub-cent remainder.

On app inactivity, flush pending tap batches and checkpoint. Also checkpoint during foreground play at least every five seconds and after each financial action. A forced kill may lose only an uncommitted tap batch of at most 250 milliseconds; committed purchases, trades, ownership, and grants must survive. Passive elapsed time is reconstructed from the durable checkpoint.

A full-screen ad (rewarded, interstitial, or app open) is not an absence. On Android, closing one reports a background-to-foreground transition; that transition must not trigger offline settlement, a return summary, or an app open ad. Boost time still pauses while the ad covers the game.

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

Each stock has a volatility class. Standard and blue-chip stocks use the stock column above. Penny stocks use the same values except the asset shock, which is an integer from -80 to +80 basis points.

Choose a shared bear, neutral, or bull regime every 30 ticks with probabilities 25, 50, and 25 percent. Use separate shock streams for stocks and crypto. Once every 30 ticks per asset class, select exactly one event: company or coin event 50 percent, sector event 25 percent, market event 25 percent. For crypto, replace the sector choice with a coin event. Select direction equally. Events do not directly change business rates or property rent in version one.

Add a weak anchor pull to each asset: calculate five basis points times the relative difference between its initial price and current price, rounded toward zero and clamped to -25 through +25 basis points. Sum the common, sector, asset, regime, event, and anchor contributions. Clamp total return to -2,000 through +2,000 basis points. Apply that return to the previous price, round to the nearest microdollar with half upward, and enforce a one-microdollar minimum. Use integer arithmetic for the ratios. A $0.10 coin with a +100-basis-point return becomes $0.101, rather than remaining frozen at ten cents.

Store 480 one-minute observations and 720 hourly OHLC observations per asset, with a partially built hourly candle. With 30 assets this is about 36,000 history rows. Keep completed history in a separate SQLite table so tapping does not rewrite thousands of chart points. Trim older observations deterministically. Offer 1 hour, 8 hours, and 30 market days when history exists; show the available range for new saves. Record explicit opening and closing prices for period-change calculations.

Stock dividends use the fixed configured cents per whole share per simulation hour, not current price times a yield. Accrue pro rata before every trade and boundary. Keep fractional entitlement in an integer numerator with denominator 1,000,000 quantity units times 3,600,000 milliseconds. At hourly boundaries transfer whole accrued cents to cash and retain the remainder. Selling a holding retains previously accrued entitlement until payout. Avoid retroactive dividends on newly bought shares.

Listed player businesses (Section 5.8) trade beside the fictional stocks with the stock fee. Their quote at each tick is `floor(valuation * 1000000 / 1000000 shares)` microdollars per share times `(10000 + noiseBps) / 10000`, where noiseBps is an integer from -100 to +100 drawn from the seed, tick, business ID and stream `listing`. They join no regime or event and pay no separate dividend; outside shareholders receive their share of payouts (Section 12). The player's own listed shares are a position like any other.

## 12 Money and progression calculations

All examples are normative fixtures for the initial configuration. Store cash and transaction totals as BigInt cents, quote prices as BigInt millionths of a dollar, and quantities as BigInt millionths of a share or coin. Use distinct types such as MoneyCents, PriceMicros, and QuantityMicrounits to prevent unit mistakes. Serialize them as base-ten strings. Timestamps and bounded levels may be ordinary safe integers. UI formatting must not convert large balances to floating point first.

### Tapping

Use integer powers so the price and purchase agree exactly. L is the current wallet level.

```text
tapCents(L) = 100 + 50 * L
upgradeCents(L) = ceil(10000 * 145^L / 100^L)
boostedTapCents = tapCents(L) * 5
```

Level zero costs $100 to upgrade. Level one costs $145. Level two costs $210.25. Level three costs $304.87. Retain these as rounding fixtures. Show Max level once L equals 100.

### Business rates and upgrades

All money is integer cents; customer counts are whole customers per business day. Content holds, per business, `pricePerCustomer`, `capacityPerUnit`, `baseDemand`, `costPerCustomer`, `upkeepPerUnit` and the demand response by price level, derived from the catalog as BUS09 describes. U is the unit count; Q and E are the Quality and Efficiency levels; ops and sales are headcounts. Multipliers in basis points default to 10000 when nothing applies.

```text
dayMs = 600000
priceBps = [7000, 8500, 10000, 12500, 15000][priceLevel]
demandBps = demandResponse[priceLevel]        default [14500, 12000, 10000, 7500, 5500]
demand = floor(baseDemand * (100 + 60*(U - 1)) * demandBps * (100 + 8*Q) * (100 + 15*sales)
    * mechanicDemandBps * eventDemandBps / (100 * 10000 * 100 * 100 * 10000 * 10000))
bays = floor(capacityPerUnit * workingU * (100 + 20*ops) * mechanicCapacityBps * incidentCapacityBps
    / (100 * 10000 * 10000))
capacity = floor(max(0, bays - memberBay) * 10000 / bayBps)
served = min(demand, capacity)
price = floor(pricePerCustomer * priceBps * mechanicPriceBps / (10000 * 10000))
costPerServed = floor(costPerCustomer * (100 - 3*savingE) * supplyBps / (100 * 10000))
wagesPerDay = sum over hired staff of floor(catalogRevenuePerDay * roleWagePercent / 100)
premiumsPerDay = policies * floor(catalogRevenuePerDay * 2 / 100)
gross = served * price + mechanicRevenue - upkeepPerUnit*U
    - (served + min(memberBay, bays))*costPerServed - wagesPerDay - premiumsPerDay - mechanicCosts
profitPerDay = (gross > 0 and managerHired) ? floor(gross * 11000 / 10000) : gross
unitPrice = ceil(purchasePrice * 4000 * 115^(U - 1) / (10000 * 100^(U - 1)))
upgradeCost = ceil(purchasePrice * weightBps * 118^currentTrackLevel
    / (10000 * 100^currentTrackLevel))        Quality 2500, Efficiency 1500
stageUpgradePrice = purchasePrice * [2, 8, 30, 120][currentStage - 1]
valuation = max(0, profitPerDay) * sectorMultipleDays + treasury
offeredBps = floor(offer * 10000 / valuation)
acceptChanceBps = clamp(floor((offeredBps - 8000) * 10000 / (14000 - 8000)), 0, 10000)
```

`sectorMultipleDays` is 10 for every business until businesses carry sectors. A rival is valued as a stage 1 business of its type with the rival's units and Quality, Standard price, no staff and an empty treasury, so its valuation is fixed by content. A rival with a valuation of zero accepts any offer.

`bayBps`, `mechanicPriceBps` and `memberBay` are 10000, 10000 and 0 except at a Car Wash (5.9), so `capacity` equals `bays` elsewhere. `workingU` is U and `savingE` is E except at a Delivery Company with its mechanic running, where `workingU = min(U, ops × vansPerDriver)` (a van needs a driver), `savingE = 0` (the route planner replaces Efficiency), `mechanicCapacityBps = 10000 × (100 + 5E) × (100 + 30 with a sorting hub) / (100 × 100)`, and `memberBay` is the parcels due on accepted contracts. Contracts take `min(memberBay, bays)` parcels in acceptance order: `mechanicRevenue` adds each contract's delivered parcels × its rate and `mechanicCosts` its missed parcels × its penalty. The day's rate is fixed between boundaries. A command that changes price, staff, units, upgrades or insurance settles the old rate up to the command time and applies the new rate from then on; the day boundary does not wait.

A base Vending Machine serves 100 of 110 customers at $1.40 and costs $16 upkeep plus 100 × $0.24, so it earns $100 per business day, $10 per minute, as before. At Premium it serves 82 customers at $1.75: revenue $143.50, costs $35.68, profit $107.82 per day. At Luxury it serves 60 at $2.10 for $95.60. The details screen marks Premium as the best level.

### Treasury settlement

For each business, settle profit like any income stream (Passive accrual below), with `dayMs` as the period:

```text
numerator = profitPerDay * elapsedMs + remainder
settled = floor(numerator / dayMs)            floor toward negative infinity
remainder = numerator - settled * dayMs
if settled > 0:
    toCash = floor(settled * payoutPercent * (100 - floatPercent) / 10000)
    toOutside = floor(settled * payoutPercent * floatPercent / 10000)
    treasury += settled - toCash - toOutside
else:
    treasury += settled                        closes the business at zero (BUS12)
```

When a segment's loss would cross zero, the closure time is `start + ceil(treasury * dayMs / -profitPerDay)` milliseconds into the segment, and settlement stops there. Outside shareholders' share leaves the game; it is recorded as a lifetime total.

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

Settle before every ownership or rate change. There is no compounding from idle cash and no automatic reinvestment. Eight hours with one base Vending Machine earns $4,800 of profit: at the default 50 percent payout, $2,400 to cash and $2,400 to its treasury. Ten hours away still earns $4,800 under the initial cap, and a second immediate resume cannot claim the discarded two hours.

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

### Manual taxes and filing (#93)

The owner-approved design and worked examples are retained in [tax-proposal.md](tax-proposal.md) and [tax-worked-examples.md](tax-worked-examples.md). These rules supersede the original #93 ticket's automatic-withholding proposal and exclusions of audits, debt and paid exemption.

- TAX01: Assess the player's share of actual business profit, including retained Treasury profit; net rental income; earned external dividends; and realized gains on all stock, crypto, business/share and property disposals. Taps/Tap Boost are exempt. Outside shareholders' economic share never enters this personal ledger. Treasury transfers/Payout are not new ordinary income. No ordinary withholding or protected reserve exists.
- TAX02: Weight net-worth slices at 0% through $10K, 5% to $100K, 10% to $1M, 15% to $10M and 20% above. Divide their weighted sum by current positive net worth, floor once to a whole basis point, and freeze that blended income rate each Business day. Zero/negative wealth gives zero. Assets/unrealized appreciation are not themselves taxed. Tax liabilities reduce net worth once; peak wealth remains a separate permanent-unlock measure.
- TAX03: Each Business day records gross, actual costs, owner's profit, opening losses, loss offsets, taxable base, rate, tax and fractional remainders. Deduct customer costs, upkeep, wages/signing fees, premiums, restocking, contract penalties and actual uninsured incident cash losses exactly once. Capital purchases/upgrades/takeovers, tax and fines are not operating deductions. A capacity/demand reduction is reduced income, not a second deduction. Same-day expense order cannot change final tax. Negative profit carries forward by business/rental; disposal losses share one personal capital pool. Pools and fractions survive sale/rebuy and zero holdings; they never refund earlier finalized days or cross into an unrelated operating source.
- TAX04: Tax basis is separate from performance-reporting basis. Buy fees form basis, sell fees reduce realized profit, partial sales allocate proportionally and final sales consume the exact remainder. Company ownership basis includes contributions and earned owner profit and decreases for distributions and operating losses. Company-funded capital spending adds no second personal basis. IPO funding is financing, with existing owner basis preserved on retained shares; buybacks add personal spending to basis and delisting preserves it. Previously recognized retained profit cannot be taxed again on exit. Listed withdrawals distribute proportionally to owner/outside shareholders. Listed exit pays the owner's share-sale value less the stock fee; Treasury already included in that value is not granted again.
- TAX05: A Tax return groups 36 Business days (six credited simulation hours). File oldest first: Report everything assesses T, collects available personal cash and places any remainder on installments, without a fine; Report nothing pays zero now and commits one immutable 40% seeded audit outcome, revealed after ten eligible minutes. An audit assesses original T plus a 2T fine. Successful evasion is final. Filing later, restarting, replaying or changing time segmentation cannot redraw. Zero-tax returns close automatically. No early prorated or partial reporting.
- TAX06: An unfiled positive return or assessed unpaid debt blocks discretionary buys, upgrades, hires, IPO/buybacks and takeovers, including wallet upgrades. Existing earnings and operating expenses continue. Taps, sales, Treasury transfers, restocking, insurance renewal and risk/staff reductions remain usable. Outstanding takeover offers lapse without a punitive lock while restrictions apply. A pending audit or current estimate alone does not restrict investment.
- TAX07: Tax/audit collection uses personal cash only. No forced sales, negative cash, cross-Treasury raid, earnings freeze, interest, late fee or repeating penalty. Debt recovers 25% of subsequent eligible personal cash credits (Payout, rent, dividends, withdrawals and net sale proceeds), with a remainder and capped final payment. Taps are excluded from automatic recovery but can fund voluntary payment; existing cash is not protected by its origin. Transfers used for recovery create no new income. New earnings still accrue ordinary tax during recovery.
- TAX08: All deadlines and accrual use eligible Simulation time. A ten-hour absence creates at most eight credited hours of tax and audit aging. No absent player is auto-filed as an evader. Return summary saves gross/costs, new estimated tax, actual collections, personal cash received and Treasury growth separately; Continue is nonfinancial. Estimated/unfiled tax and assessed debt are liabilities once; payment reduces cash and debt together, not net worth twice. Zero filing removes the estimate and exposes its possible audit bill separately.
- TAX09: Profile exposes Taxes alongside Goals & achievements and Settings. Keep five tabs with Earn centered. Taxes shows source/day accounting, blended rate, exemption/loss explanations, returns, filing confirmation, audit exposure/status, debt/recovery and lifetime totals. Quotes distinguish actual cash credits from estimated after-tax profit; business detail places the owner's tax forecast before Payout. Sale sheets show basis, gain/loss, estimated tax and actual cash after debt recovery, using the same command ledger. A financial confirmation carries its reviewed revision and expires at the next market boundary. It executes at that committed simulation boundary, then elapsed time accrues under the resulting ownership; a changed revision requires review. This keeps reviewed basis/tax firm while preventing stale contracts. Wealth/Activity expose tax without double-counting it.
- TAX10: Preserve the latest 48 resolved returns plus every unresolved return/audit/debt; retain lifetime totals, loss pools, fractions and current basis independently. State/receipts/filings/audit outcomes/collections/statements commit atomically. Failed saves publish no change; duplicate commands return their receipt. A tax-active save requires reader capability 4, while the additive neutral tax record does not bump schema 2. Baseline saves load as not started; missing monetary fields in an active ledger are corruption.
- TAX11: Economy 2 retains economy 1 for outstanding old intervals. Activate prospectively at the next shared Business-day boundary after old-economy settlement. Initialize held assets' tax basis at their net realizable exit value at activation, leaving historic performance basis unchanged: no fabricated historic income, liabilities, losses or tax on pre-activation appreciation. New acquisitions use actual spending. Older readers must refuse an activated save rather than discard its accounting.
- TAX12: The future permanent tax-exemption product is a verified, restorable non-consumable entitlement targeting US $0.99 with localized store pricing. It covers all current/future assets and reset saves, waives unpaid tax/fines/returns/audits, gives no cash refund, and removes future filing. It does not remove ads. Retain cached verified ownership offline; unavailable verification is not revocation. Confirmed revocation starts prospective taxation with newly valued basis and no revived waived debt. Preserve history; a first partial day after revocation closes at the next shared boundary and the first return at the sixth-hour shared boundary. Implement/test the entitlement port now; actual storefront checkout/product setup remains the explicitly future purchase launch, with no fake purchase button. Free progression/recovery must remain viable.


## 13 Domain boundaries and command contract

Use one application, with clear module boundaries rather than an initial monorepo. React components issue commands and render selectors. They do not directly change cash, holdings, levels, or clocks.

| Module or directory | Responsibility |
|---|---|
| src/app | Expo Router routes and screen composition |
| src/features | Earn (the home tab), businesses, markets, properties, wealth (portfolio), goals, settings |
| src/domain | Pure commands, quotes, money, progression, settlement, market simulation; the shared business core in `src/domain/business`, and each flagship mechanic in its own module under it (`vending`, `carWash`, `delivery`) behind one mechanic interface |
| src/content | Versioned business, property, stock, coin, event, and balance definitions |
| src/application | Serialized command service, clock coordination, selectors, subscriptions |
| src/infrastructure | SQLite repository, migrations, ad and telemetry adapters |
| src/ui | Shared controls, typography, tokens, charts, original SVG assets |
| tests and scripts | Fixtures, integration journeys, balance simulations, content validation |

Core commands are TapBatch, UpgradeWallet, BuyBusiness, BuyUnit, UpgradeBusiness (Quality, Efficiency or a flagship upgrade), SetPriceLevel, HireStaff, FireStaff, UpgradeStage, SetPayout, DepositToTreasury, WithdrawFromTreasury, SetInsurance, MakeTakeoverOffer, GoPublic, SetBusinessMechanic (a flagship's own settings: vending placement, mix and restock; car wash packages and memberships; delivery contract answers), SellBusiness, BuyProperty, UpgradeProperty, SetRentalStatus, SellProperty, ExecuteTrade, SetWatchlist, PinGoal, RecordAdReward, ActivateBoost, AdvanceTime, SettleOffline (the capped wall-clock catch-up on launch and resume), AcknowledgeReturnSummary, and UpdateSettings. ResetSave is a separate destructive settings action requiring an explicit in-app confirmation.

Each command envelope has a unique ID, expected state revision, accepted clock input, and validated payload. Quotes include their configuration version and relevant state revision; market quotes also include tick index. The domain returns a new state, ledger entries, and typed results or errors. External effects occur through adapters after transaction boundaries.

Use typed errors including INSUFFICIENT_CASH, INSUFFICIENT_TREASURY, BUSINESS_CLOSED, STAGE_LOCKED, AT_CAP, OFFER_PENDING, OFFER_LOCKED, ALREADY_LISTED, ALREADY_OWNED, LOCKED_TIER, MAX_LEVEL, INVALID_QUANTITY, INSUFFICIENT_HOLDING, STALE_QUOTE, BOOST_ACTIVE, AD_UNAVAILABLE, SAVE_FAILED, and UNSUPPORTED_SAVE_VERSION. Map them to clear UI text. Preserve entered trade quantity when a quote becomes stale.

### Disabled purchase port (#96, parent #95)

The Game receives one application `BillingPort` at composition. Its narrow `Game.purchases` interface exposes coordinated purchase, restore, recover and dispose operations and a safe product metadata read. Raw initialization, current ownership, event subscriptions and completion remain private to the coordinator. Normal device builds bind `disabledBilling`: its catalogue is empty and purchase, restore, ownership and initialization requests return `disabled`. Launch, restart and resume perform no billing initialization or provider work. No store SDK, native configuration, real product, price, benefit mapping or public checkout/restore control is supplied.

The normalized contract covers initialization, product metadata with an unchanged store-formatted display price, purchase outcomes, current ownership, explicit restore, event subscription with owned unsubscribe/disposal, and completion capability. Cancellation, declined payment, pending approval, verification failure and unavailable/disabled billing are separate outcomes. Store completion is separate from application delivery (`delivered` or `saveFailed`); a billing error is not a Game `SAVE_FAILED`. A completed port result is evidence, never proof of local benefit delivery.

Evidence references include store (Apple or Google), app and sandbox/production environment, product and authoritative purchase identity (Apple transaction reference or Google purchase token, never an order or callback ID). Verification records source and verification time. Ownership queries distinguish authoritative/cached and complete/incomplete observations with observation time and explicit removal references. Unavailable verification is not empty authoritative ownership. Completion declares application-owned finish/consume versus provider-managed completion. SDK-specific objects do not enter this contract, the domain or shared UI.

Slice #96 established the port and disabled baseline. Scripted responses, deferred promises and deterministic change events use the existing Game startup/restart harness, injected clock and persistence fault controls. At that baseline no purchase data or effects were persisted and no automatic billing listener or reconciliation was started. Slice #97 below adds raw-store delivery and recovery for authorized test fixtures. Existing tax entitlement restoration and offline ordering are unchanged. Future delivery guarantees are local to a surviving purchase database unless reconstructed from verified ownership; no global consumable-wallet guarantee is implied. Real native checkout and provider selection remain separate follow-ups.

### Purchase delivery scaffold (#97)

The canonical purchase contract is [#95](https://github.com/chrisgocode/pocket-mogul/issues/95). Following the disabled port (#96), this slice supports only explicitly configured test fixtures for verified raw-store non-consumable Permanent tax exemption. Production composition has no purchase policy, an empty catalogue and disabled billing. There is no real product, price, SDK, checkout, paywall or Restore Purchases control.

The application validates store/app/environment, product and verified product class before delivery. `purchaseId` means an Apple transaction reference or Google purchase token, never a Google order ID, callback ID or webhook ID. The deduplication key encodes store, app, environment and that reference. A completed verified result from the trusted billing port is required; pending, unavailable and verification-failed results grant nothing. Unsupported classes and completion actions are rejected. This fixture accepts non-consumables with application-owned finish/acknowledgement only; it does not implement consumable delivery or managed-provider recovery.

SQLite migration 6 adds `purchase_receipts` outside resettable progress. Each record retains normalized verified evidence, its benefit, durable delivery result and pending/completed completion work. It contains no second financial balance. One existing SaveStore transaction writes the Game effect, receipt and pending completion work; a failure rolls all three back and returns `saveFailed` without publishing a delivered Game state. Only after the committed Snapshot is published may raw-store completion run. `finish` denotes Apple finish or Google acknowledgement for this verified non-consumable class; consume is never selected for this fixture. Duplicate identities return the durable delivered result without reapplying the effect.

On launch, foreground or ownership-change reconciliation, pending records retry completion and the store's verified ownership evidence can retry a delivery that never committed. Failure before commit therefore depends on the raw store replaying its unfinished transaction. Failure after commit retries completion only. A failed/lost completion response, including a failure saving the completion marker, leaves durable retry work; `alreadyCompleted` reconciles it safely. Unavailable verification does not remove a committed entitlement. Purchase receipts are independent of command receipt retention and Reset Save clears neither them nor their completion work. Reset continues to preserve the existing exemption behavior; slice #98 below adds the ownership/identity restoration journey. Pending operations (#100), revocations (#101) and managed provider recovery (#102) are not implemented here.

Evidence is retained only in the purchase database for recovery; no purchase payloads or identifiers are sent to routine diagnostics. SQLite tests exercise rollback, migration from the preceding schema and physical close/reopen, and Game tests exercise duplicates, fault recovery and reset. The save projection and save format version do not change. These are local guarantees within a surviving purchase database, not global exactly-once delivery across reinstalls or devices.

### Durable ownership restoration (#98)

SQLite migration 7 adds a singleton purchase identity with an optional opaque provider reference, independent of the resettable save ID. Enabled fixture initialization receives this identity; a verified provider reference returned by initialization is retained for future launches. Reset Save never replaces purchase identity, logs out of billing or starts another purchase. Ownership and delivery evidence remain in the auxiliary purchase receipts, independently of command receipt pruning. No additive GameState field or save schema bump is needed.

On launch and foreground, the Game first reprojects durable permanent ownership through its existing serialized commit boundary, then performs bounded provider reconciliation before normal Offline settlement. Explicit `Game.purchases.restore()` normalizes verified ownership through the same idempotent delivery path. A restored permanent benefit is distinct from restored progress: it waives unpaid taxes and preserves resolved/waived history according to the existing entitlement rules, without granting cash or reconstructing assets. Repeating restore does not repeat its effect or completion. Reset clears progress, activity, market history and backups as before, while retaining permanent access and the purchase ledger.

A new grant requires a complete, authoritative ownership observation at least as recent as the request's injected wall-clock reading and an authorized test product mapping. Cached/stale/incomplete observations, network errors and unknown products grant nothing new. These responses, an empty inventory or missing catalogue never remove previously verified permanent access. Durable receipts can reestablish cached access even without a current catalogue or progress save, but only within store/app/environment namespaces explicitly authorized by the current purchase policy. Empty product mappings preserve that scope authority; absent or mismatched scopes cannot project cached benefits. Explicit authoritative revocations and stale callback recovery after revocation belong to #101; this slice does not process removal references.

The Game owns one billing listener before initial reconciliation and releases it on disposal; late results cannot deliver into a disposed Game. Delivery, cached restoration and completion-marker writes check disposal inside the serialized queue and again at transactional write boundaries, rolling back interrupted writes. Provider initialization is shared per Game. Initialization, current inventory, explicit restore and raw completion each wait at most two seconds using the injected scheduler; failures/timeouts fall back to unavailable, and late timed-out results are ignored. Provider work stays outside the Game commit queue so free commands remain usable. Cached access is projected before catch-up; unavailable billing still permits one normal settlement and the existing persisted Return summary, with no duplicate earnings. Legacy `taxEntitlement` injection and its settlement order remain compatible. Production has disabled billing and no authorized catalogue, so it performs no provider initialization or reconciliation.

Tests use the existing Game/restart harness and SQLite persistence contracts, including physical reopen/migration, reset, repeat restore, offline reconstruction, stalled initialization/inventory, listener ownership, disposal and Return summary behavior. These tests do not validate a native billing SDK. SDK selection, SDK 58 iOS/Android integration, store products/accounts and native purchase/restore acceptance remain a separate gate. #100 payment interruptions and #102 provider-managed recovery are deferred. The local ledger cannot survive uninstall/device loss, restore Game progress or establish an unspent consumable balance; future verified same-store restoration can reconstruct permanent ownership only. There is no cross-device/global exactly-once wallet guarantee.


## 14 Save model and transaction flow

Use one validated state snapshot as the authoritative representation of ownership and balances. Other database tables support deduplication, history, and recovery; they are not independent competing balances.

| Record | Important fields |
|---|---|
| GameState | saveId, schemaVersion, minReaderVersion, economyVersion, revision, cashCents, peakNetWorthCents, lifetime totals |
| ClockState | simulationMs, lastWallCheckpointMs, lastMarketTick, active boost milliseconds remaining |
| TapState | walletLevel, totalAcceptedTaps, artwork milestone |
| Tax record | Neutral not-started state, or active/exempt ledger: day/return boundaries and rate, source receipts/losses/fractions, tax basis, returns/filings/saved audit outcomes, debt/recovery, lifetime totals, exemption transaction IDs and saved tax return-summary details |
| OwnedBusiness | definitionId, stage, units, priceLevel, Quality and Efficiency levels, staff by role, payoutPercent, treasuryCents, profit remainder, status (open or closed), purchase day, insurance policies, active incident, takeover offer and locks, listing (float, ticker, shares held), capitalizedSpendCents, and the flagship mechanic state (vending locations, mixes and stock; car wash packages, membership settings and members; delivery contracts, offers and the 10-day delivery record) |
| OwnedProperty | definitionId, four upgrade levels, rented, upgradeSpendCents |
| Position | instrumentId, quantityMicrounits, remainingBasisCents, realizedProfitCents |
| DividendAccrual | instrumentId, pending whole cents, fractional numerator; survives selling all units |
| MarketState | seed, regime, events, current priceMicros quotes, partially built candles |
| IncomeState | business and rent remainders, earned totals by source |
| ProgressState | unlocked tiers, tutorial progress, completed goals, pinned goal, watchlist |
| RewardState | ad grant ID, pending activation, active boost, processed reward references |
| AdScheduleState | foreground milliseconds since the last automatic full-screen ad, interstitial count and local day key, last rewarded view time, session count, last app open ad time |
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

The actual implementation must preserve this single-transaction guarantee across reads and writes. With expo-sqlite, use the transaction-scoped handle from withExclusiveTransactionAsync and parameterized queries. Every query inside the transaction uses that handle. While it holds the write lock, any other async write fails with "database is locked", so all writes, including backups, migrations, and history, go through the serialized command queue. Bind values cannot be BigInt: store money and quantities as base-ten strings in TEXT columns. Open the database with `PRAGMA journal_mode = WAL`. Its documented transaction scope avoids unrelated async queries joining a transaction [2].

Batch taps for at most 250 milliseconds to limit write load. Flush a batch before a wallet upgrade, trade, other financial action, lifecycle checkpoint, boost boundary, or any full-screen ad. Keep batches homogeneous by payout and boost state. UI may animate pending taps, but any provisional number must roll back on a failed commit and pending cash must not fund a purchase before it commits.

Store backup checkpoints after verified successful saves at a bounded cadence, including before migrations. Backups in the same database help with logical snapshot damage, not complete database or device loss. A corrupt latest snapshot may restore the latest valid backup with a visible recovery notice. A save whose minReaderVersion is above this build's reader must fail safely without overwriting the save. Never silently reset a damaged save. Local play does not promise reinstall or cross-device recovery.

Version 2 is the deep-business format. Its business records replace version 1's, so a version 1 save opens as a fresh game, as a pre-baseline save does: the document is kept as a diagnostic and its backups, history and activity are dropped. The owner chose this reset over a conversion because the game is pre-launch. `minReaderVersion` rises to 2.

Save format versions: the save records `schemaVersion` (the format it was written in) and `minReaderVersion` (the lowest save-format reader that can open it without misreading). Version 1 is the baseline format.

- Additive change, no version bump: a new field is declared with a neutral default (an empty list, `none`, "not started"), and a save without it loads with that default. Put it at the top level of the save (a feature's fields go in one new top-level object), because an older build preserves unknown fields only at the top level. Each such field gets a test that the baseline fixture loads with its default. Never default a value that carries money or progress (cash, quantities, cost basis, time): a save missing one is damaged.
- Breaking change, version bump: renaming or removing a field, changing a type or unit, or changing what a stored value means raises `schemaVersion` and adds an upgrade step and a fixture from the previous version. `minReaderVersion` rises with it when an older reader would misread the new format.
- An older build opens a newer save when its reader is at least the save's `minReaderVersion`, keeps the fields it doesn't know and writes them back unchanged, along with the save's versions. A build whose reader is older stops on the newer-save screen and leaves the save untouched.
- Validation stays strict on types and values: leniency covers only a missing additive field getting its default.
- A save from before the baseline (development schemas 1 to 7, which have no `minReaderVersion`) opens as a fresh game, not as damaged. Its document is kept as a diagnostic and its backups, history and activity are dropped.

Future cloud saves: version one ships no cloud code, but keeps the save portable so platform cloud saves (Game Center saved games, Google Play Games Saved Games) can be added later without a save-format rewrite. The validated GameState snapshot, with its saveId, schemaVersion, economyVersion and revision, is the unit a cloud save would upload, as one serialized blob. Keep it free of device-specific data such as absolute file paths or ad SDK state. Keep the save behind a repository interface so a cloud-sync adapter can sit beside SQLite. That later feature must decide conflict resolution between devices, how offline time is credited across devices, and how processed ad reward IDs merge, so a reward is never granted twice.

Keep save schema version and economy configuration version separate. On an economy update, settle the outstanding interval with the save's old configuration before switching to the new one. Bundle the old configurations required by supported saves or provide an explicit tested migration. Apply new rates prospectively and preserve recorded purchase spending, cost basis, ownership, and grants. A migration must never retroactively pay an upgraded rate for the entire absence.

## 15 Ad integration and failure behavior

Ads are the only monetization in version one. There are three placements: one opt-in rewarded placement (the Tap Boost button on Earn, showing the exact reward and duration) and two automatic full-screen placements described below. There are no banners. Use the platform-aware `TestIds` (rewarded, interstitial, and app open) during development, and register hashed test device IDs before initialization on physical devices [5]. Initialize the real SDK on every launch in this order: (1) gather consent with Google's User Messaging Platform (`AdsConsent.gatherConsent()`); (2) on iOS, show the App Tracking Transparency prompt through the UMP explainer configured in AdMob, with no separate tracking library; (3) set the request configuration, including test device IDs; (4) call `mobileAds().initialize()` only when `canRequestAds` is true; (5) load ads. If consent gathering fails, still try with the previous session's consent. Do not store the consent status yourself. Keep this concern inside the platform adapter. Production IDs and store declarations are owner-provided release configuration (see the release checklist in Section 19).

The ad adapter exposes availability, load, show, earned-reward, closed, and failed events, mapped from the SDK's loaded, earned-reward, closed, and error events. `show()` rejects when an ad is not loaded or is already showing; treat that as failed. Reload after each close. The application creates a unique presentation ID before showing an ad. Persist a reward grant only when the SDK emits its earned-reward event. Closing an ad alone grants nothing. Duplicate or reordered callbacks for the same presentation must resolve to a single reward.

Persist an earned grant as pending activation until the game is interactive again. Then activate one 60-second boost atomically. If the process dies after the reward is saved but before activation, activate the pending grant on the next launch. Do not replay the ad. If the SDK never reports a reward before a process kill, the local app cannot prove completion; log the case without fabricating a grant.

Disable starting an ad while another presentation, pending grant, or boost exists. If an ad is unavailable, fails, or the device is offline, display the status and keep ordinary tapping usable. Use a mock adapter with deterministic success, close-without-reward, duplicate reward, no-fill, and crash-recovery cases.

### Automatic ads

Automatic ads appear without the player choosing them. A pure AdScheduler with injected clocks decides eligibility; the platform adapter only loads and shows. All numbers below are content configuration, tuned with telemetry.

- Gate: no automatic ads until the tutorial is complete and the player has 5 minutes of cumulative foreground play.
- Natural-break interstitials: a foreground timer makes an interstitial eligible at most once every 3 minutes, with at most 12 per local day. An eligible interstitial shows only at the next natural break: leaving Earn for another tab, closing a confirmation or trade sheet, or completing a goal. It also requires at least 2.5 seconds since the last tap. A 1-second "Ad break" card that ignores input comes first. Interstitials never appear on Home mid-tap, on app launch or exit, or back to back.
- App open ads: warm resume only, from the third session, after at least 30 minutes away, at most once every 4 hours, never on cold start. On resume the order is offline settlement, then the app open ad, then the return summary.
- Suppression: no automatic full-screen ad during the tutorial, while a boost or pending grant exists, within 2 minutes after a rewarded view, without ad consent, or while offline.
- Backstop: configure AdMob server-side frequency caps slightly looser than the client rules (interstitial unit: 1 per 2.5 minutes, 15 per day).
- No rewarded interstitials: the Tap Boost is never offered automatically.

The local save is not an authoritative anti-cheat service. Do not add a backend merely to imply that client-side rewards or device time are tamper-proof. A future shared economy requires server-owned balances and validated grants as a separate project decision.

## 16 Interface and content standards

Use a clean financial dashboard style with a prominent illustrated tap card, readable asset cards, and simple charts. Start with a light theme, neutral surfaces, one primary accent, and semantic positive and negative colors. Represent gains and losses with text or symbols as well as color.

Use a consistent spacing scale, reusable typography, comfortable touch targets of at least 44 logical points, safe-area handling, and scrollable content. Test long company names, small phones, and enlarged text. Charts need text summaries; screen readers should not announce every animation or tap increment. Respect reduced motion and allow haptics and sound to be disabled.

Use compact amounts in summaries with exact amounts available in details and confirmations. Display cash and transaction totals to two decimal places. Quote prices and quantities use the needed precision up to six places. Use string-based formatting for values beyond Number safe integer precision. Show the units on every income rate.

Definitions are stable-ID data, separate from the save and screens. Include economyVersion, unlock thresholds, formulas or named formula versions, caps, fees, prices, rates, multipliers, and asset metadata in content configuration. Validate unique IDs, positive prices, legal tiers, required icons, referenced IDs, and level caps at startup and in tests. Never reuse a retired ID for a different asset. Show "All companies and coins are fictional" on the Markets screen and in About.

## 17 Balance validation and instrumentation

Build a small headless simulation script around the same domain functions. It must accept a seed, starting state, action policy, tap rate, and session schedule, then output cash, asset allocation, net worth, unlock times, and upgrade payback. Keep the seed tables editable without changing screen code.

Initial playtest targets are a first wallet upgrade within 45 to 60 seconds at approximately two taps per second, a first business within about 2 minutes when saving for it, the first $1,000,000 after about 3.5 hours of active play, and a meaningful choice between reinvesting and buying another asset in the first session. The planning simulation reached the first wallet upgrade in about 50 seconds, wallet level 10 in about 1.8 hours, $1,000,000 in about 3.4 hours, $10,000,000 in about 6.9 hours, and $1,000,000,000 in about 22 hours of active play; heavy Tap Boost use reached $1,000,000 about 35 to 40 percent sooner. If casual play with offline earnings feels too fast, lower the offline earnings rate before changing prices. These are hypotheses. Record actual results before changing values.

With deep businesses, the simulation also runs the price, staff, stage and payout choices and the flagship mechanics, with a manager policy (hire managers as soon as stage 2 allows and let them decide) and a hands-on policy. Report the stage reached per business, treasury balances, closures, incident losses, and the payout share that reaches the next business fastest. The first-business and $1,000,000 targets above still apply. Compare at least three policies: buying the cheapest next upgrade, choosing the shortest incremental payback, and saving for the next business. Include an ad-free run and sessions separated by capped offline intervals. Flag permanently dominant choices, unaffordable progression stalls, and profit from repeatedly buying and selling an unchanged asset. Tune configuration rather than adding unexplained cash grants.

Define a TelemetryPort with a no-op production default and a local development event sink. Events include tutorial_step, first_business, wallet_upgrade, business_upgrade, stage_upgraded, staff_hired, incident, business_closed, takeover, went_public, rental_started, trade_executed, offline_settled, ad_requested, ad_rewarded, boost_activated, ad_interstitial_shown, ad_interstitial_suppressed, ad_app_open_shown, ad_clicked, save_failed, and migration_completed. Include configuration version and relevant non-identifying game state. Aggregate taps. An external analytics provider is a later integration decision.

Tax-aware balance measurements for honest, evasive and exempt policies are recorded in [tax-balance-report.md](tax-balance-report.md), using the existing purchase/management/offline scenarios. Ordinary payback policy remains the same gross-profit heuristic for comparison. One seeded run is reproducible evidence, not a statistical proof of audit balance.

## 18 Acceptance criteria and critical tests

| ID | Scenario | Required outcome |
|---|---|---|
| AC01 | Fresh save | $0, level zero, no assets, Tier 1 available, tutorial starts |
| AC02 | Ten unboosted level-zero taps | Exactly $10 committed cash |
| AC03 | Wallet upgrade from level zero | Spend $100 once; payout becomes $1.50; next cost $145 |
| AC04 | Repeat a command ID | Same recorded result; no additional cash or ownership change |
| AC05 | Insufficient cash purchase | No partial spending, ownership, or upgrade |
| AC06 | Base Vending Machine runs one business day (10 minutes) at the default payout | Exactly $100 profit: $50 to cash and $50 to its treasury |
| AC07 | Base Vending Machine set to Premium price | Profit becomes $107.82 per business day, and details mark Premium as the best level |
| AC08 | Segmented passive accrual | Sixty one-second advances equal one sixty-second advance, including remainder |
| AC09 | Ten-hour absence with base vending | $4,800 profit over 48 business days ($2,400 cash, $2,400 treasury); excess interval discarded once |
| AC10 | Crash after offline commit | Return summary may reappear; money is not credited twice |
| AC11 | Tier threshold then wealth falls | Unlocked tier stays available |
| AC12 | City Studio renovation and sale | Values match the $2,000, $21,600, and $20,520 fixture |
| AC13 | Unrent or sell property | Income stops at the settled command time |
| AC14 | Trade and partial sale fixture | $7.78 realized profit and $60.15 remaining basis |
| AC15 | Buy maximum including fees | Total debit never exceeds cash |
| AC16 | Quote crosses a tick | Require a refreshed confirmation; no silent repricing |
| AC17 | Restart or change chart frequency | Same seed and simulated time produce the same prices |
| AC18 | Earn dividend then sell | Preserve accrued entitlement; newly purchased units receive no retroactive amount |
| AC19 | Reward callback delivered twice | Exactly one 60-second 5x boost |
| AC20 | Ad closes without earned callback | No boost; ordinary play remains available |
| AC21 | Background during boost | Remaining eligible boost time pauses and survives restart |
| AC22 | Upgrade at boost expiration | No mixed-rate tap batch or extra boosted tap |
| AC23 | Save corruption, or a save whose minReaderVersion is above this build's reader | Recover visibly or stop safely; preserve original data |
| AC24 | Very large money values | Exact arithmetic and formatting beyond Number safe integer range |
| AC25 | Baseline save fixture, and a fixture from the previous version after each breaking change | Preserve balances, assets, cost basis, time, and grant IDs; additive fields load with their defaults |
| AC26 | Airplane-mode journey | Taps, upgrades, rent, trades, settlement, and saves work; ads show unavailable |
| AC27 | Write failure during purchase | Entire transaction rolls back and UI shows a recoverable error |
| AC28 | Native application journey | Complete tap, business, rental, trade, return, and test-ad flows on the iOS Simulator and Android Emulator (agent-driven) and on the owner's iPhone (manual) |
| AC29 | Ten-cent coin moves by 100 basis points | Quote becomes $0.101; sub-cent moves are preserved |
| AC30 | Economy configuration changes while away | Settle old rates first; new rates apply only after migration |
| AC31 | Tapping continuously past the interstitial cooldown | No interstitial appears on Earn; it waits for the next natural break with 2.5 seconds of tap idle |
| AC32 | Tutorial, active boost, or pending grant | No automatic full-screen ad appears |
| AC33 | Cooldown and daily cap | No two interstitials within 3 minutes of foreground time; at most 12 per local day |
| AC34 | Full-screen ad closes on Android | No offline settlement, return summary, or app open ad results |
| AC35 | Tap Boost source | A boost starts only after the player presses the Tap Boost button and a reward is earned |
| AC36 | Loss larger than the treasury | The business closes at the exact moment the treasury reaches zero; cash is untouched; a deposit reopens it |
| AC37 | Same seed, days played live or settled offline | Identical incidents, weather, contract offers, takeover answers and balances |
| AC38 | Incident safety | None in a business's first 30 days; at most one active; a treasury loss never exceeds 20 percent of the treasury |
| AC39 | Listed business pays out | Cash receives payout x (100 - float) percent of settled profit; the rest stays in the treasury or goes to outside shareholders |
| AC40 | Takeover accepted | Offer paid from the treasury once; rival units and quality merge; the rival leaves the list; a repeated command ID merges nothing |
| AC41 | Delivery contract under capacity | Missed parcels pay the penalty; reputation falls; walk-in demand is served only from spare capacity |
| AC42 | Vending location out of stock | It serves no one until restocked; a Restocker restocks it at the next day boundary |
| AC43 | Manager hired | At each day boundary the price is the most profitable level; the manager never deposits, withdraws, accepts contracts or sells |
| AC44 | Version 1 save | Opens as a fresh game with the old document kept as a diagnostic |

Add invariant tests for nonnegative cash and quantities; no sell beyond holdings; identical results from segmented time advances; valid quote rounding; and conservation of cash changes against ledger entries. UI tests should cover consequential interactions rather than snapshot every screen.

Measure a maximum capped resume with all assets and chart histories on a representative physical device in a release build (the owner's iPhone now; a physical Android device before the Play release). Target settlement under one second and responsive foreground interaction. If simulation work blocks input, process it in bounded chunks behind a restoring-state screen and commit the final result atomically. Do not reduce economic accuracy to meet the target.

Additional tax acceptance: cents reconcile per source/day/return; same-day cost order and elapsed-time chunking agree; losses/basis survive transfers, partial/final sales, IPO and delisting; owner/outside distributions and Treasury count once; capped offline/live paths agree; filing/audit/recovery cannot repeat after replay/crash; failed saves publish nothing; neutral baseline and older-reader refusal hold; Profile/Taxes/confirmation/Return summary amounts are accessible; verified exemption/reset/restore/revocation is prospective and idempotent. Tax-aware balance evidence is required before final rate acceptance.

## 19 Implementation phases and completion gates

| Phase | Deliverable | Completion gate |
|---|---|---|
| 1 Foundation | Expo native builds, tabs, styles, validated content, money utilities | Both platforms start; dependency matrix and lockfile committed |
| 2 Economy and persistence | Pure commands, clocks, SQLite repository, receipts, migrations, recovery | AC01, AC04, AC05, AC08, AC23 through AC25, AC27, AC30 pass |
| 3 Tapping and businesses | Wallet upgrades, four tiers, business upgrades, managers, sales, goals | AC02, AC03, AC06, AC07, AC11 pass; first playable loop |
| 4 Property and offline | Rental upgrades, valuation, capped settlement, return summary | AC09, AC10, AC12, AC13 pass |
| 5 Markets and portfolio | Stocks, crypto, seeded prices, news, dividends, quotes, activity | AC14 through AC18 and AC29 pass; balance simulation runs |
| 6 Ads and native validation | Mock and native test ads, boost lifecycle, automatic-ad scheduling, accessibility, performance | AC19 through AC22, AC26, AC28, AC31 through AC35 pass; remaining criteria verified |
| 7 Deep businesses | Shared business core, treasury, staff and stages, risks and insurance, the Vending, Car Wash and Delivery mechanics, takeovers, going public, version 2 saves, balance pass, then the UI overhaul on top | AC06, AC07, AC09 and AC36 through AC44 pass; balance report rerun. Phase 6's native validation (#37) runs after this phase |

Each phase leaves a runnable app and updates the README. The final handoff includes source, setup instructions, exact dependency versions, seed content, migration policy, tests, a balance report with reproducible seeds, and a list of owner-supplied release configuration. Provide evidence for each completion gate and identify any platform checks the available environment could not execute.

Before public distribution, the owner supplies the final app identity, signing and store accounts, production ad IDs, and store-facing assets and disclosures. Owner release checklist:

- AdMob app IDs and production ad unit IDs for all three placements.
- The iOS tracking usage description (`userTrackingUsageDescription`) and the SKAdNetwork identifiers in the config plugin.
- Google Play Console: "App contains ads: Yes" and the Data safety form.
- A public privacy policy URL for both stores.
- A way for players to report an inappropriate ad (Apple guideline 2.5.18): Settings has "Report an ad"; the owner replaces its placeholder address (`ads@pocketmogul.example` in `src/features/settings/ReportAdSection.tsx`) with a monitored one.
- Google Play: a closed test with 12 testers for 14 days for a new personal account, and a physical Android device for the performance check. These do not block local gameplay or test-ad implementation. Do not label a mock integration as production complete.

## 20 Instructions for the implementing agent

Implement this specification phase by phase. Start by inspecting the target repository and its instructions. Preserve existing user work. If no project exists, scaffold a single Expo React Native application and record the selected dependency versions.

Treat confirmed requirements as fixed. Use the documented implementation defaults and balance values without asking about routine choices. Append necessary clarifications or changes to the decision log in Section 22. If a new owner instruction conflicts with this document, follow that instruction and update the affected requirements and tests together.

Build the domain and persistence before adding visual polish to the full asset catalog. Use one set of quote functions for previews and mutations. Keep money out of component state as an independent authority. Test failure and recovery paths with injected clocks, random seeds, ad events, and database errors.

Complete the first version before implementing deferred features. Report what runs, which acceptance criteria passed, what remains blocked by the environment or owner-supplied release configuration, and the next concrete action. Do not claim device testing, balanced progression, or production ad delivery unless it was actually verified.

## 21 Technical references

These primary documentation links support integration choices. Game formulas, seed values, and product rules above are proposed designs, not recovered competitor implementations. Documentation was checked on November 3, 2026; the implementing agent must verify compatibility again when pinning dependencies.

1. Expo development builds explains development builds and native integration.

2. Expo SQLite documents persistence and exclusive transaction scope.

3. Expo react native SVG reference documents the SVG package integration.

4. Expo Haptics documents platform feedback APIs.

5. React Native Google Mobile Ads (https://docs.page/invertase/react-native-google-mobile-ads) and its ad format documentation document the native adapter, test ads, and consent initialization sequence.

6. Expo testing with Jest documents jest-expo and React Native test setup.

7. Expo Router documents file-based routing and project setup.

## 22 Decision log

Owner decisions that changed this specification. Each entry links the planning ticket that holds the detail. Planning map: https://github.com/chrisgocode/pocket-mogul/issues/1

- 2026-11-03, [Decide the offline cap and ad boost design](https://github.com/chrisgocode/pocket-mogul/issues/9): 8-hour cap kept; the Tap Boost is 5x tap earnings for 60 seconds, button-only, no stacking; no double-offline ad. (Sections 1, 4, 12, 18.)
- 2026-11-03, [Decide the naming approach for fictional stocks and coins](https://github.com/chrisgocode/pocket-mogul/issues/8): six renames, BRK to BRIK, the naming rule, and the fictional-companies notice. (Sections 6, 7, 16.)
- 2026-11-03, [Decide when automatic ads appear](https://github.com/chrisgocode/pocket-mogul/issues/13): natural-break interstitials, banners off Home, warm-resume app open ads, suppression rules. (Sections 1, 3, 10, 14, 15, 17, 18, 19.)
- 2026-11-03, [Decide the iOS and Android build-and-test path](https://github.com/chrisgocode/pocket-mogul/issues/7): agent-driven simulator journeys on the owner's MacBook plus manual iPhone checks. (Sections 2, 18, 19.)
- 2026-11-03, [Expand the business catalog into the hundreds of millions](https://github.com/chrisgocode/pocket-mogul/issues/16): twelve businesses, three per tier; Hotel Group moves to Tier 3. (Sections 1, 5.)
- 2026-11-03, [Expand the stock list with blue chips and penny stocks](https://github.com/chrisgocode/pocket-mogul/issues/17): twenty-four stocks with a volatility class; two high-end properties. (Sections 1, 6, 8, 11.)
- 2026-11-03, [Set progression targets and rebalance the economy](https://github.com/chrisgocode/pocket-mogul/issues/15): wallet upgrades start at $100 and grow by 1.45 per level; pacing targets updated. (Sections 4, 12, 17, 18.)
- 2026-11-03, [Approve the stack, ad-consent and store-disclosure spec changes](https://github.com/chrisgocode/pocket-mogul/issues/11): Expo SDK 58, JavaScript tabs, no Expo Go, ad startup order with ATT through UMP, SQLite and BigInt rules, Jest 30, and the owner release checklist. (Sections 2, 14, 15, 19, 21.)
- 2026-11-03, owner note (no ticket): version one keeps local on-device saves only. Cloud saves through Game Center and Google Play Games are planned after the MVP, and the save model stays portable for them. (Sections 1, 14.)
- 2026-11-03, [Review docs/spec.md for consistency before handoff](https://github.com/chrisgocode/pocket-mogul/issues/18): consistency checks pass; wealth goals extended to $100M and $1B. The goal list will be revisited after the MVP. (Sections 1, 9, 20.)
- 2026-11-03, owner note (no ticket): Bun is the package manager and script runner instead of npm. Jest stays the test runner, so tests run with `bun run test`, not `bun test`. (Sections 2, 19.)
- 2026-11-05, owner note (no ticket): logic and engine tests run under `bun test` (about 20x faster than Jest here, and it supports Node's built-in SQLite); screen tests stay on Jest 30 with jest-expo, because `bun test` can't load React Native. oxlint replaces ESLint, and oxfmt formats the code. (Sections 2, 18.)
- 2026-11-05, owner note (no ticket): AI-era quality gates. No direct `useEffect` (named hooks in `src/ui/effects` only) and no component state outside named hooks in `src/ui/state`, so React local state for UI-only values (§2) lives behind intention-revealing hooks. Size and complexity limits, the §13 module boundaries, no clock or randomness in domain code or tests, no magic numbers outside content, no snapshot tests, no comments, and knip for dead code. `expo-haptics` is removed until Phase 3 uses it. (Sections 2, 13, 16, 18.)
- 2026-11-06, [Seeded market simulation, read-only](https://github.com/chrisgocode/pocket-mogul/issues/28), implementation choices: the integer hash is 32-bit FNV-1a over the key text `seed:tick:scope:stream` (UTF-16 code units), finished with Murmur3's fmix32; a draw in [min, max] is `min + hash mod (max - min + 1)`. The market seed is the save's random saveId, stored on the market; saves from before markets start their market at their current simulation minute. Regime and event for a tick are pure functions of the seed and the 30-tick window, so the snapshot stores only quotes and partial hourly candles. An event starts at its window's first tick. Anchor pull is `trunc(5 × (initial − current) / initial)` basis points, clamped to ±25. Event scope chances (50/25/25) are content (`eventChancePercent`). An hourly candle opens at the previous hour's close and closes at tick 60h + 59, so period changes count every move; history trims by tick and hour index. (Sections 11, 14.)
- 2026-11-05, owner note (no ticket): no implicit state machines. A project lint rule rejects a closure with two or more `let` variables that its inner functions reassign, a type with two or more `boolean` fields, and a hook with two or more boolean `useState` calls. State that changes together is one value typed as a discriminated union. No published oxlint or ESLint plugin covered this, so the rule lives in `lint-rules/`. (Sections 13, 16.)
- 2026-11-06, [Stock trading](https://github.com/chrisgocode/pocket-mogul/issues/29), implementation choices: trading opens permanently with the first business purchase (`tradingUnlocked` on the save). Save schema 3 adds `tradingUnlocked`, `positions` and `watchlist`; schema 1 and 2 saves migrate with trading open if they own a business, and no positions or watchlist, so selling every business doesn't close the markets. New errors: TRADING_LOCKED and BELOW_MINIMUM (a buy, or a partial sell, under $1 of notional; only a full-position sell may go below it). The domain already settles coin trades at the crypto fee; the quote sheet is on stocks only until the crypto ticket. A dollar amount converts to shares at the price shown when it is typed: the most shares whose cash change stays within it, total debit including the fee for a buy, net proceeds after the fee for a sell. The order is that share count from then on, so a stale quote keeps it. Buy presets spend 25, 50 or 100 percent of committed cash, fee included; sell presets sell that share of the holding, floored to the microunit. A quote carries its market tick, and ExecuteTrade with an older tick is refused with STALE_QUOTE; the sheet then checkpoints so the new price shows, and keeps the entered quantity. A position stays on the save at zero quantity so its realized result survives. Average cost is remaining basis divided by quantity, floored to the microdollar. The quote time reads as market time, `Day 1, 00:42`, counted from the save's first market minute. (Sections 6, 12, 13.)
- 2026-11-07, [Crypto market](https://github.com/chrisgocode/pocket-mogul/issues/31), implementation choices: coins reuse the stock quote sheet, position card and watchlist, and the sheet counts in coins instead of shares (the entry mode is now `quantity` or `dollars`). The market keeps drawing coin shocks and coin events on crypto's own scope keys, and a golden fixture at seed `golden`, tick 120, pins stock and coin prices; a test proves that the stock path is the same whichever coins are listed. A market needs at least one listed asset to draw its events, which content validation already guarantees. The engine error for INSUFFICIENT_HOLDING no longer says shares. (Sections 7, 11.)
- 2026-11-07, [Portfolio, goals and activity history](https://github.com/chrisgocode/pocket-mogul/issues/32), implementation choices: goals are checked against the committed state after every command, including checkpoints and offline settlement, so a goal completes at the commit that first meets it and stays complete. A first-action goal reads the state: a wallet level above zero, any owned business, any rented property, a stock or a coin position above zero quantity, or any dividend paid. Each completed goal records its simulation time; goals pay no cash. "Pin one purchase goal" is read as pinning one goal not yet reached (PinGoal; a reached goal is refused with GOAL_COMPLETED, an unknown one with UNKNOWN_GOAL), and the pin clears when that goal is reached. A commit that completes goals raises one `goalsCompleted` game event (`game.subscribeEvents`) after the snapshot is published, never for a replayed command ID; Home shows a short "Goal reached" banner, and automatic ads (#35) can treat the event as a natural break. Save schema 5 adds `goals` and `activity`; schema 1 to 4 saves migrate with no goals and an empty history, and goals they already earned complete at the next commit. Activity entries live in a `ledger_entries` table, written in the command's transaction, numbered by a lifetime sequence and trimmed to the newest 2,000; `activity.lifetime` on the save keeps counting entries by kind, cash spent on purchases, upgrades and buys, and cash received from sales. Taps and business and rent accrual join one open earnings group on the save, which closes into a single entry at the next other activity or once it spans 10 simulation minutes. Dividend payouts are their own entries, and an offline settlement that earned anything is one entry by source. Rent Out and Unrent are recorded too. Entry times read as game time, `Day 1, 00:42`. (Sections 9, 14.)
- 2026-11-07, [Balance simulation and telemetry](https://github.com/chrisgocode/pocket-mogul/issues/36), implementation choices: `bun run balance [--seed <seed>] [--out <file>]` writes `docs/balance-report.md`. It drives the engine's own pure command step (`applyEnvelope`, the same function a commit runs, without SQLite) one second at a time, with that second's taps as one TapBatch, and stops at $1B peak net worth or 40 hours of active play. The seed is the save ID, so it fixes the market path, and the same seed writes the same report. Scenarios live in `src/application/balance/scenarios.ts`: two taps a second, the three policies, continuous play, and sessions of 30 minutes with 3, 3 and 12 hour gaps (the 12-hour gap is cut to 8 by the engine's cap). Every run is ad-free, since Tap Boost (#34) is not on `main` yet. A purchase's payback is its price over the extra income per minute it adds; a wallet upgrade's income counts taps at the run's rate, and a property purchase is bought and rented out at once. A choice is flagged dominant when one kind of purchase takes over half of a run's spending, and a stall is more than 30 minutes of active play without a purchase. The profit-loop check buys every business and property with no time passing, upgrades it one level at a time on every track (and hires the manager), and sells after each step; every sale point loses money. Telemetry: `GamePorts.telemetry` takes a `TelemetryPort`. With none given, nothing is recorded. Development builds keep the latest 500 events in a local in-memory sink. Events are read from each commit's activity entries and completed goals after the snapshot is published. Each carries `economyVersion`, `schemaVersion`, simulation time and non-identifying counts (no save ID). Taps never raise an event of their own: `taps_aggregated` reports the tap count and tap earnings of each closed earnings group, and every event carries the lifetime accepted-tap count. `first_business` fires with the first-business goal, `business_upgrade` also covers a manager hire (track `manager`), `offline_settled` fires only for an absence that earned something (the same rule as its activity entry), and `migration_completed` fires when a save opens from an older schema. Tutorial, ad and boost events are named for #33, #34 and #35 to send. (Sections 13, 17.)
- 2026-11-07, [Tap Boost rewarded ad](https://github.com/chrisgocode/pocket-mogul/issues/34), implementation choices: save schema 6 adds `reward` to the snapshot: the boost is one value, `none`, `pending` (with its grant ID) or `active` (grant ID and remaining milliseconds), so the remaining boost time lives with the reward rather than in ClockState; schema 1 to 5 saves migrate with no boost (schema 5 is the goals and activity save from #32). The grant ID is the presentation ID, and processed presentation IDs are kept for the save's lifetime; RecordAdReward also uses the receipt ID `reward-<presentation>`, so a repeated callback returns the recorded result. A reward for a new presentation while a boost or grant exists is refused with BOOST_ACTIVE. Boost time is a second foreground clock that every commit passes beside simulation time; SettleOffline never spends it. A tap batch carries `boosted`, decided at tap time from the boost clock, and the tap batcher starts a new batch when that changes; the engine pays 5x only when the batch says boosted and a boost was active before the command's time step, so a late batch can never earn an extra boosted tap. While a full-screen ad is showing, the app's background and foreground transitions are ignored (no checkpoint, offline settlement or return summary), which covers Android's resume on ad close. Nothing is saved when an ad starts, so a process kill before the earned-reward callback leaves nothing to log beyond the `ad_requested` telemetry event. Telemetry: `ad_requested` fires when the Tap Boost button asks the adapter to show an ad, `ad_rewarded` when the earned-reward callback's RecordAdReward commits a new grant (a duplicate or replayed callback commits nothing new, so it sends nothing), and `boost_activated` when ActivateBoost turns a pending grant into a boost; each carries the usual envelope and never the presentation ID, ad unit or device identifiers. The balance simulation advances boost time with simulation time and stays ad-free, so its report does not change. When no ad loads, Home says so and the button becomes Try again, which reloads. The real adapter uses Google's sample app IDs and `TestIds.REWARDED` until the owner supplies production IDs, and an empty hashed test-device list (simulators are test devices automatically). (Sections 4, 10, 14, 15.)
- 2026-11-07, [Tutorial, settings and accessibility](https://github.com/chrisgocode/pocket-mogul/issues/33), implementation choices: save schema 7 adds `tutorial` (`completedSteps`, `explanations: shown | skipped`) and `settings`. After every committed command the engine records each tutorial step whose action it can see in the save (a committed tap, wallet level above zero, a business owned), in any order, so a step never completes from a pending tap and survives a restart; a schema 1 to 6 save migrates with default settings, its boost kept, and the tutorial steps it already did. Telemetry: `tutorial_step` (details `step` and `number`) fires once per step, from the commit whose state first shows it, after the snapshot is published; a replayed command ID, a restart or a migration completes nothing new, so it sends nothing, and skipping sends nothing, because it completes no step. `SkipTutorial` only sets `explanations` to skipped: steps keep recording and unlock rules don't read the tutorial. `isTutorialFinished` (every step done, or skipped) is the automatic-ad gate's tutorial check, so skipping counts as finished. `UpdateSettings` takes a partial change; defaults are sound and haptics on, reduced motion following the system, compact numbers. Number formatting applies to the cash and income summaries on Home, Businesses and Properties; rows, details and confirmations stay exact. Reduced motion turns sheet slides and screen pushes into fades and press shrinks into a dim. The sound switch is saved, but version one plays no sounds yet. (Sections 3, 13, 14, 15, 16.)
- 2026-11-07, [Save format: add fields without a new schema version](https://github.com/chrisgocode/pocket-mogul/issues/57): before launch, save schemas 1 to 7 collapse into one baseline format, version 1, and their upgrade chain and fixtures are deleted. Every save records `minReaderVersion`. Adding a field with a neutral default no longer bumps the version; only a breaking change does (see Section 14). Implementation choices: a save without `minReaderVersion` is pre-baseline and opens as a fresh game; its document is kept as a `PRE_BASELINE_SAVE` diagnostic, and its backups, market history and activity are cleared, as a reset does. The save schema is loose at the top level, so unknown top-level fields round-trip; nested objects still drop unknown keys. A newer save whose `minReaderVersion` this build can read keeps its `schemaVersion` when re-saved. The format (reader version, schema, upgrade steps) is one `SaveFormat` value, which tests can swap to exercise a version bump. `economyVersion` is unchanged. (Sections 14, 18.)
- 2026-11-07, [Automatic ads](https://github.com/chrisgocode/pocket-mogul/issues/35), implementation choices: the AdScheduler is pure domain code (`src/domain/adSchedule.ts`) over AdScheduleState, which the save holds as the top-level `adSchedule` field (a new save gets a fresh schedule; older saves load with it, no version bump). Its foreground clock runs only while the app is in front and no automatic full-screen ad covers it, and every commit writes the latest schedule. A session is a cold launch or a warm resume after at least `appOpenMinAwayMs` (30 minutes) away, so the third session can be the second resume of one launch. The local day key comes from the injected clock (`Clock.localDayKey`). An interstitial is due once 3 foreground minutes have passed since the last automatic full-screen ad (an app open ad counts, so the two never come back to back); a due interstitial at a natural break is then suppressed, in this order, by the tutorial, the 5-minute warm-up, an active boost, a pending grant, a rewarded view within 2 minutes (wall time from its close), no loaded ad (no consent, offline or no fill; the load is retried), the daily cap, or a tap within 2.5 seconds; `ad_interstitial_suppressed` carries the trigger and one of those reasons, and no event is sent while it is not yet due. Natural breaks are leaving the Home tab (its blur), closing a confirmation or trade sheet (cancel or success; the reset-save sheet is not one), and a `goalsCompleted` game event; a break during a warm resume or after leaving the app is ignored, and leaving the app during the 1-second Ad break card cancels it. On a warm resume the app open ad shows inside the settlement commit after the save is written and before the summary is published, and the resume waits for it to close. While an interstitial or app open ad shows, background and foreground transitions are ignored, as for the rewarded ad (AC34). Banners are gated like full-screen ads (tutorial and warm-up) and sit in a strip below each of the four tabs' stacks, above the tab bar and outside the scroll content and sheets, so they never cover buy buttons; the native banner is `LARGE_ANCHORED_ADAPTIVE_BANNER` (the plain anchored size is deprecated) and loads lazily so screen tests never touch the SDK. Telemetry: `ad_interstitial_shown` (trigger), `ad_interstitial_suppressed` (trigger, reason), `ad_app_open_shown` (time away), `ad_banner_loaded` (screen) and `ad_clicked` (placement), with the usual envelope and no save or ad identifiers. Settings has "Report an ad", which opens an email to a placeholder address (`ads@pocketmogul.example`) that the owner replaces before release. Ad units are Google's test IDs. (Sections 10, 14, 15, 17.)
- 2026-11-07, owner decision, follows [Automatic ads](https://github.com/chrisgocode/pocket-mogul/issues/35) ([#60](https://github.com/chrisgocode/pocket-mogul/pull/60)): remove the anchored adaptive banners from Businesses, Markets, Properties and Portfolio. They earn little and take up a lot of screen space, so the four tabs get their full content height back. The full-screen placements stay as they are: natural-break interstitials, warm-resume app open ads and the Tap Boost rewarded ad. The `ad_banner_loaded` event goes; `ad_clicked` stays for the full-screen placements. The saved `adSchedule` held no banner-only data (the tutorial and warm-up gate is shared with full-screen ads), so the save format does not change. (Sections 1, 2, 15, 17, 19.)
- 2026-11-07, [Spec: deep businesses (MOGUL-level)](https://github.com/chrisgocode/pocket-mogul/issues/71): each business becomes a small management game on one shared core, replacing the Capacity, Quality and Efficiency tracks, the one-time manager and the milestone bonus. Owner decisions: depth on the level of MOGUL: Business Empire (studied with its developer's permission; no mechanics, names, text or art copied); shared systems are a treasury per business with a payout setting, staff and five growth stages, risks and insurance, takeovers and going public (no board of directors); a business day is 10 simulation minutes; a business whose treasury runs dry closes until the player deposits; existing saves reset (version 2); flagships Vending Machine, Car Wash and Delivery Company ship first, the other nine later; deep businesses are the new v1, so Phase 6's native validation (#37) waits for Phase 7. Earlier the same day, from the UI overhaul (#63): buys and upgrades complete on one tap while sales, takeovers, listing and property purchases confirm; Home and Portfolio become Earn and Wealth; properties keep a separate Rent Out step. Each flagship mechanic unlocks at stage 2 so the first business stays simple. (Sections 1, 3, 5, 9, 10, 11, 12, 13, 14, 17, 18, 19.)
- 2026-11-07, [Deep businesses 1: shared core and treasury](https://github.com/chrisgocode/pocket-mogul/issues/73), implementation choices: the shared core lives in `src/domain/business` (definitions, day rates, treasury settlement, commands), and content derives each business's core figures from its catalog row (`src/content/businessCore.ts`); validation rejects a row whose capacity, base demand or cost per customer would not come out whole. Every business stays at stage 1 (Startup, 3 units) until stages ship (#74), and no staff, insurance or mechanic exists yet, so their factors are left out of the formulas. Nothing changes at a day boundary in this ticket, so time is not yet split at boundaries; a business records its purchase day, and the details show days owned. Settlement keeps two remainders on the business record: the profit remainder (milliseconds × cents over `dayMs`) and a payout remainder in hundredths of a cent, so the payout split of many short advances adds up to the split of one long one (AC08). A loss closes the business at `start + ceil((treasury × dayMs + profitRemainder) / −profitPerDay)`, which is the §12 formula when the remainder is zero and gives the same moment however time is split; at closure the treasury and profit remainder are zero. A sale drops the business's sub-cent remainders with it. A deposit reopens a closed business; settings (price, payout) can change while it is closed. New errors: INSUFFICIENT_TREASURY, BUSINESS_CLOSED and AT_CAP; HireManager is gone until staff ship (#74), and a payout off the 10% steps is refused with INVALID_QUANTITY. Income per minute for businesses (top bar, Wealth) is the payout share of profit, the part that reaches cash. Activity gets `improvement` (units, Quality, Efficiency, with the treasury change), `treasury` (deposit or withdrawal) and `closure` (with the closure time) entries, and telemetry sends `business_upgrade` for improvements and `business_closed` for closures. The return summary and its offline activity entry list businesses that closed while away, and a summary shows for a closure even when nothing was earned. Saves move to version 2 (`minReaderVersion` 2): `SaveFormat.freshStartBelowVersion` makes a version 1 save open as a fresh game, its document kept as a `RETIRED_FORMAT_SAVE` diagnostic (fixture `src/application/fixtures/save-v1.json`). `economyVersion` stays 1: no save that survives the reset holds the old economy. The balance simulation funds a business improvement by depositing the treasury's shortfall from cash and counts its benefit as profit per minute; tuning waits for #81. Screens stay basic until #82: price and payout are one-tap choices, Deposit puts half the player's cash into the treasury in one tap, and units, upgrades, Withdraw all and Sell confirm on the sheet. (Sections 5, 12, 13, 14.)
- 2026-11-07, [Deep businesses 2: staff and growth stages](https://github.com/chrisgocode/pocket-mogul/issues/74), implementation choices: content holds the five stages (unit cap, staff caps, upgrade price multiple and days owned to reach each) and the staff rules; the manager's cap is 0 at Startup and 1 from Local, and validation rejects caps or prices that fall from one stage to the next. Staff live on the business record in the domain (`staff` by role), but the save holds them in a new top-level `staffing` record keyed by business ID (a save without it has no staff hired; no version bump), because an older build keeps unknown fields only at the top level. Business settlement now splits time at day boundaries, and at each boundary that time actually reaches, a hired manager of an open business sets the most profitable price level; a zero-length advance on a boundary decides nothing, so a price set at that moment stays. The manager's bonus is `floor(gross × 10 / 100)` on positive gross profit, which is the §12 `× 11000 / 10000`. Signing fees are operating spending: they leave the treasury but not carrying value, while stage upgrades count in it like units. Commands carry the headcount or stage they were quoted at (`fromCount`, `fromStage`) and a mismatch is STALE_QUOTE. New errors: STAGE_LOCKED (a manager before Local) and STAGE_NOT_READY (units or days owned short); a stage upgrade at Global is MAX_LEVEL, firing with no one in the role is INVALID_QUANTITY, and hires above the cap are AT_CAP. Hires, firings and stage upgrades are `improvement` activity entries (track `operations`, `sales`, `manager` or `stage`, level the new headcount or stage), so the saved activity counts don't change shape, and telemetry sends them as `business_upgrade`. Insurance renewal and flagship decisions join the manager's day with #75 and the flagship tickets. Screens stay basic until #82: the details add a Staff section and a stage row in Grow, and hires, firings and stage upgrades confirm on the sheet. (Sections 5, 12, 13, 14.)
- 2026-11-07, [Deep businesses 3: risks and insurance](https://github.com/chrisgocode/pocket-mogul/issues/75), implementation choices: content gives every business exactly one incident per category (validation rejects a missing or doubled category, chances that add up to 100% or more, a capacity loss of 100%, and a reused incident ID), following the flagship lists in 5.9 and inventing fictional ones for the other nine; v1 chances are 2.5% a day for equipment, 1.5% for liability and 2% for supply. An effect is a treasury loss of some days of catalog revenue, a capacity loss, or the `cost` effect named for Car Wash and Delivery: the cost per customer served rises by some percent for some days (the `supplyBps` factor in Section 12). Insurance halves a cost rise and its duration as it does a capacity loss, rounding down and lasting at least one day. Each day boundary draws one roll in [0, 9999] with `drawInt` on the key `seed:day:businessId:incident` (the market seed, which is the save ID) and walks the business's incidents in content order by their cumulative chance. At a boundary, in this order: a lasting incident ends when its last day arrives, a new one may strike, active policies renew or lapse, then the manager decides. A business is safe while `day − purchasedDay < 30`; a closed business draws nothing and its policies wait. Only capacity and cost incidents are active (they store their capacity and cost factors, so a later content change can't alter one already running); a treasury loss happens at once, is capped at `floor(treasury × 20 / 100)` and then insured at `loss − floor(loss × 80 / 100)`. Premiums are part of each day's profit, so they accrue like wages; a policy is `none`, `active` or `lapsed`. At each boundary the active policies, in category order, stay active while the treasury covers their premiums added up, and lapse otherwise; a manager renews lapsed ones the same way. SetInsurance (`category`, `insured`) starts or cancels a policy with nothing paid up front; below stage 2 it is STAGE_LOCKED. Incidents are `incident` activity entries (with the treasury change and whether the policy covered it), go to the return summary (an absence with only an incident still shows one), and telemetry sends them as `incident`. AC09's $4,800 for eight hours holds when no incident strikes, so the tests that check it use content without incidents. Saves stay version 2: insurance and the active incident live in a new top-level `risks` record keyed by business ID, a pending summary's incidents in `absenceIncidents`, and the lifetime count of incident entries in `incidentEntries`, so an older build keeps all three. The details add a Risks section with each incident, its chance and effect, the active incident and its days left, and one-tap Insure, Cancel and Renew buttons; the overview shows the day's insurance premiums. The balance report is not rerun until the balance pass (#81). (Sections 5, 9, 12, 13, 14.)
- 2026-11-07, [Deep businesses 4: Vending Machine mechanic](https://github.com/chrisgocode/pocket-mogul/issues/76), implementation choices: the Vending Machine's content row carries a `mechanic` (kind `vending`) with the five locations (slots, traffic in basis points, a taste split over snacks, drinks and healthy, a restock fee per machine), the four stock mixes as splits over the same three lines, `stockPerMachine` (300, three base days), the match range (6000 to 14000 basis points), the unlock stage (2) and card readers (stage 5, 150 × the purchase price, +20% demand); validation rejects splits that don't add up to 100, a poor match at or above a perfect one, stages that don't exist, card readers before the mechanic, and an Office too small for the top stage's unit cap. A mix's match is `poor + floor((perfect − poor) × overlap / 100)`, where the overlap is the sum over lines of the smaller of taste and mix; so the v1 best matches run from 124% (Gym) to 136% (School, Station) and a perfect 140% needs a mix equal to the taste. The mechanic enters Section 12 as `mechanicDemandBps` and `mechanicCapacityBps`: demand uses the machine-weighted average of traffic × match over locations that have stock (times 120% with card readers), and capacity the share of machines at locations that have stock, so an empty location takes its machines' demand and capacity out (AC42). Below stage 2 both are 10000, so the stage 1 figures in Section 12 hold. The business record holds the mechanic as `inactive` or `active` with each location's machines, mix and stock, and card readers `none` or `installed`; it turns active when the business reaches Local (every machine at the Office, Balanced, full stock), and a business already past Local turns active at its next day boundary. The Office holds every machine not placed elsewhere: a bought unit stands there. Moving a machine carries `floor(stock / machines)` of its location's stock. At each day boundary, before incidents, each stocked location sells `floor(served × its demand weight / total weight)` from the day's rate at the boundary; after incidents and insurance, operations staff (named Restocking in the details) restock every location below full, in location order, while the treasury covers each fee; then a manager sets each location's best mix before the best price. Restocking costs the location's fee × its machines whatever the shortfall and is operating spending; card readers are capital. New commands: MoveVendingMachine (`from`, `to`), SetVendingMix, RestockVending (a location or `all`), InstallCardReaders and DismissCoachMark; they reuse existing errors (STAGE_LOCKED below Local or before Global, AT_CAP for a full location, INVALID_QUANTITY for an empty source, the same location or nothing to restock, MAX_LEVEL for installed card readers, UPGRADE_UNAVAILABLE for a business without the mechanic), so saved outcomes need no new codes. None of them writes an activity entry: an `improvement` track for card readers would make older builds fail to read the activity log. Saves stay version 2: the mechanic lives in a new top-level `vending` record keyed by business ID, and dismissed coach marks in a top-level `seenCoachMarks` list (empty by default). The details add a Locations section after the treasury: a coach mark at first, Restock all, one card per location with its machines, traffic, stock, a mix choice that stars the best match, Restock, Place a machine here and Move one back to the Office, then card readers on the confirmation sheet. AC43's test now hires a Restocker too, since without one the Office runs dry after three days. The balance report is not rerun until the balance pass (#81). (Sections 5, 12, 13, 14.)
- 2026-11-08, [Deep businesses 5: Car Wash mechanic](https://github.com/chrisgocode/pocket-mogul/issues/77), implementation choices: the Car Wash's content row carries a `mechanic` (kind `car_wash`) with the unlock stage (2); Basic, Deluxe and Ultimate as a price multiplier, a bay time (both in basis points of a standard wash) and a share of walk-ins (Basic 8000/7500/60, Deluxe 12000/12000/30, Ultimate 17000/20000/10); weather chances for Sunny, Cloudy and Rain (4000, 3500, 2500) and walk-in multipliers for all four kinds; `forecastDays` (3); memberships (a $12 fee at Standard, 5000 basis points of a wash each per day, 20 joins per bay per day, a cap stepped by 20 up to 80 with a default of 20, and manager caps of 60 with rain in the forecast and 20 without); and detailing (stage 5, 150 × the purchase price, 40000/36000, 10 percent of walk-ins taken from Basic). Validation rejects package shares that don't add up to 100, detailing taking more than Basic has, weather chances that don't add up to 10000, caps off a step or above the maximum, stages that don't exist and detailing before the mechanic. Weather needs no save: each day draws one roll in [0, 9999] with `drawInt` on `seed:day:businessId:weather` and walks Sunny, Cloudy and Rain by cumulative chance; a dry day right after a Rain day is After rain, so the forecast is the same draw for the next three days, and live play and offline settlement agree (AC37). Packages enter Section 12 as share-weighted averages: `mechanicPriceBps` and `bayBps` over the offered packages, where a withdrawn package's share moves to the next offered package down. Ultimate earns more per car but less per bay minute than Basic, so withdrawing it pays on busy days (capacity-bound) and costs on rainy ones. Members reserve `memberBay = floor(members × 5000 / 10000)` standard washes before walk-ins, pay `members × floor(fee × priceBps[membershipLevel] / 10000)` as `mechanicRevenue`, and their washes cost `costPerServed` each, shown with customer costs. The member limit is `floor(floor(bays × cap / 100) × 10000 / 5000)`; joins per day are `floor(20 × U × (100 + 8Q) × demandBps[membershipLevel] / (100 × 10000))`. The business record holds the mechanic as `inactive` or `active` with today's weather, Deluxe and Ultimate each `offered` or `withdrawn`, members, the membership price level, the cap and detailing `none` or `installed`; it turns active on the stage upgrade to Local (weather drawn for that day) or, for a business already past Local, at its next boundary. At each day boundary, after incidents, insurance and restocking: the day's weather is drawn, a manager sets the cap (60 if Rain is in the next three days, else 20), then members join up to the limit, or the excess leave when the cap or capacity (an equipment failure, fewer staff) has fallen; a closed business only takes the weather. New commands: SetWashPackage (`washPackage` deluxe or ultimate, `offered`), SetMembershipPrice, SetMemberCap and InstallDetailing, plus a `car_wash` coach mark; they reuse existing errors (STAGE_LOCKED, UPGRADE_UNAVAILABLE, INVALID_QUANTITY for a cap off a step, MAX_LEVEL) and write no activity entry. Saves stay version 2: the mechanic lives in a new top-level `carWash` record keyed by business ID. The details add a Washes section after the treasury: a coach mark, today's weather and the next three days, the packages with Deluxe and Ultimate switches, members with a membership price choice and a member cap choice, then detailing on the confirmation sheet; the overview adds a Memberships line. The balance report is not rerun until the balance pass (#81). (Sections 5, 12, 13, 14.)
- 2026-11-08, [Deep businesses 6: Delivery Company mechanic](https://github.com/chrisgocode/pocket-mogul/issues/78), implementation choices: the Delivery Company's content row carries a `mechanic` (kind `delivery`) with the unlock stage (2), `vansPerDriver` (2), the route planner's capacity per level (5 percent), the offers board (3 offers, unanswered offers expire after 2 days, six fictional clients, a drawn share of the fleet's base parcels of 10 to 35 percent in steps of 50 parcels, a rate of 105 to 140 percent of the walk-in price, a penalty of 150 to 300 percent of the rate and a length of 3 to 8 days), reputation (a 10-day window, 3 stars to start, and one row per star with its minimum on-time share 0, 70, 85, 95 and 99 percent, an offer size of 60 to 140 percent and an offer rate of 85 to 115 percent), and the sorting hub (stage 5, 150 × the purchase price, +30 percent capacity). Validation rejects ranges that run backwards, contracts shorter than a day, doubled client IDs, anything but five star rows rising from 0, stages that don't exist, a sorting hub before the mechanic, and a stage whose operations cap × `vansPerDriver` falls short of its unit cap. Drivers keep the +20 percent capacity of any operations hire (BUS13) and also crew vans: each runs two, and vans without a driver are idle, so at Local a business that hired no drivers at Startup delivers nothing until it does (the locked card and the coach mark say so). The route planner is the Efficiency track renamed while the mechanic runs: its levels carry over, it adds 5 percent capacity per level and no longer lowers the cost per parcel. Contracts reuse the Car Wash's reserved-bay term: parcels due are reserved before walk-ins, served in acceptance order, delivered parcels cost the usual cost per customer, and missed ones pay their contract's penalty within the day's rate; walk-ins get only what is left. The manager accepts and declines nothing; its best price already counts contracts, so when contracts fill the vans it raises the walk-in price, which drops walk-in demand. Offers are drawn at each day boundary, after the manager, into empty board slots: each slot `n` draws its client, size, rate, penalty and length with `drawInt` on `seed:day:businessId:n:field:contract`, and its ID is `day-n`. An offer's size and rate scale with today's reputation, so offers follow the play history, which settlement replays the same way live and offline (AC37). An accepted contract runs from today until the boundary of today + its length; a declined offer leaves its slot empty until the next day. At each boundary, before incidents, the day just ended is recorded for reputation (parcels due and delivered at the day's rate at the boundary, kept for 10 days) and finished contracts end; a closed business records nothing, keeps its contracts' days running and pays no penalties. Reputation is the stars whose minimum the on-time share reaches; with no parcels due in the window it is the starting 3. The business record holds the mechanic as `inactive` or `active` with the offers, the contracts (in acceptance order), the day records and the sorting hub `none` or `installed`; it turns active on the stage upgrade to Local (with today's offers) or, for a business already past Local, at its next boundary. New commands: AcceptContract and DeclineContract (`offerId`) and InstallSortingHub, plus a `delivery` coach mark; they reuse existing errors (STAGE_LOCKED, UPGRADE_UNAVAILABLE, MAX_LEVEL, and STALE_QUOTE for an offer that has gone) and write no activity entry. Saves stay version 2: the mechanic lives in a new top-level `delivery` record keyed by business ID. The details add a Contracts section after the treasury: a coach mark (every flagship's coach mark now reads "Unlocked at the Local stage" above the mechanic's name, replacing "New at Local: …"), reputation in stars with the on-time share, vans with drivers and the parcels spare for walk-ins, the offers (Review opens a confirmation sheet with the terms and the profit change; Decline is one tap), active contracts with parcels delivered or missed, and the sorting hub on the confirmation sheet. Operations staff show as Driving staff (as Restocking at a Vending Machine) and Efficiency as Route planner once the mechanic runs, and the overview adds Contracts and Penalties lines. The stage-upgrade sheet now lists what the next stage unlocks for a flagship (its mechanic, or its stage 5 signature upgrade) and, at a Delivery Company growing to Local, how many vans will stop for want of drivers. The balance report is not rerun until the balance pass (#81). (Sections 5, 12, 13, 14.)
- 2026-11-08, [Deep businesses 7: takeovers](https://github.com/chrisgocode/pocket-mogul/issues/79), implementation choices: each business row in content lists three `rivals` (ID, fictional name, units and Quality, 4 to 26 units and Quality 2 to 11), and the business rules hold `takeovers` (from stage 3, acceptance from 80 to 140 percent of valuation, a 5-day lock, offer sizes of 90, 105, 120 and 140 percent) and `sectorMultipleDays` (10, one figure for every business until businesses carry sectors). Validation rejects a business without exactly three rivals, rival Quality above the max track level, a takeover stage that doesn't exist, acceptance that doesn't rise and offer sizes that don't rise; rival IDs share one catalog with the other content IDs and can be retired. A rival's valuation is the Section 12 formula applied to a stage 1 business of its type with its units and Quality, Standard price, no staff and no treasury. MakeTakeoverOffer (`rivalId`, `amountCents`) records one pending offer per business without touching the treasury; it fails with STAGE_LOCKED before Regional, UNKNOWN_ASSET for a rival that doesn't exist or has merged, the new OFFER_PENDING while any offer waits, the new OFFER_LOCKED during a lock, INVALID_QUANTITY for a zero offer, BUSINESS_CLOSED and INSUFFICIENT_TREASURY. At each day boundary, last (after new contract offers), locks that have ended are dropped and a pending offer is answered: if the business is closed or its treasury can no longer pay, the offer lapses with no lock; otherwise one roll in [0, 9999] with `drawInt` on `seed:day:businessId:takeover` accepts when it is below the chance. A yes pays the offer from the treasury (it counts in carrying value like units), adds the rival's units even above the stage cap (a Vending Machine places them at its home location), raises Quality to the higher of the two and adds the rival to the merged list; a no locks that rival until the boundary 5 days later. Answers are drawn during settlement, so live play and offline settlement agree (AC37), and a repeated command ID is answered from its receipt (AC40). Takeovers write no activity entry or return summary line: the Deals section shows the answer as a lock or a merged rival. Saves stay version 2: offers, locks and merged rivals live in a new top-level `takeovers` record keyed by business ID. The details add a Deals section after Risks: locked before Regional, then the business's own valuation, an offer size choice (90 to 140 percent, 140 by default) and each rival with its size, Quality, valuation, acceptance chance and profit change if merged; Make offer opens the confirmation sheet with the treasury change if accepted, the chance, and the units, Quality and profit after a merger. A pending offer, a waiting rival, a lock and a merged rival each show in place of the button. The balance report is not rerun until the balance pass (#81). (Sections 5, 12, 13, 14.)
- 2026-11-08, [Deep businesses 8: going public](https://github.com/chrisgocode/pocket-mogul/issues/80), implementation choices: GoPublic validates the stage, a float of 10/20/30/40 percent and an uppercase 3–5-letter ticker unique across stocks, coins and current business listings. Listing proceeds enter treasury; the retained stake becomes a position under `listing:<businessId>`. ExecuteTrade uses the stock fee, limits purchases to outstanding shares and updates the payout stake after each trade; buying every outside share removes the position and listing. Listed payouts floor the player's and outsiders' shares separately per settled segment, retaining rounding cents in treasury. Outside payouts accumulate in the top-level `shareholderPayouts` list by business ID, including after delisting or sale. The new top-level `listings` record defaults to empty; baseline saves load as private. The save schema remains 2, while the reader capability is 3: going public raises that save's minimum reader to 3 so previous builds cannot discard listing state or pay out the wrong stake. Private saves retain minimum reader 2. Historical listing quotes use the business valuation at each tick, including catch-up, independently of the fictional-stock event universe. Listed stakes count once in Wealth as market positions; a business sale pays the position's market value plus its proportional treasury and removes its position and watchlist entry. (Sections 5, 11, 12, 14.)

- 2026-11-08, #93, owner-approved manual taxes: TAX01–TAX12 supersede the ticket’s earlier withholding proposal. Economy 2 adds blended net-worth-based income rates, daily actual-profit accounting, six-hour manual returns, binary reporting and one-shot audits, personal installment debt, complete ownership/disposal basis, proportional listed withdrawals and single-counted listed exits. Tax state is additive under schema 2 and activation raises minimum reader capability to 4. Old intervals settle under economy 1; tax basis starts prospectively from activation exit value. Store checkout remains future; the permanent exemption entitlement contract and boundary are implemented now.
