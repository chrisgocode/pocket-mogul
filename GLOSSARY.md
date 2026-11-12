# Pocket Fortune

A portrait mobile idle wealth game: the player taps for cash, then builds wealth through businesses, fictional markets and rental property.

## Ads

**Rewarded ad**:
An ad the player chooses to watch in exchange for a stated reward (in v1, a Tap Boost).
_Avoid_: Bonus ad, video ad

**Tap Boost**:
A temporary multiplier on tap earnings granted by a rewarded ad; it affects taps only and never stacks.
_Avoid_: Ad boost, double tap, power-up

**Presentation**:
One showing of a full-screen ad, named by a unique ID the app creates before it calls show. Every reward callback for that showing resolves to the same presentation, so a repeated or late callback grants at most once.
_Avoid_: Impression, ad view

**Reward grant**:
A Tap Boost earned by a presentation's earned-reward callback and saved as pending until the game is interactive again, when it activates; a grant saved before a crash activates on the next launch without replaying the ad.
_Avoid_: Reward claim, entitlement

**AdPort**:
The application's interface to an ad SDK: availability, load, show, earned-reward, closed and failed events. The Google Mobile Ads adapter and the scripted test mock both implement it.
_Avoid_: Ad service, ad manager

**Automatic ad**:
Any ad shown without the player choosing it (interstitial or app open ad). Pocket Fortune shows no banners.
_Avoid_: Random ad, forced ad, popup

**Natural break**:
A moment between player tasks (leaving Home, closing a confirmation sheet, completing a goal) where an automatic full-screen ad may appear.
_Avoid_: Pause, idle moment

**Ad break card**:
The 1-second card that ignores input before an interstitial shows at a natural break.
_Avoid_: Ad warning, countdown

**AdScheduler**:
The pure rules that decide, from AdScheduleState and the moment, whether an automatic ad shows, waits or is suppressed (and why).
_Avoid_: Ad manager, ad timer

**Session**:
A cold launch, or a warm resume after at least 30 minutes away; app open ads start from the third.
_Avoid_: Visit, run

## Game engine

**Game**:
The headless engine that owns all game state: screens send it commands and render its committed snapshot.
_Avoid_: Store, model, manager

**Snapshot**:
The committed game state the Game publishes to screens after each saved command, plus the count of taps not yet saved.
_Avoid_: Cache, view model

**Tap batch**:
One TapBatch command carrying every tap from a window of at most 250 ms, paid at one rate and committed together.
_Avoid_: Tap event, click batch

**Confirmation sheet**:
The shared sheet that shows a purchase's cash change and resulting effect before the player commits it; its submit button is disabled while the command is pending.
_Avoid_: Dialog, modal, popup

**Command receipt**:
The saved result of a processed command ID; repeating that ID returns the receipt instead of applying the command again.
_Avoid_: Log entry, idempotency key

**Save backup**:
A verified copy of the save document kept in the same database: one is written at most once a minute after a successful commit and before every migration, and the two newest are kept. It guards against a damaged snapshot, not against losing the device.
_Avoid_: Snapshot copy, autosave

**Recovery notice**:
The "Save restored" sheet shown when the latest snapshot was damaged or missing and the Game opened the newest valid Save backup instead. A save that can't be restored, or that comes from a newer version, stops on an explanation screen and is never reset.
_Avoid_: Error popup, crash dialog

**Save migration**:
An explicit, tested step that upgrades a save document from one schema version to the next. Only a breaking change to the save format takes one; a new field with a neutral default doesn't. It never changes the economy; an economyVersion change settles at the old rates first instead.
_Avoid_: Upgrade, conversion

**Minimum reader version**:
The `minReaderVersion` a save records: the lowest save-format reader that can open it without misreading. A build whose reader is older stops on the newer-save screen instead of opening it.
_Avoid_: Compatibility version, min version

**Reset Save**:
The destructive Settings action that replaces the save with a fresh one and drops its backups, only after an explicit confirmation.
_Avoid_: New game, wipe

## Time

**Simulation time**:
The clock that drives passive income; it advances only by eligible elapsed time, never by render frames.
_Avoid_: Game time, tick count

**Boost time**:
The clock that runs down an active Tap Boost; it counts foreground play only and pauses in the background and while a full-screen ad covers the game.
_Avoid_: Boost timer (for the clock itself)

**Checkpoint**:
An AdvanceTime commit that saves the simulation time and wall time reached so far; the Game makes one at least every five seconds in the foreground and when the app leaves it.
_Avoid_: Autosave, sync

**Offline cap**:
The maximum away time credited to the economy on return; absence beyond it is discarded.
_Avoid_: Idle limit, AFK cap

**Offline settlement**:
The SettleOffline commit made on launch and on returning to the app: it credits the wall time since the last checkpoint, up to the Offline cap, and moves the checkpoint to now. A backward wall clock credits nothing and records a diagnostic.
_Avoid_: Catch-up, offline sync

**Return summary**:
The sheet that reports an Offline settlement: time away, credited time, earnings by source and whether the Offline cap was reached. It is saved with the settlement, so a crash shows it again without paying again, and Continue (AcknowledgeReturnSummary) only dismisses it. It appears only after at least a minute away that earned something or closed a business.
_Avoid_: Offline reward, idle bonus

## Economy

**Tier**:
One of four permanent unlock levels for businesses, opened by reaching a peak net worth threshold.
_Avoid_: Level, stage, era

**Income stream**:
One source of constant-rate passive income, such as one rental, with its own sub-cent remainder that survives selling the asset. A business settles its profit through its Treasury instead.
_Avoid_: Income source, earner

**Business day**:
Ten minutes of simulation time, the period every business rate is quoted in. Day boundaries fall on multiples of 600,000 ms and are shared by all businesses; the 8-hour Offline cap is 48 business days.
_Avoid_: Shift, round, turn

**Unit**:
One machine, cart, bay, van or the like that a business runs. Each adds full capacity and 60% of the base demand; the Stage caps how many a business has.
_Avoid_: Branch, location, copy

**Price level**:
One of five settings, Budget, Value, Standard, Premium and Luxury, that set a business's price per customer and the demand for it. The details mark the level with the highest profit.
_Avoid_: Price tier, markup

**Upgrade track**:
One of a business's two independent levels, 0 to 20, paid from its Treasury: Quality (more demand) or Efficiency (lower cost per customer served).
_Avoid_: Stat, skill, upgrade slot

**Stage**:
A business's growth level: Startup, Local, Regional, National and Global. It caps the Unit count and each staff role's headcount. A stage upgrade is paid from the Treasury and needs the Unit count at the current cap and enough business days owned.
_Avoid_: Tier (that is the catalog unlock), level

**Staff role**:
One of a business's three kinds of hire: operations staff (+20% capacity each), sales staff (+15% demand each) and one Manager. Each is paid a daily wage out of profit, and hiring pays a signing fee of three days' wages from the Treasury; firing is free.
_Avoid_: Worker, employee, crew

**Manager**:
The staff role, unlocked at stage 2 (Local), that adds 10% to positive profit and makes a business's routine decisions at each day boundary, offline too: setting the most profitable Price level, renewing Lapsed insurance once the Treasury can pay, and a flagship's own routine choices (at a Vending Machine, each Location's best Stock mix; at a Car Wash, the Member cap ahead of forecast Rain). At a Delivery Company it accepts and declines no Contracts, but its best price counts them, so it raises the walk-in price when Contracts fill the vans. A Manager never deposits, withdraws or sells.
_Avoid_: Automation, autopilot

**Incident**:
A setback drawn at a business day boundary from the save's seed: an equipment, liability or supply problem that costs the Treasury some days of catalog revenue, or cuts capacity or raises the cost per customer for some days. None strike in a business's first 30 days, a business has at most one lasting incident at a time, a Treasury loss is capped at 20% of the Treasury, and personal cash is never touched.
_Avoid_: Event (that is a market event), disaster, accident

**Insurance policy**:
Cover for one incident category, available from stage 2 (Local). It costs a daily premium of 2% of catalog revenue out of profit, covers 80% of a Treasury loss and halves a capacity loss or cost rise and its duration. It renews at each day boundary while the Treasury can pay the premium; otherwise it is Lapsed until the player or a Manager renews it.
_Avoid_: Cover plan, protection

**Flagship mechanic**:
A business's own small game on top of the shared core, unlocked at stage 2 (Local) with a Coach mark. At stage 1 the business shows only the shared core. The Vending Machine's is Locations and stock; the Car Wash's is Wash packages, Weather and Memberships; the Delivery Company's is Contracts, Reputation and Drivers; the Food Cart's is Spot, Crowd and Menu.
_Avoid_: Minigame, feature

**Coach mark**:
A one-time card that explains a mechanic the first time it appears, until the player dismisses it. The save remembers which ones the player has seen.
_Avoid_: Tooltip, tutorial step (that is the opening tutorial)

**Location**:
One of the five places a Vending Machine's machines stand: Office, Gym, School, Station and Hospital. Each has slots (how many machines fit), a traffic multiplier on demand, a taste split between snacks, drinks and healthy items, and a restock fee per machine. New machines stand at the Office, which holds every machine not placed elsewhere.
_Avoid_: Site, spot, branch

**Stock mix**:
What a Location's machines sell: Snacks, Drinks, Healthy or Balanced. Its match with the Location's taste multiplies demand there, from 60% for a poor match to 140% for a perfect one.
_Avoid_: Menu, product line

**Stock**:
The items a Location's machines hold, up to 300 per machine. Each business day sells stock in proportion to customers served, and a Location with no stock serves no one until it is restocked.
_Avoid_: Inventory, supplies

**Restocking**:
Filling a Location's machines to full, paid from the Treasury at the Location's fee per machine; an operating cost that doesn't count in Carrying value. The player restocks one Location or all of them in one tap; a Restocker restocks every Location at each day boundary, offline too, while the Treasury can pay.
_Avoid_: Refill, resupply

**Restocker**:
An operations hire at a Vending Machine (shown as Restocking staff). It adds 20% capacity like any operations hire and restocks every Location at each day boundary.
_Avoid_: Driver (that is the Delivery Company's), stocker

**Card readers**:
The Vending Machine's stage 5 (Global) signature upgrade, paid once from the Treasury, that adds 20% to demand at every Price level.
_Avoid_: Contactless, payment upgrade

**Wash package**:
What a Car Wash walk-in buys: Basic, Deluxe or Ultimate, plus Detailing once added. Each has a price multiplier, a bay time and a default share of walk-ins (60, 30 and 10 percent). The player can stop offering Deluxe or Ultimate; its share moves to the next package down. Capacity counts bay time, so bigger packages wash fewer cars a day.
_Avoid_: Tier, service level

**Weather**:
A Car Wash's daily conditions, drawn from the save's seed: Sunny, Cloudy or Rain, or After rain on the first dry day after Rain. It multiplies walk-in demand by 120, 100, 50 or 160 percent. The details show today's weather and the next three days.
_Avoid_: Season, forecast (that is the three-day view)

**Membership**:
A Car Wash customer who pays a daily fee whatever the Weather and uses a fixed share of bay time each day, taken before walk-ins. New members join each day in proportion to Quality and the membership Price level, up to the Member cap, and leave when the cap or capacity falls.
_Avoid_: Subscription, loyalty plan

**Member cap**:
The largest share of a Car Wash's bay time members may use, set in steps of 20 percent up to 80. A Manager raises it ahead of forecast Rain and lowers it in clear spells.
_Avoid_: Member limit (that is the member count the cap allows)

**Detailing**:
The Car Wash's stage 5 (Global) signature upgrade, paid once from the Treasury: a fourth Wash package at the top price that holds a bay the longest and takes 10 percent of walk-ins from Basic.
_Avoid_: Premium wash, valet

**Spot**:
Where a Food Cart is parked for the day: Park, Office row, Campus, Night market or Stadium. The whole business parks at one Spot, and moving is free. A Manager parks at the Spot with the biggest Crowd each morning.
_Avoid_: Location (that is where Vending Machines stand), pitch

**Crowd**:
How many people a Spot draws on a business day, drawn from the save's seed: Quiet, Steady or Busy. Each Spot multiplies the Food Cart's demand by its own figure for the day's Crowd. The details show today's and tomorrow's.
_Avoid_: Traffic (that is a Vending Location's fixed multiplier), footfall

**Menu item**:
An optional dish a Food Cart can offer: Combo meals, Street snacks or Grab-and-go wraps. Each multiplies customers, order size and serving speed, so a wide menu pays on a Quiet day and a short one when the line is full.
_Avoid_: Dish, package (that is a Car Wash's)

**Second window**:
The Food Cart's stage 5 (Global) signature upgrade, paid once from the Treasury: a second serving window that adds 30 percent capacity.
_Avoid_: Extra hatch

**Driver**:
An operations hire at a Delivery Company. It adds 20% capacity like any operations hire, and once the Flagship mechanic runs each Driver crews two vans: a van without a Driver delivers nothing.
_Avoid_: Courier, Restocker (that is the Vending Machine's)

**Contract offer**:
A Delivery Company client's offer on the offers board: parcels per day, a rate per parcel, a length in days and a penalty per missed parcel. Up to three are drawn from the save's seed each day, bigger and better paid at a higher Reputation, and an unanswered offer expires after 2 days. The player accepts or declines it; a Manager never does.
_Avoid_: Job, order, bid

**Contract**:
An accepted Contract offer. Its parcels are delivered before walk-ins, in acceptance order, every day until it ends; each parcel the vans can't deliver is missed and costs the contract's penalty.
_Avoid_: Deal, subscription

**Reputation**:
A Delivery Company's rating from one to five stars: the on-time share of Contract parcels over the last 10 days (99, 95, 85 and 70 percent reach five, four, three and two stars). It starts at three stars and sizes and prices new Contract offers.
_Avoid_: Rating, trust score

**Route planner**:
The Delivery Company's Efficiency track once its Flagship mechanic runs: each level adds 5% parcels per van instead of lowering the cost per parcel. Levels bought as Efficiency carry over.
_Avoid_: Logistics upgrade, navigation

**Sorting hub**:
The Delivery Company's stage 5 (Global) signature upgrade, paid once from the Treasury, that adds 30% capacity.
_Avoid_: Depot, warehouse

**Valuation**:
What a business is worth: 10 days of its profit (never less than zero) plus its Treasury. A Rival has no Treasury, so it is worth 10 days of the profit its units and Quality would earn at Standard price.
_Avoid_: Market cap, price (that is a Stock's)

**Rival**:
One of three fictional competitors per business type in content, each with a unit count and a Quality level. From stage 3 (Regional) the player can make a Takeover offer for it; a merged Rival never returns.
_Avoid_: Competitor, target

**Takeover offer**:
An amount the player offers for a Rival, from 90 to 140 percent of its Valuation. A business has one at a time, and nothing leaves the Treasury until the Rival answers at the next day boundary: it accepts with a chance that rises from none at 80 percent of Valuation to certain at 140. A yes pays the offer from the Treasury and merges the Rival (its units join, even above the stage cap, and Quality rises to the higher of the two); a no locks offers for that Rival for 5 days. An offer the Treasury can no longer pay lapses with no lock.
_Avoid_: Bid, acquisition

**Treasury**:
A business's own money. Its profit lands here, and its units, upgrades and other running spending are paid from here, never from the player's cash. It never goes below zero.
_Avoid_: Wallet, bank, balance

**Payout**:
The share of each settled profit, 0 to 100% in steps of 10 (50% at purchase), that moves from a business's Treasury to the player's cash.
_Avoid_: Dividend, withdrawal

**Closed business**:
A business whose Treasury ran out under a loss. It earns and pays nothing, keeps its units and levels, and reopens when the player deposits cash into its Treasury. Personal cash is never taken automatically.
_Avoid_: Bankrupt, paused, failed

**Carrying value**:
What a business counts for in net worth: its purchase price plus spending on units, upgrades, stage upgrades and signature upgrades, plus its Treasury. Wages, signing fees and Restocking are running costs and don't count.
_Avoid_: Book value, asset value

**Sale quote**:
The cash a sale pays: 60% of a business's spending on its purchase, units and upgrades, plus its whole Treasury, after its income is settled.
_Avoid_: Resale value, refund

**Rental status**:
Whether an owned property is Rented (earning rent minus upkeep) or Vacant (earning nothing and paying no upkeep); a bought property starts Vacant.
_Avoid_: Occupied, leased, active

**Property upgrade track**:
One of a property's four independent levels: Renovation and Furnishings (more rent), Building Systems (less upkeep), each 0 to 10, and Expansion (more rent and upkeep, 0 to 4, only on listings that allow it).
_Avoid_: Improvement, renovation (for the group)

**Estimated value**:
What a property counts for in net worth: its catalog price plus 80% of its upgrade spending; a sale pays 95% of it.
_Avoid_: Market value, appraisal

**Wallet upgrade**:
A purchase that permanently raises the cash earned per tap.
_Avoid_: Card upgrade, tap upgrade

## Markets

**Blue chip**:
A high-priced fictional stock that pays a dividend every simulation hour.
_Avoid_: Premium stock, dividend stock

**Penny stock**:
A fictional stock priced under $1 that swings more than other stocks and pays no dividend.
_Avoid_: Cheap stock, micro-cap

## Markets

**Market tick**:
One price move for every stock and coin, every 60,000 ms of Simulation time.
_Avoid_: Price update, refresh

**Market seed**:
The random value fixed when a save is created; with a tick, scope and stream it keys every random draw, so prices depend only on the seed and Simulation time.
_Avoid_: RNG state, random seed (as something that advances)

**Market history**:
Past minute observations and hourly candles kept for charts in their own table; it never decides a current price.
_Avoid_: Price feed, chart cache

**Trade quote**:
The cash a market order would move at the current Market tick: notional, fee and total cash change for an exact quantity. A quote from an older tick is stale and must be reviewed again; it never reprices silently.
_Avoid_: Estimate, preview price

**Position**:
What the player holds of one stock or coin: quantity, remaining cost basis (purchases plus buy fees, reduced proportionally on each sale) and realized result. It counts towards net worth at its sale notional before fees.
_Avoid_: Holding (for the record), lot

**Dividend accrual**:
What a stock has earned the player since its last payout: pending whole cents plus a fractional numerator over 1,000,000 quantity units times 3,600,000 ms. It accrues only while shares are held, pays into cash at each simulation hour, and survives selling every share.
_Avoid_: Dividend balance, yield

**Pending dividends**:
The whole cents accrued but not yet paid; they count towards net worth until the hour's payout moves them into cash.
_Avoid_: Unpaid dividends, owed dividends

**Watchlist**:
The stocks and coins the player has marked to see at the top of Markets; it changes nothing about prices or trades.
_Avoid_: Favorites, starred

**Goal**:
One of 13 milestones (six first actions and seven peak net worth levels) that earns a badge, never cash, and stays reached once reached. The player can pin one goal not yet reached to Home.
_Avoid_: Achievement, quest, reward

**Activity history**:
The player-visible record of purchases, sales, upgrades, rentals, trades, dividend payouts and offline settlements, kept to the newest 2,000 entries. Lifetime totals on the save keep counting past that bound.
_Avoid_: Ledger (for the screen), log, transactions

**Earnings group**:
One activity entry that sums taps and business and rent income between other activities, so the history never lists every tap or checkpoint.
_Avoid_: Tap entry, income tick

## Taxes

**Tax return**:
A statement of the player's taxable earnings and deductions for a filing period, which the player reports in full or reports as zero.
_Avoid_: Tax reward, daily payment

**Blended tax rate**:
The profit-tax percentage obtained by weighting portions of the player's net worth across wealth bands; it does not charge tax on the assets themselves.
_Avoid_: Wealth levy, bracket cliff

**Tax audit**:
The one-time check attached to a zero return that can assess the avoided tax and an additional fine.
_Avoid_: Random recurring penalty, late fee

**Tax debt**:
Assessed tax or audit fines still unpaid, recoverable through installments or voluntary payments without freezing existing earnings.
_Avoid_: Negative cash, bankruptcy

**Tax basis**:
The investment cost and recognized ownership adjustments still available against an asset's disposal proceeds, distinct from performance-reporting basis.
_Avoid_: Sale proceeds, gross profit

**Permanent tax exemption**:
A restorable purchase benefit that waives unpaid tax obligations and exempts future earnings across the player's saves on that store account.
_Avoid_: Subscription, ad removal, tax token
