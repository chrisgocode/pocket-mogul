# Pocket Mogul

A portrait mobile idle wealth game: the player taps for cash, then builds wealth through businesses, fictional markets and rental property.

## Ads

**Rewarded ad**:
An ad the player chooses to watch in exchange for a stated reward (in v1, a Tap Boost).
_Avoid_: Bonus ad, video ad

**Tap Boost**:
A temporary multiplier on tap earnings granted by a rewarded ad; it affects taps only and never stacks.
_Avoid_: Ad boost, double tap, power-up

**Automatic ad**:
Any ad shown without the player choosing it (interstitial, app open ad, banner).
_Avoid_: Random ad, forced ad, popup

**Natural break**:
A moment between player tasks (leaving Home, closing a confirmation sheet, completing a goal) where an automatic full-screen ad may appear.
_Avoid_: Pause, idle moment

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

## Time

**Simulation time**:
The clock that drives passive income; it advances only by eligible elapsed time, never by render frames.
_Avoid_: Game time, tick count

**Checkpoint**:
An AdvanceTime commit that saves the simulation time and wall time reached so far; the Game makes one at least every five seconds in the foreground and when the app leaves it.
_Avoid_: Autosave, sync

**Offline cap**:
The maximum away time credited to the economy on return; absence beyond it is discarded.
_Avoid_: Idle limit, AFK cap

## Economy

**Tier**:
One of four permanent unlock levels for businesses, opened by reaching a peak net worth threshold.
_Avoid_: Level, stage, era

**Income stream**:
One source of constant-rate passive income, such as one business, with its own sub-cent remainder that survives selling the asset.
_Avoid_: Income source, earner

**Upgrade track**:
One of a business's three independent levels, 0 to 20: Capacity (more revenue and costs), Quality (more revenue) or Efficiency (lower costs).
_Avoid_: Stat, skill, upgrade slot

**Milestone bonus**:
An additive 10% net profit bonus a business earns for every 15 total levels across its upgrade tracks.
_Avoid_: Level bonus, combo

**Manager**:
A one-time hire per business that adds 10% net profit; its price is an operating expense, not part of the carrying value.
_Avoid_: Staff, employee, automation

**Carrying value**:
What a business counts for in net worth: its purchase price plus upgrade spending, excluding the manager.
_Avoid_: Book value, asset value

**Sale quote**:
The cash a sale pays: 60% of a business's carrying value, after its income is settled.
_Avoid_: Resale value, refund

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
