# Research 11: Automatic (non-opt-in) ad options

Ticket: `issues/11-research-automatic-ad-options.md`. Researched 2026-11-03.
Spec sections checked: 3 (Home, tutorial), 4 (TAP05), 10, 14 (tap batching), 15, 17.
Owner decisions this builds on: the rewarded ad gives a **5x tap boost for 60 s of foreground time**, the offline cap is **8 h**, and the owner wants ads "running always … ads that randomly appear after a certain amount of time".

**Source trust key**
- **[P]** Primary: Google (AdMob Help, Google developer docs, Google Play policy), Apple, the Coalition for Better Ads, and the react-native-google-mobile-ads repo docs.
- **[P-other]** First-party rules from *other* ad platforms (Facebook Instant Games, CrazyGames). These are authoritative for their own platforms only. Here they serve as genre benchmarks, not as rules that bind AdMob.
- **[S]** Secondary or vendor write-up. Unverified.

## Answer

- **Every automatic format below is allowed if it is placed correctly. A literally random, time-based interstitial is not.** AdMob forbids interstitials that "suddenly appear when a user is focused on a task at hand" and says they "should only be implemented at logical breaks" [P1]. Google Play bans full-screen interstitials "that show unexpectedly, typically when the user has chosen to do something else" [P3]. A Pocket Mogul player is almost always tapping. A timer that fires an interstitial at an arbitrary moment is therefore the textbook violation, and it is also the main source of accidental clicks.
- **Compliant way to deliver what the owner asked for:** use a timer that makes an interstitial *eligible*, and show it only at the next **natural break**. Examples are leaving Home for another tab, closing a purchase or sale sheet, or completing a goal. Add a **tap-idle grace period** and a short **input lockout** before the ad. To the player this still feels like "an ad every few minutes", but it never covers the tap card mid-tap.
- **Google Play names idle games specifically.** For "puzzles, idle games or long level games" without natural breaks, "we expect you to exercise good judgment from a UX perspective" [P4]. This is a gray zone, not a safe harbour. Our own transition points give us real breaks, so we should use them.
- **"Running always":** an **anchored banner** is the only format that is always on screen. AdMob says not to put banners "on a game play screen where users are continuously interacting with the app", or next to "a custom app menu bar" [P5]. The banner should therefore stay **off Home (the tap screen)** and be separated from the tab bar and buy buttons on the other tabs.
- **App open ads** are allowed only when the app is opened or brought back to the foreground. Google recommends showing the first one only "after your users have used your app a few times" [P8]. They must be shown **before** the return summary, not on top of it.
- **Rewarded interstitials** suit this game well. They are automatic, but they need an intro screen with a clear reward (the 5x boost) and a visible "No thanks" option "with sufficient time for the user to opt out" [P6][P7].
- **Frequency is not capped by policy**, apart from these rules:
  - At most one interstitial per two user actions.
  - No interstitial right after another one.
  - No ads on app load or exit, or while the app is in the background [P1].
  - Full-screen ads must become closable within 15 s unless they are opt-in or non-interrupting [P3].

  Everything else is a design choice. AdMob server-side frequency caps (for example "2 impressions per 30 minutes") can act as a backstop for interstitial, app open, and rewarded units [P10].
- **Tutorial and first session:** no policy forbids ads there. However, Google's app open guidance, the CrazyGames and Facebook pacing rules, and retention reports all point the same way: no automatic ads until the tutorial is finished and the player has been playing for several minutes. Spec §3 says "Ads are optional during the tutorial", so automatic ads during the tutorial would contradict the current spec.

## Options table

| Format | Trigger | What the player sees | Policy constraints | Typical frequency | Risk to retention | Spec impact |
|---|---|---|---|---|---|---|
| **Timed interstitial** (fires when a timer expires, wherever the player is) | Foreground timer, e.g. every N min | A full-screen ad appears suddenly, often under a finger that is mid-tap | **Effectively disallowed as described.** "Don't surprise users"; no ads when the user is "focused on a task" [P1]. "Show unexpectedly … not allowed" [P3]. Better Ads lists "interruptive interstitials" as below standard for apps [P9]. Accidental clicks can be treated as invalid activity, which risks revenue clawback and account disablement [P11]. | Not applicable (do not ship) | High. It interrupts the core loop, and clicks become invalid traffic. | Would hit TAP05 pausing and §14 batching at random moments. Not recommended. |
| **Natural-break interstitial, timer-gated** (recommended "automatic" ad) | A timer or cooldown makes an ad *eligible*. It shows at the next break: Home → another tab, purchase or sale sheet closed, goal completed. Only after a tap-idle grace period. | A short "Ad break" card (about 1 s, taps blocked), then a full-screen ad with an SDK close button, then back where they were | Allowed: "logical breaks in between your app's content" [P1][P2]. No more than 1 per 2 user actions, none back to back [P1]. For tap-heavy apps, put "a delay … before the display of an interstitial ad" [P2]. Show it before a Continue/Next control, not after one [P2]. Must be closable within 15 s (SDK handles this) [P3]. | Casual benchmark: one every 60–120 s at the most aggressive. Facebook Instant Games enforces ≥30 s and recommends 60–90 s for casual games [P-other F1]. CrazyGames enforces at most 1 per 3 min, first ad after the tutorial or 3–5 min [P-other C1]. Idle games usually run lighter: 3–5 min [S]. | Medium. Lower with longer cooldowns, a post-tutorial start, and suppression after a rewarded view. | Needs a new `AdScheduler` (eligibility, cooldown, idle grace) in the adapter or app layer. §14: flush the tap batch before showing. TAP05: boost pauses while covered (already specified). §17: new telemetry. |
| **App open ad on resume** | App brought to foreground after an absence (warm start). Cold start only with a loading screen. | A full-screen ad over a loading/splash screen or over the app as it resumes, closable (close delay up to 2 s, or 5 s with high-engagement ads) [P8a] | Only "when the user opens or switches back to an app" [P8a]. Should appear "before the user can interact with the app's content" [P8a]. Not next to other full-screen ads [P8a]. Not allowed in Designed for Families apps [P8a]. Play: no video before the splash screen. With no splash screen, "wait for your app home screen to load before showing ads" [P4]. Google: first one only "after your users have used your app a few times" [P8]. Ads expire after 4 h [P8]. | Google: works best for apps opened "more than once every 4 hours" [P8a]. Typical caps are 1 per resume with a minimum absence and a few per day [S]. | Medium. Players returning to collect offline earnings run straight into an ad, which can feel like a toll on the return. | §10/UX05 ordering: compute offline settlement → app open ad → return summary. The library's `useAppOpenAdManager` auto-shows on warm foreground [P12a], so gating needs `adUnitId: null`. Android reports a fake "foreground" after any full-screen ad closes. The hook ignores it, but our own resume logic must too [P12a]. |
| **Persistent banner** (anchored adaptive) | Always on screen where mounted | A strip of ad about 50–90 dp tall at the top or bottom of the screen | Not "on a game play screen where users are continuously interacting", and not next to buttons or "a custom app menu bar" [P5]. Reserve fixed space and do not cover or shift content [P2b]. Do not place it so that it encourages accidental clicks [P11]. | Always on, refreshing automatically (AdMob console setting) | Low to medium. It costs screen space on small phones, and players see it as cheap. | §3 layout. Keep it off Home. Reserve space above the tab bar on other tabs, with a clear gap. §16: 44 pt targets and safe areas. Use `LARGE_ANCHORED_ADAPTIVE_BANNER` [P12b]. |
| **Rewarded interstitial** (automatic offer) | Shown at a natural break, like an interstitial, but with a reward | An intro screen ("Watch an ad for a 5x tap boost for 60 s?") with a visible "No thanks" and time to decide, then the ad; the reward is granted on the earned event | No opt-in needed, but must "present an introductory screen" with a "no"/"don't accept" option that is not "hidden, obstructed, or non-functional", "with sufficient time for the user to opt out" [P6][P7]. Declining must not "impede … normal usage" [P6]. Reward rules are the same as for rewarded ads [P6]. | It replaces some or all plain interstitials at the same breaks | Low to medium. The player gets value, so it feels fair. | Reuses §15 earned-reward → pending grant → activation. Must respect "no new ad while a boost or pending grant exists" (§15), so suppress it while the boost is active. |
| **Rewarded (current, opt-in)** | Player taps "Watch ad" on Home | As specified | Opt-in. The unexpected-ad rules do not apply [P3]. | Player-driven | Low | Already specified. The boost is now 5x. |

## Interstitials during rapid tapping: the accidental-click risk

**Why this is the central risk for this game**
- Spec §17 targets about 2 taps/s, and enthusiastic players tap much faster. A full-screen ad that appears while taps are in flight receives the next one or two touches.
- Some of those touches land on the creative's call to action, which counts as a click.
- Google's position:
  - Ads must not be implemented "in a way that … causes users to accidentally click ads" [P11].
  - "Google refunds revenue generated from invalid clicks", and "you may be at risk for account disablement" [P11].
  - Google does not tell publishers what triggered a flag [P11].
- AdMob's interstitial guidance says full-screen ads "can result in accidental clicks if placed at the wrong time" [P2c].
- The banner guidance names "a game play screen where users are continuously interacting" as a place to avoid [P5].

For a solo-owner app whose only monetization is AdMob, account disablement is the worst possible outcome. The damage is far larger than the revenue a mid-tap interstitial would earn.

**Mitigations, all required for any automatic full-screen ad:**
1. **Natural breaks only** [P1][P2][P4]. Pocket Mogul has no "levels", but it does have real transitions:
   - Leaving Home for another tab.
   - A confirmation or quote sheet closing after a committed purchase, sale, or trade.
   - A goal completed and its celebration dismissed.
   - The return summary, but only via an app open ad *before* the summary (see below).
   Never trigger an interstitial while Home is the focused tab and the tap card is active.
2. **Tap-idle grace period.** Show only if the last tap was at least **2–3 s** ago. If the player is still tapping, defer to the next break. Never queue "show on next idle moment" while the player is on Home.
3. **Input lockout before the ad.** AdMob specifically recommends that, for apps encouraging frequent taps, "a delay is inserted … before the display of an interstitial ad", such as a loading or progress screen [P2]. Use about 1 s of a non-interactive "Ad break" card. During that second, swallow touches (drop them; do not count them as taps).
4. **A countdown warning ("Ad in 3…") only together with items 1–3.** A countdown reduces surprise, which is the concern in Play policy [P3][P4]. But if taps keep landing while it counts down, the ad still appears under a finger. Pair it with the lockout, and never run a countdown over the active tap card. This is a design judgment; no Google source requires or blesses countdowns for plain interstitials. The rewarded-interstitial "countdown" in AdMob docs refers to the reward timer inside the ad [P7].
5. **Before, not after, a Continue-type button.** AdMob recommends that interstitials "show explicitly before any *Continue* or *Next level* buttons" to reduce accidental clicks [P2]. Do not show an ad as the direct result of a tap on "Continue" or "Collect".
6. **Two-action rule.** No more than one interstitial per two user actions, and never directly after another full-screen ad. This includes app open → interstitial, and rewarded → interstitial [P1][P8a].
7. **Foreground only.** "Ads should not be placed in applications that are running in the background" [P1]. Count cooldowns in foreground time, as the boost clock does.
8. **Never click live ads in testing.** Use test unit IDs (spec §15 already requires this). Clicking live ads "can [get your] account … flagged" [P11].

## Recommended configurations

All three assume the following:
- The rewarded 5x placement stays as it is.
- Automatic ads require `canRequestAds` (UMP consent), the device online, and an ad loaded.
- No automatic ads during the tutorial or before the gates listed below.
- No automatic full-screen ad while a boost or pending grant exists, or within 2 min of a rewarded view. Rewarded viewers earn an ad-free window, which also avoids pausing their boost.
- Interstitial rules for every configuration: natural breaks only, tap-idle grace of at least 2.5 s, a 1 s input-locked "Ad break" card, foreground-time cooldowns, and an AdMob server frequency cap set slightly looser than the client rule as a backstop [P10].
- All numbers are **starting hypotheses**. Put them in content configuration (§16) and tune them with §17 telemetry.

| | **A. Conservative** | **B. Balanced (suggested v1)** | **C. Aggressive** |
|---|---|---|---|
| First automatic ad | Tutorial complete **and** ≥10 min cumulative play | Tutorial complete **and** ≥5 min cumulative play | Tutorial complete **and** ≥3 min |
| Natural-break interstitial cooldown | 5 min foreground | 3 min foreground | 2 min foreground (the floor; not below 90 s) |
| Interstitial daily cap | 6 | 12 | 20 |
| Rewarded interstitial | None | Every 2nd eligible break offers the 5x boost instead of a plain interstitial (intro with "No thanks", 5 s to decide) | Every 2nd–3rd break |
| App open ad | None | Warm resume only, from the 3rd session, absence ≥30 min, max 1 per 4 h; never on cold start | Warm resume from the 2nd session, absence ≥5 min, max 1 per hour; cold start with loading screen from the 3rd session |
| Banner | None | Anchored adaptive on Businesses, Markets, Properties, Portfolio; **not Home**; clear gap from tab bar and buy buttons | Same, plus Goals/Settings screens. Still **not Home**. |
| AdMob server cap (interstitial unit) | 1 per 4 min, 8/day | 1 per 2.5 min, 15/day | 1 per 90 s, 25/day |
| Approx. automatic full-screen ads per 15-min session | ≤2 | 3–4 | 5–7 |
| Policy risk | Low | Low | Medium. Frequent breaks start to look like "interstitial ads repeatedly … distract[ing] users" (Play "Made for Ads") [P3]. |
| Retention risk | Low | Medium | High [S] |

What the owner gets in B: ads "running always" through banners on four of the five tabs, plus a full-screen ad roughly every 3 minutes of play at the next natural moment. The tap screen is never interrupted.

## Spec impact (by section)

- **§3 Home / tutorial.**
  - Add banner space to the non-Home tabs.
  - Change "Ads are optional during the tutorial" to: "No automatic ads until the tutorial is complete and the first-ad gate is met."
  - Header buttons (Goals, Settings) must stay clear of any top banner [P5].
- **§4 TAP05.** Already says boost time pauses "while a full-screen ad covers it". That covers interstitial, app open, and rewarded interstitial ads. Update the multiplier to 5x. Recommendation: suppress automatic full-screen ads while a boost is active, so the player never loses momentum.
- **§10 Time / offline.**
  - On Android, full-screen ads run in a separate `AdActivity`, and React Native reports a background/foreground transition when they close [P12a][P12c]. The inactivity flush and checkpoint will therefore fire around every full-screen ad. That is harmless, but a "resume" caused by an ad close must not run offline settlement, show the return summary, or trigger an app open ad.
  - Resume order: settle offline (cap 8 h) → app open ad if eligible → return summary (UX05).
  - Offline devices get no automatic ads. Gameplay is unchanged, as §1 and §15 already require.
- **§14 Tap batching.** Add "before presenting any full-screen ad" to the list of batch flush points. Touches during the input lockout are dropped, not batched.
- **§15 Ad integration.** Generalize the adapter from one rewarded placement to these placements: `rewarded_home`, `interstitial_break`, `rewarded_interstitial_break`, `app_open_resume`, `banner_tabs`. Add an `AdScheduler`, a pure, testable domain-free policy with injected clocks. It handles:
  - eligibility gates
  - foreground-time cooldowns
  - daily caps
  - tap-idle grace
  - suppression rules
  - the one-full-screen-at-a-time invariant

  The "disable starting an ad while another presentation, pending grant, or boost exists" rule extends to all full-screen formats. Consent order is unchanged: UMP → ATT → initialize → load (see research 02). The app open hook must be gated with `adUnitId: null` until consent is resolved and the eligibility gate passes [P12a].
- **§17 Telemetry and balance.**
  - Add the events `ad_shown{format,placement}`, `ad_suppressed{reason}`, `ad_clicked`, and `session_start/length`.
  - Track D1/D7 retention per configuration. Configurations A, B, and C are natural A/B arms.
  - The ad-free balance simulation run is unaffected, because automatic ads grant nothing except the rewarded interstitial's boost.
- **Store declarations.** The Play Data safety and "contains ads" forms and Apple 2.5.18 apply as they did before:
  - The SDK provides the ad label and close buttons [P13].
  - Avoid the Kids category and Designed for Families. Families would forbid app open ads [P8a][P13].

## Comparable-game frequency evidence

- **[P-other F1] Facebook Instant Games:**
  - 30 s minimum enforced.
  - Recommends 60–90 s for casual games and 90–120 s for mid-core games.
  - "Never interrupt active gameplay"; do not show ads at game start.
  - "If retention drops after increasing ad frequency, dial it back."
- **[P-other C1] CrazyGames:**
  - At most 1 midgame ad per 3 min, enforced.
  - First ad after the tutorial or 3–5 min of play.
  - "Keep ads out of active gameplay."
- **[S] Vendor blogs** (unverified figures):
  - Showing a new user an interstitial in the first 30 s is called a common mistake.
  - One report claims D1 retention rose 5–8% when the first ad was delayed to 60–90 s.
- Research 05 found that the benchmark idle games (AdVenture Capitalist, Idle Miner Tycoon, Egg, Inc.) rely mainly on **opt-in rewarded** placements. Egg, Inc. uses periodic *opt-in* reward offers every 2–5 min instead of forced interstitials. That is a strong signal that the genre's top titles avoid forced interstitials. No primary source was found on whether those titles show forced interstitials **[U]**.

## Sources

Primary:
- [P1] AdMob, Disallowed interstitial implementations: https://support.google.com/admob/answer/6201362
- [P2] AdMob, Recommended interstitial implementations: https://support.google.com/admob/answer/6201350
- [P2b] AdMob, Ad format / placement guidance: https://support.google.com/admob/answer/2936217
- [P2c] AdMob, Interstitial ad guidance: https://support.google.com/admob/answer/6066980
- [P3] Google Play Developer Policy, Ads (Disruptive Ads, Better Ads Experiences, Made for Ads): https://support.google.com/googleplay/android-developer/answer/9857753
- [P4] Google Play, Understanding Google Play's Better Ads Experiences policy (natural breaks, idle games, splash screens): https://support.google.com/googleplay/android-developer/answer/12271244
- [P5] AdMob, Banner ad guidance: https://support.google.com/admob/answer/6128877
- [P6] AdMob, Policies for ad units that offer rewards (rewarded interstitial intro screen): https://support.google.com/admob/answer/7313578
- [P7] AdMob, Overview of rewarded interstitial ad units: https://support.google.com/admob/answer/9884467
- [P8] Google Mobile Ads SDK (Android), App open ads, best practices: https://developers.google.com/admob/android/app-open
- [P8a] AdMob, App open ads overview: https://support.google.com/admob/answer/9341964
- [P9] Coalition for Better Ads, Standards (mobile app experiences: interruptive interstitials, video interstitials when opening an app): https://www.betterads.org/standards/
- [P10] AdMob, Frequency capping: https://support.google.com/admob/answer/6244508
- [P11] AdMob, How you can prevent invalid activity: https://support.google.com/admob/answer/3342099
- [P12a] react-native-google-mobile-ads, App open ads: https://github.com/invertase/react-native-google-mobile-ads/blob/main/docs/ad-formats/app-open.mdx
- [P12b] react-native-google-mobile-ads, Banner ads: https://github.com/invertase/react-native-google-mobile-ads/blob/main/docs/ad-formats/banner.mdx
- [P12c] react-native-google-mobile-ads, Interstitial ads (load and reload, Android `AdActivity` notes): https://github.com/invertase/react-native-google-mobile-ads/blob/main/docs/ad-formats/interstitial.mdx
  - Also: Rewarded interstitial: https://github.com/invertase/react-native-google-mobile-ads/blob/main/docs/ad-formats/rewarded-interstitial.mdx
- [P13] Apple App Store Review Guidelines 2.5.18, 3.2.2(iii), 1.3: https://developer.apple.com/app-store/review/guidelines/
  - 2.5.18: interstitials "must clearly indicate that they are an ad, must not manipulate or trick users into tapping into them, and must provide easily accessible and visible close/skip buttons"; apps must let users report inappropriate ads.

Other-platform first-party (benchmarks, not AdMob rules):
- [F1] Facebook Instant Games, Interstitial ads: https://developers.facebook.com/documentation/games/monetize/in-app-ads/interstitial-ads
- [C1] CrazyGames, Midgame ads pacing: https://docs.crazygames.com/resources/midgame-ads-pacing/

Secondary [S]:
- Mobile Marketing Magazine, Coalition for Better Ads launches standard for mobile apps (lists the four in-app experiences; enforcement no earlier than 2 March 2022): https://mobilemarketingmagazine.com/coalition-for-better-ads-launches-better-ads-standard-for-mobile-apps/
- RevenueFlex, Interstitial ad best practices for mobile games (first-ad timing and D1 claims): https://revenueflex.com/blog/interstitial-ad-best-practices-mobile-games/
- Airflux, Rethinking interstitial ads in casual games: https://airflux.ai/blog/rethinking-interstitial-ads

Notes:
- The betterads.org per-experience definition pages returned 404. Only the standards index page was verified.
- The Better Ads Standards formally target web and app *ad experiences*. Google Play's policy page [P3] is the binding implementation for Android apps.
