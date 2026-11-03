# Research 05: Offline cap and rewarded-boost genre norms

Ticket: `issues/05-research-offline-cap-and-boost-norms.md`. Researched 2026-11-03.
Spec sections checked: 4 (TAP05), 9 (UX05), 10, 12 "Passive accrual", 15.

**Source trust key**
- **[P]** Primary: policy pages from Google or Apple, a developer's own blog or patch notes.
- **[W]** Community wiki (Fandom). These pages are maintained by players and are usually accurate on mechanics, but they can be out of date. Their in-game changelog transcriptions count as near-primary.
- **[U]** Unverified: third-party guides, or claims that sources contradict.

Fandom pages were read through the MediaWiki API (`api.php?action=parse`). The human-readable URLs are given below.

## Answer

- **Offline cap.** 8 hours sits in the normal range. Genre caps run from about 1–2 hours at the start (Egg, Inc. silos; Cookie Clicker desktop) to effectively uncapped (AdVenture Capitalist, Cookie Clicker mobile). Games that use a short cap let players raise it through progression, for example Egg, Inc. up to 30 hours and Cookie Clicker up to 7 days 8 hours. Nobody found ships a fixed cap that never moves. A fixed cap is fine for version one, but it is a lever the genre normally uses.
- **Rewarded boost.** The spec's boost is far smaller than the genre norm. The benchmark games give **2x income for 2–4 hours per ad**:
  - In AdVenture Capitalist and Idle Miner Tycoon, the time **stacks** up to roughly 24–31 hours.
  - In Egg, Inc. the timer **resets** to full instead of stacking.

  In all three, the boost applies to **all income, including while away**. The spec gives 2x on **taps only**, for **60 seconds of foreground time**, with no stacking. That is a deliberately small active-play reward. The spec's choice is defensible because tap-only income limits how much a boost can be worth, but players may see it as poor value. AdMob's own guidance says to find a "value middle ground".
- **Return-screen "double it".** This is standard in the genre. Both AdVenture Capitalist (since v5.2, 2017) and Idle Miner Tycoon offer an ad to double offline earnings. The spec has none: it uses one rewarded placement, and UX05's Continue button grants nothing. Adding this would be the most genre-typical change, and also the largest change to the economy.
- **AdMob policy.** The spec already meets AdMob's rewarded-ad rules: affirmative opt-in, a clear disclosure of the exact reward before the ad, the ability to dismiss, no penalty for declining, delivery of the promised reward, and an in-app, non-transferable, non-monetary reward. **No AdMob, Google Play, or Apple policy caps how often rewarded ads may be offered.** Frequency is a design choice and an AdMob console setting.

## Comparison table

| Game | Offline cap | How the cap is extended | Rewarded placements (documented) | Ad boost: multiplier / duration / stacking / limits |
|---|---|---|---|---|
| **AdVenture Capitalist** (Hyper Hippo / Kongregate), mobile | No cap documented. Managers "automatically start a profit cycle … even if the player is disconnected" [W1]. | Not applicable | (1) Income ad multiplier [W2]. (2) "Watch an ad to double your offline earnings" on return, plus an optional gold upsell, added in v5.2 (June 2017) [W3]. | **x2** (additive with other multipliers) for **4 h** per ad [W2]. **Stacks** "consecutively … up to 24 hours", per the v3.1.0 patch notes from March 2016 [W3]. Wiki says "max 5 views per day and per planet" [W2] (stub page) **[U: may be outdated]**. |
| **Idle Miner Tycoon** (Kolibri Games) | Idle Cash builds up while away, "usually at 10% of" the in-game rate [W4]. **No cap value found** in primary or wiki sources **[U]**. | Not applicable / unknown | (1) Per-mine income boost. (2) Double Idle Cash when re-entering a mine. (3) Collect Idle Cash for a continent or all continents (includes 2x). (4) Sell a manager at 100%. (5) Speed up a barrier (2 ads per 60 min). (6) Chest chance [W4]. | **x2** for **4 h** per ad. Duration **stacks** "up to 1 day 7 hours". The multiplier does not stack. Wiki says no other limit on boost ads. Research skills raise it to 3.14x [W4]. Kolibri: "Ad-boosts can be stacked for hours in advance", and they multiply with paid boosts (x2 × x10 = x20) [P1, 2019]. |
| **Egg, Inc.** (Auxbrain) | **1 h per silo** at base. Standard permit allows 2 silos at **half the online rate**. Pro permit allows 10 silos at full rate [W5]. | Buy silos (exponential Bocks cost). "Silo Capacity" epic research adds 6 min/level, up to +2 h per silo, for a **maximum of 30 h** [W5][W6]. | (1) Boost video ("video doubler"). (2) Random reward-video alerts every 2–5 min offering Bocks, Golden Eggs, boosts, tickets, tokens, or chicken boxes. The player can accept or decline [W7]. | **x2** for **2 h**, upgradeable to **8 h** through "Video Doubler Time" (+30 min/level, +360 min max) [W6][W7]. **Does not stack.** Watching again "will only reset the timer to its full amount" and can be greyed out while plenty of time remains [W7]. Players who turn ads off get a free 1 h doubler per tap [W7]. |
| **Cookie Clicker**, desktop/Steam (Orteil / DashNet) | Base after "Twin Gates of Transcendence": **5% CpS** offline, at full rate for **1 h**. After that the rate drops by 90% [W8]. | Angel upgrades raise the rate to 91% max. Demon upgrades double the window step by step (2 h, 4 h, …) up to **7 d 8 h** [W8]. | None (no ads on Steam) | Not applicable |
| **Cookie Clicker Mobile** (Android, official) | "Perfect idling from the start" with **no cap** [W9]. | Not applicable. Twin Gates is replaced by "Power Clicks", banked at 1 per 30 min offline [W9]. | A paid ad-free version exists [W9]. **No reliable source found on the ad reward mechanics [U].** | Unknown **[U]** |
| **Pocket Mogul spec** | **8 h** fixed (§10, §12) | None in version one | **One** placement on Home (§15). No return-screen double. UX05's Continue grants nothing. | **x2 tap income only**, for **60 s of eligible foreground time**. Pauses in background or while an ad is showing. **No stacking**, and a new ad can't start while a boost or pending grant exists (§4 TAP05, §15). |

Patterns across the genre:
1. The boost multiplier is almost always **2x**. The spec matches this.
2. Boost duration is measured in **hours of wall-clock time**, and the boost also applies while away. The spec's 60 seconds is about 1/240 of AdVenture Capitalist's 4 hours, and it counts only foreground time.
3. Stacking varies. Some games stack duration up to a cap (AdVenture Capitalist 24 h, Idle Miner Tycoon 31 h). Others reset the timer and block re-watching while plenty of time remains (Egg, Inc.). Both models exist, and the spec's "no stacking, blocked while active" is closest to Egg, Inc.
4. Successful titles use **several** placements. The most common one besides the boost is a return-screen "double offline earnings" offer.
5. Short offline caps are tied to a **progression lever** that extends them.

## AdMob and store policy constraints

**AdMob rewarded ads policy** [P2] (https://support.google.com/admob/answer/7313578):
- **Opt-in.** Rewarded ads (other than rewarded interstitials) must be shown only after the user "affirmatively and unambiguously opts in". Users must be able to skip or dismiss the ad. Declining must not interfere with normal use of the app. Text or icons must not mislead or pressure the user.
- **Disclosure.** Before each ad, the app must give "clear, accurate and conspicuous disclosure" of the required action and the reward. Icons are allowed if they are clearly understandable. If more than one ad is required, the number must be stated.
- **Reward type.** "Direct monetary items may not be offered as rewards under any circumstance" (cash, cryptocurrency, gift cards). Indirect rewards must be usable only inside the app and must be non-transferable. Pocket Mogul's fictional, non-transferable tap multiplier qualifies. Its in-game "crypto" is fictional, so it should never be paid out as anything with real-world value.
- **Random rewards.** The odds must be disclosed, and the chance of a reward must be above 0. This does not apply to the spec's fixed reward.
- **Delivery.** The app must deliver the promised reward once the action is completed. The publisher alone is responsible for rewards and must not imply that Google verifies them.
- **Frequency.** The policy page sets **no frequency limit**. Optional frequency caps are a console setting and apply to rewarded units at app or ad-unit level [P3] (https://support.google.com/admob/answer/6244508).

**AdMob guidance** (recommended, not binding):
- Rewarded ads suit transition points between activities [P4] (https://support.google.com/admob/answer/2936217).
- The playbook advises placement on high-traffic screens such as the home screen. It says rewards should be valuable enough to motivate viewing without undercutting purchases ("value middle ground"). Its benchmark is more than 50% of DAU engaging and an 80% completion rate [P5] (https://admob.google.com/home/resources/rewarded-ads-playbook/). This is a marketing page, so treat the benchmarks as indicative only.

**Google Play ads policy** [P6] (https://support.google.com/googleplay/android-developer/answer/9857753):
- The rules against unexpected or non-closable full-screen ads "do not apply to rewarded ads which are explicitly opted-in by users".
- Ads that interfere with normal use must be "easily dismissible without penalty".

**Apple App Store Review Guidelines** [P7] (https://developer.apple.com/app-store/review/guidelines/):
- 3.2.2(x): apps "may otherwise incentivize users to take specific actions within apps (such as … watching an ad)".
- 3.2.2(iii) prohibits artificially inflating ad impressions.
- 2.5.18 requires ads to suit the age rating, a way to report inappropriate ads, and no behavioral targeting of kids.
- 1.3 and 5.1.4 restrict third-party ads in the Kids Category. The owner should avoid that category.

**How the spec measures up:**
- §15 already requires that the ad be optional, show the exact reward and duration, grant only on the SDK earned-reward event, keep play working when ads are unavailable, and recover a pending grant after a crash. That covers opt-in, disclosure, and delivery.
- One gap is owner-side, not code: the app must offer a way to report inappropriate ads under Apple 2.5.18. AdMob creatives usually include an AdChoices or feedback control, so the owner should confirm this on device.

## How the spec defaults compare

| Spec default | Genre norm | Assessment |
|---|---|---|
| 8 h offline cap, fixed | Base caps of 1–2 h that grow to 30 h or days; or no cap | Generous for a starting cap, since it covers a night's sleep. The only thing missing is a way to extend it. Fine for version one. |
| Offline earnings at full rate | Egg, Inc. standard permit: 50%. Idle Miner Tycoon: about 10%. Cookie Clicker desktop: 5–91%. | **More generous** than most. Section 17's balance simulation should account for this. |
| 2x multiplier | 2x is universal | Matches. |
| 60 s, foreground only, taps only | 2–4 h of wall-clock time, all income, active while away | **Much smaller** reward per ad. It may get low opt-in, or it may push frequent re-watching (up to about one ad every 1.5 min of play). |
| No stacking; blocked while active | Egg, Inc. resets and blocks; Idle Miner Tycoon and AdVenture Capitalist stack to 24–31 h | Matches the Egg, Inc. model. Policy-neutral. |
| One placement (Home) | 2–7 placements; a return-screen double is near-universal | Below the norm. Simple and policy-safe. |
| No daily limit | AdVenture Capitalist: 5 per day per planet [U]. Others: none, or a soft block while active. | Policy-neutral. Consider a configurable cap to limit ad fatigue. |

## Options for the owner

1. **Keep the spec as written.** This is the lowest risk and fully compliant. Accept that the boost is a small active-play perk.
2. **Lengthen the boost through config only**, for example to 3–5 minutes of foreground tapping. Keep it tap-only and non-stacking. This raises perceived value and reduces how often players need to re-watch, with no change to the architecture. §16 already puts multipliers and durations in content config.
3. **Allow duration stacking up to a ceiling**, for example to 10 minutes, in the AdVenture Capitalist / Idle Miner Tycoon style. This needs changes to the BOOST_ACTIVE rule, the "disable while boost exists" rule, and AC19–22.
4. **Add a return-screen "Watch an ad to double this offline payout" offer.** This is the genre's most common second placement, but it is a substantive spec change:
   - UX05 would need a distinct, opt-in action next to Continue.
   - RewardState would need a second reward type.
   - The grant would have to be idempotent against the settled amount.
   - Section 17 would have to compare ad-watching and ad-free runs, because this effectively doubles passive income for players who watch ads.
5. **Make the offline cap extendable** through progression in a later version, for example an upgrade or tier unlock that raises 8 h toward 12–24 h (the Egg, Inc. silo / Cookie Clicker demon pattern). It fits naturally with the peak-net-worth unlocks.
6. **Add an optional daily view cap** in config and/or an AdMob console frequency cap. Neither is required by policy.

## Sources

- [P1] Kolibri Games blog, "Let's dig in" (Nov 11, 2019): https://kolibrigames.com/blog/lets-dig-in
- [P2] AdMob rewarded ads policy: https://support.google.com/admob/answer/7313578
- [P3] AdMob frequency caps: https://support.google.com/admob/answer/6244508
- [P4] AdMob implementation guidance: https://support.google.com/admob/answer/2936217
- [P5] AdMob Rewarded Ads Playbook (marketing material): https://admob.google.com/home/resources/rewarded-ads-playbook/
- [P6] Google Play Ads policy: https://support.google.com/googleplay/android-developer/answer/9857753
- [P7] Apple App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- [W1] AdVenture Capitalist wiki, Managers: https://adventure-capitalist.fandom.com/wiki/Managers
- [W2] AdVenture Capitalist wiki, Opt-In Boosts (stub): https://adventure-capitalist.fandom.com/wiki/Opt-In_Boosts
- [W3] AdVenture Capitalist wiki, Changelog (transcribed patch notes, v3.1.0 and v5.2): https://adventure-capitalist.fandom.com/wiki/Changelog
- [W4] Idle Miner Tycoon wiki, Ad Boosts: https://idleminertycoon.fandom.com/wiki/Ad_Boosts (also Boosts, Idle Cash)
- [W5] Egg, Inc. wiki, Grain Silos: https://egg-inc.fandom.com/wiki/Grain_Silos
- [W6] Egg, Inc. wiki, Epic Research: https://egg-inc.fandom.com/wiki/Research/Epic_Research
- [W7] Egg, Inc. wiki, Videos: https://egg-inc.fandom.com/wiki/Videos
- [W8] Cookie Clicker wiki, Offline Cookie Production: https://cookieclicker.fandom.com/wiki/Offline_Cookie_Production
- [W9] Cookie Clicker wiki, Mobile App: https://cookieclicker.fandom.com/wiki/Mobile_App (cites Orteil's FAQ: https://orteil42.tumblr.com/post/186867952730/)

**Not verified / gaps**
- Idle Miner Tycoon's offline cap value.
- Cookie Clicker Mobile's ad rewards.
- Whether AdVenture Capitalist's 5-per-day limit is current.
- The current in-game values for all four titles. The games are live-operated and change often, so check on a device if exact numbers matter.
- Kongregate's GDC 2015/2016 idle-game talks (https://gdcvault.com/play/1022065/) were not accessible (GDC Vault is members-only).
