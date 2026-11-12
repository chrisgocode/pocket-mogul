# RevenueCat validation (#112)

This is a read-only feasibility build for #111. Checkout is disabled, including direct calls through Game. No commercial product is authorized. No save or economy format changes are needed.

## Current scope: iOS validation (owner decision, 2026-11-11)

The owner explicitly deferred Android support. Issue #112 now covers the iOS read-only validation slice. Google Play registration, physical Android account verification, product/credential setup, live Android metadata and outage probes, and eventual Play purchase acceptance are deferred to [#118](https://github.com/chrisgocode/pocket-mogul/issues/118). They do not block the current iOS milestone. Existing Android configuration, pins, fake coverage and historical compilation records remain available for resumption; none establish Google Play acceptance. Parent #111 retains the longer-term cross-platform integration work.

The iOS closure requirements are genuine offline startup and ordinary Offline settlement, controlled failed-refresh/cache behavior, disabled ordinary-build composition, and the documented lifecycle guarantees at their approved testing seams. The 2026-11-11 closeout record below completes this read-only slice across those seams. Deferring Android did not waive the iOS checks.

For ownership feasibility, #112 must document the concrete SDK fields, supported guarantees and limitations. A documented inability to satisfy the existing ownership contract is a valid feasibility result; #112 does not require adding an excluded backend/native extension or weakening that contract. Those limitations are retained in [#124](https://github.com/chrisgocode/pocket-mogul/issues/124), which blocks #113 until a separately approved resolution exists. No purchase, restore, refund or production acceptance is claimed by closing this read-only slice.

## Explicit configuration

Leave `EXPO_PUBLIC_BILLING_VALIDATION` unset in ordinary builds. The variable is JSON inlined by Expo, so changing it requires rebuilding the bundle/binary. It contains a public SDK key, never a RevenueCat secret key or store credential. Development mode alone never enables billing. An explicitly configured release-mode sandbox build uses the same gate.

Example shape (replace the public SDK key with the validation app's real public key):

```json
{
  "profile": "revenuecat-validation",
  "environment": "sandbox",
  "store": "apple",
  "appId": "com.chrisgocode.pocketfortune",
  "apiKey": "appl_REPLACE",
  "productId": "pm_tax_exemption",
  "entitlementId": "pm_tax_exemption"
}
```

Android uses `store: google` and its `goog_` public key. All fields are required; unknown fields, other app IDs, production environment, platform/store/key mismatches and product/entitlement IDs other than the explicitly authorized `pm_tax_exemption` pair are rejected. These explicit build mappings authorize only test metadata queries. They cannot establish runtime store scope or grant access. Ordinary artifacts must be built with the variable absent; verify disabled status in the artifact before distribution.

A valid configuration installs the test driver `await globalThis.pocketFortuneBillingValidation()` in the JavaScript debugger, with `.restore()`, `.recover()` and, only with the sandbox checkout opt-in, `.purchase()`. It uses only Game products, purchase, restore, recover and state operations, returning localized product titles/prices, operation status, the Game's tax exemption status and the last action's normalized outcome. It exposes no anonymous identifier, full transaction ID, receipt, token, raw CustomerInfo or SDK error. Reading the report never restores; on iOS only `.restore()` syncs with the App Store. See [Sandbox checkout](#sandbox-checkout-113).

In development builds, the same explicitly configured driver is available through Expo’s developer menu as **Billing validation**. It displays the normalized Game report and the same controls as the standalone report. The menu action is absent from ordinary disabled composition and is registered only when `__DEV__` is true; the global driver remains available for explicitly configured non-development validation builds.

An explicitly configured standalone build displays the same report after Game opens. **Read again** repeats the Game reads; **Restore purchases**, **Recover** and, with the checkout opt-in, **Purchase test product** run the Game operation and show the report again; **Continue** dismisses the report for free play. A cold relaunch displays it again. This entry point works with an embedded JavaScript bundle and does not require Metro or a development menu. Ordinary builds without valid validation configuration do not install the driver or display this dialog.

Configured native validation reports also include `evidence`: the last completed SDK CustomerInfo read's redacted result, its parsed provider `requestDate` as `observedAtMs`, and an allowlisted verification label. It includes no identity, product ownership record, token, receipt or vendor error text. This diagnostic is observed inside infrastructure while Game performs its usual reads; it does not alter BillingPort or delivery policy. The last completed SDK result may predate the current Game operation's timeout and is not evidence that the current query completed or fetched fresh data.

**Refresh ownership** requests `invalidateCustomerInfoCache()` and then repeats the public Game reads. `evidence.cache: invalidated` records completion of that SDK invalidation call, not proof of a fresh response, complete inventory or verified ownership. Invalidation uses the injected clock's two-second bound: a rejection or timeout becomes `unavailable`, and a late completion cannot relabel that timeout as success. A failed CustomerInfo read records only `status: unavailable`. The diagnostic can invalidate only after this runtime successfully configures the SDK; an externally configured SDK remains untouched. Ordinary builds never install this control or initialize the native SDK through it.

## SDK evidence and blocking gaps

Evidence below is source/API inspection of the pinned release, not a successful native transaction or live freshness probe.

| Contract requirement | Concrete SDK surface | Decision in this build |
| --- | --- | --- |
| Fresh-only read | `Purchases.getCustomerInfo()` takes no fetch policy. `invalidateCustomerInfoCache()` invalidates cache but is not a fresh-only response guarantee. Listener notifications also carry CustomerInfo. | Never label a response authoritative. No cache invalidation masquerading as verification. |
| Observation time | `CustomerInfo.requestDate` is an ISO timestamp describing the provider response; `latestPurchaseDate` describes a purchase. | Preserve parsed requestDate on cached/incomplete evidence. Invalid dates are unavailable. Never substitute local completion time. |
| Signature verification | `entitlements.verification`, with informational verification enabled at configuration | FAILED becomes verificationFailed. Diagnostic labels distinguish VERIFIED and VERIFIED_ON_DEVICE; neither proves scope, completeness, freshness or revocation. |
| Scope | Entitlement info has `store`, `isSandbox`, `productIdentifier`; CustomerInfo has `originalAppUserId`. | No app/bundle evidence on the transaction record. Build configuration and anonymous IDs cannot prove runtime store/app/environment. No ownership is normalized. |
| Stable transaction identity | `nonSubscriptionTransactions` contains `transactionIdentifier`, `productIdentifier`, `purchaseDate`; entitlement product identifiers are not transaction IDs. | A transaction identifier alone is insufficient to invent a scoped reference or product classification. |
| Complete permanent inventory | `allPurchasedProductIdentifiers`, `nonSubscriptionTransactions`, active/all entitlements | Purchase history and active flags do not establish a fresh complete inventory of currently valid permanent sources. Emit cached/incomplete with no ownership or removals. |
| Explicit permanent removal | No explicit permanent-refund/revocation transaction evidence on these records; server notifications affect provider state | Missing entitlements are not removal evidence. Refund mapping remains blocked. |
| Pending-payment absence | No complete pending inventory on CustomerInfo | Omit pendingProductIds, including an empty list. Never clear an unresolved checkout guard. |
| Completion | Default RevenueCat-managed completion; no observer/application completion setting | BillingPort completion owner is provider. No finish, acknowledge or consume SDK method is exposed by the facade. `purchase` was added in #113 and `restorePurchases` in #114 (transfer request only, see below). |

The facade deliberately exposes only the fields used for conservative normalization. It stays in infrastructure, including SDK types and the deterministic fake. Game validates cached/incomplete reads as unavailable, retains committed access and unresolved guards, and performs ordinary Offline settlement independently. Adding backend evidence, custom native APIs or weakening the ownership contract is outside the approved scope. Dependent checkout work is blocked on a separately approved resolution of these gaps.

### Resolution (#124)

The owner approved [ADR 1](../adr/0001-ios-ownership-evidence-from-storekit.md) on 2026-11-11. On iOS, explicit restore now syncs with the App Store and reads verified StoreKit 2 transactions through the local `StoreKitEvidence` module, which supplies app, environment, product class, stable `originalID`, revocation and a sync-based observation time. Background reads still use the conservative RevenueCat result above. StoreKit has no pending-payment list; the owner accepted the App Store's single-charge guarantee for the Apple non-consumable instead, subject to native proof. The table above remains accurate for the RevenueCat SDK itself. #113 adds a validation-only checkout behind a separate opt-in so the ADR's native checks can run; see [Sandbox checkout](#sandbox-checkout-113). Checkout is not enabled for ordinary use.

Compilation (2026-11-11): `pod install` installed `StoreKitEvidence (1.0.0)` from `modules/storekit-evidence/ios` through Expo autolinking, with no generated native file edited. An unsigned `xcodebuild -workspace ios/PocketFortune.xcworkspace -scheme PocketFortune -configuration Release -sdk iphoneos CODE_SIGNING_ALLOWED=NO build` on Xcode 27.2 finished with **BUILD SUCCEEDED**, and the binary contains the `StoreKitEvidenceModule` symbols. A simulator Debug link in the same reused build folder failed on React Native core symbols, outside this module; it was not pursued. A later review added an `OnDestroy` handler that cancels the update listener; it uses the same ExpoModulesCore closure form as the compiled `OnStopObserving` but has not been recompiled, because the shared Mac build folders were cleared for disk space. No StoreKit read, sync or transaction has run on a device yet. Those are the native checks in the ADR.

Sources for the pinned release:

- [React Native 10.16.0 API implementation](https://github.com/RevenueCat/react-native-purchases/blob/10.16.0/src/purchases.ts): getCustomerInfo, invalidation, listener registration/removal, configuration and product reads.
- [TypeScript internal 19.17.0 CustomerInfo](https://github.com/RevenueCat/purchases-hybrid-common/blob/19.17.0/typescript/src/customerInfo.ts): observation, entitlement and transaction fields.
- [RevenueCat caching](https://www.revenuecat.com/docs/test-and-launch/debugging/caching) and [trusted entitlements](https://www.revenuecat.com/docs/entitlements/trusted-entitlements).
- [Permanent products and refunds](https://www.revenuecat.com/docs/platform-resources/non-subscriptions) and [Android non-consumable setup](https://www.revenuecat.com/docs/getting-started/entitlements/android-products#add-non-consumable-products).
- [Expo 58](https://docs.expo.dev/versions/v58.0.0/) and [RevenueCat Expo integration](https://www.revenuecat.com/docs/getting-started/installation/expo): native development builds are required.

## Sandbox checkout (#113)

Owner-operated setup and the tester controls are in [the setup guide](../ios-revenuecat-setup.md#sandbox-checkout-113).

**Selection.** Checkout runs only when the validation configuration also contains `"checkout": "sandbox"`, the store is `apple`, the platform is iOS and the StoreKit evidence module is present. Otherwise `BillingPort.purchase` stays `disabled` and RevenueCat is never asked to purchase. A product other than the authorized `pm_tax_exemption` is also `disabled`. Ordinary builds carry no configuration, so they have neither checkout nor the validation entry point.

**Native call.** The SDK facade gains one method, `purchase(productId)`: it reads the store product with `getProducts` (non-subscription category) and calls `purchaseStoreProduct`. Errors are reduced to the name of the pinned SDK's `PURCHASES_ERROR_CODE`; no message, user ID, `CustomerInfo` or transaction leaves the facade. RevenueCat keeps its default managed completion. The facade has no finish, acknowledge, consume, sync or restore method, and `BillingPort.completion.owner` is `provider`.

**Normalization.**

| RevenueCat outcome | `PurchaseResult` | Guard |
| --- | --- | --- |
| Resolved for the requested product | StoreKit `latest(productId)` decides (below) | Cleared on delivery |
| Resolved for another product | `verificationFailed` | Cleared |
| `PRODUCT_ALREADY_PURCHASED_ERROR` | StoreKit `latest(productId)` decides; no new checkout | Cleared on delivery |
| `PURCHASE_CANCELLED_ERROR` | `cancelled` | Cleared |
| `PURCHASE_NOT_ALLOWED_ERROR`, `PURCHASE_INVALID_ERROR`, `PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR` | `declined` | Cleared |
| `SIGNATURE_VERIFICATION_ERROR` | `verificationFailed` | Cleared |
| `PAYMENT_PENDING_ERROR` (Ask to Buy) | `pending` | Kept as `pending` |
| Any other error, a thrown call, or no answer within the five-minute interactive bound | `unavailable` | Kept as `interrupted` |

A resolved purchase grants nothing by itself (ADR decision 5). The adapter then reads StoreKit's `latest(productId)` without syncing. `completed` requires a verified record for `pm_tax_exemption` with the configured bundle, `sandbox` environment, `nonConsumable` type, `purchased` ownership, a non-empty `originalID` and no `revocationDate`; the ownership is `verification.source: 'store'`, `completion.owner: 'provider'`, keyed by `originalID`. Any failed check is `verificationFailed`. No record, or a failed read, is `unavailable`, which keeps the guard until a Restore whose App Store sync succeeds or, since #115, until a background read finds the signed transaction. Delivery then uses the Game's existing atomic path: ownership, delivery receipt and tax exemption commit together, and a repeated or already-owned completion with the same `originalID` changes nothing.

**Validation entry point.** The report no longer calls Restore on its own. Before this change it ran `restore()` on every read, which after #126 would have called `AppStore.sync()` and shown the App Store sign-in prompt on launch. Now only **Restore purchases** syncs. The report adds `checkout` (`sandbox` or `disabled`), `tax` (Game exemption status and the number of granting purchases), `last` (the last control and its normalized outcome) and `storeKit`, the latest StoreKit transaction for the product with redacted fields: the last four characters of `originalID`, bundle, environment, product type, ownership type, signature, revocation and whether it is in current entitlements.

**Automated evidence.** `src/application/revenueCatCheckout.test.ts` drives the real adapter, the RevenueCat and StoreKit fakes and the SQLite Game harness: confirmed delivery with the stored ownership record; provider completion; no duplicate benefit across repeated purchase, already-owned and restore; each error mapping and its guard; every StoreKit scope and verification rejection; a mismatched product; a missing StoreKit record kept until Restore; the interactive timeout with a late success ignored; a failed local commit recovered at the next Restore after restart; and no native checkout without the opt-in, on Android or for an unauthorized product. `src/bootstrap/billingCheckoutValidation.test.tsx` proves the launch report never syncs, shows only redacted StoreKit fields, syncs only from Restore and buys once through Game.

### Native checks

Owner-operated iPhone 15 Pro Max (iOS 26.3) with a Sandbox Apple Account, 2026-11-11 to 2026-11-12. The app was a development-signed Release build of this branch with `"checkout": "sandbox"`, installed over Wi-Fi with `devicectl` (no cable). Results come from the owner's screenshots of the validation report.

| Check from #124 / ADR 1 | Observed | Result |
| --- | --- | --- |
| Recompile `StoreKitEvidence` including its `OnDestroy` handler | Clean prebuild, `pod install` and signed Release device build succeeded; `StoreKitEvidenceModule.o` built | Passed |
| StoreKit reads `pm_tax_exemption` with the expected fields | `storeKit`: original ID ending 0266, `com.chrisgocode.pocketfortune`, `sandbox`, `nonConsumable`, `purchased`, `verified`, in current entitlements | Passed |
| Sign-in prompt only from Restore | Owner: the App Store sign-in prompt appeared only on Restore purchases; never at launch, foreground, Recover or Purchase (Purchase shows the ordinary purchase sheet) | Passed |
| First real sandbox cancellation | `last: purchase / cancelled`, nothing granted, StoreKit had no transaction | Passed |
| First real sandbox purchase | App Store completed transaction …0266, but the Game received `unavailable` and kept an `interrupted` guard; a second Purchase did not start checkout; Restore then delivered once (`tax: exempt, 1`) | Safe, but not the expected `delivered`. The cause was not recorded; the later `checkoutTrace` was added afterwards, and both subsequent native checkouts returned `purchased → completed`. Unexplained first-purchase result; the guard and Restore recovered it as designed |
| Sandbox refund appears as `revocationDate`, leaves current entitlements, next Restore removes access | Request refund (validation control, `beginRefundRequestForProduct`) first showed Apple's "Cannot Connect" on Wi-Fi, then returned `requested` on mobile data. About 15 minutes later Restore showed `revocation: revoked`, `entitlement: absent`, and the Game's tax status returned to `active` with 0 exemption sources | Passed |
| Purchase after a refund | Purchase returned `delivered` without opening the App Store while access stayed removed: a `delivered` checkout guard left by the Restore recovery counted the refunded record as delivered. After the fix (rebuilt and installed over the same save), Purchase opened the App Store, created transaction …9017, `checkoutTrace: purchased → completed`, `tax: exempt, 1` | Defect found and fixed (below); passed on retest |
| Purchase while owned does not charge again | App uninstalled and reinstalled over Wi-Fi, so the Game had no receipt. Purchase reached the App Store and returned the same transaction …9017, not a new one; `checkoutTrace: purchased → completed`, `tax: exempt, 1`. A following Restore kept `exempt, 1`. This also covers reinstall restoration through checkout | Passed |
| Ask to Buy twice, then approved: one transaction, one charge | Skipped by owner decision (2026-11-12); no sandbox family was set up and no Xcode StoreKit substitute was run | Unverified; gap accepted by the owner on 2026-11-12 |
| Reading StoreKit never finishes a transaction RevenueCat has not finished | Source: the module has no `finish()` call and the JS facade exposes none. Every device purchase reached `revenueCat: purchased` (RevenueCat-completed) before the StoreKit read. No unfinished transaction was available to observe, because Ask to Buy was skipped | Source-verified; not exercised natively |

**Summary.** All checks moved from #124 passed except Ask to Buy, which the owner skipped, and the no-finish check, which is source-verified only. ADR 1's `storePrevents` rule rests on two store guarantees: an owned non-consumable is not charged again (proven on device) and a repeated pending request is not charged twice (unproven). On 2026-11-12 the owner accepted that gap: the `storePrevents` rule stays in force without native Ask to Buy proof, and #113's evidence gate is met. This does not enable checkout for ordinary players. Production billing, a commercial product and public purchase controls remain out of scope (#111) and need their own spec.

**Defect fixed from the device run.** A purchase that was already delivered short-circuits to `delivered` before checkout. That check counted a receipt whose current ownership had since been removed, and a resolved `delivered` guard still blocked a new checkout. Now only receipts that are not removed count as delivered, and only `pending` or `interrupted` guards block checkout. Regression: `starts a new checkout after a refund removed a purchase recovered by Restore` in `src/application/revenueCatCheckout.test.ts`, which failed before the fix. The #100 test that asserted the old answer (`delivered` with access removed) now expects a new checkout.

If the duplicate-charge checks fail, ADR 1's `storePrevents` guard rule is void: remove it and keep checkout blocked. Android purchase and Play license testing stay deferred in #118; the Android non-consumable classification and acknowledgement-without-consumption criteria are not attempted here.

## Pending and interrupted payments (#115)

ADR 1 was amended for this slice ([Decision 2a](../adr/0001-ios-ownership-evidence-from-storekit.md#decision)). Background reads may now grant **signed ownership**; anything that depends on absence still needs Restore.

**Checkout lifetime.** The Game writes the `interrupted` guard before it calls the SDK and keeps it until delivery or proven absence (unchanged from #100). The Game stops waiting after the five-minute interactive bound, but the native sheet stays open as long as the store needs. The adapter keeps one native checkout open per process, shared by any Game rebuilt on the same RevenueCat runtime: a purchase requested while it is unresolved joins it. While it is open, Restore reports the product in `pendingProductIds`, so not even a `storePrevents` guard clears on absence. When the native call settles, early or late, the adapter emits `ownershipChanged`, and the Game reconciles from StoreKit instead of publishing the late result.

**Outcomes and recovery.**

| Situation | Guard | How it resolves without a second charge |
| --- | --- | --- |
| `PAYMENT_PENDING_ERROR` (Ask to Buy) | `pending` | Approval appears in `Transaction.updates` or at the next launch or foreground. The signed read delivers it and the guard becomes `delivered`. Decline: Restore's fresh absence clears it (`storePrevents`). |
| Unknown error, thrown call, no StoreKit record yet, five-minute bound reached | `interrupted` | Same: the signed read delivers once StoreKit lists the transaction; otherwise Restore's fresh absence clears it. |
| Purchase confirmed but the local commit failed | `interrupted` | The next launch, foreground or update delivers it from the signed read. |
| App closed during checkout | `interrupted` (written before the SDK call) | The next launch reads the guard and reconciles; no checkout until it resolves. |
| Retry while the guard is unresolved | Unchanged | The Game reconciles first and returns `unavailable` without contacting RevenueCat. |
| Retry while the native sheet is still open | Unchanged | The adapter returns the open checkout; no second sheet. |

Guards still clear only through a delivered receipt or fresh, authoritative, complete absence observed after the request. A `signed` read, a cached RevenueCat read and evidence that predates the request clear nothing. A missing pending list still preserves the guard, except where ADR 1's `storePrevents` rule applies after a fresh Restore.

**Automated evidence.**

- `src/application/revenueCatRecovery.test.ts` (real adapter, RevenueCat and StoreKit fakes, SQLite Game):
  - an approval after restart delivered by a StoreKit update, with no sync;
  - unknown error, bridge failure and missing StoreKit record each kept as `interrupted` across restart and delivered on the next launch, with one native checkout;
  - a fresh Restore keeps the guard while the sheet is still open past the interactive bound, and a Game rebuilt in the same process sees that sheet;
  - a late sheet result reconciled even with every callback dropped;
  - concurrent purchases sharing one sheet;
  - nothing written when the sheet resolves after disposal.
- `src/application/signedOwnership.test.ts` (Game seam): `signed` evidence delivers once, keeps a guard until delivery, never reactivates a removed purchase and grants nothing that the store did not sign.
- `src/application/storeKitOwnership.test.ts`: background reads grant only in-scope, verified, unrevoked records and never sync.
- `src/application/revenueCatCheckout.test.ts`: a failed local commit is now recovered on the next launch.
- The #100 suites (`purchaseGuard`, `purchaseOperations`, `purchaseConcurrency`, `purchaseLifecycle`, `purchaseDisposal`, `revenueCatOffline`) still cover the guard rules, coalescing, event draining during a query, listener ownership, disposal across storage awaits, redacted diagnostics and single Offline settlement.

**Native scenarios.** Run on the physical iPhone in #117 with the validation build, using `checkoutTrace`, `storeKit`, `tax` and the stored guard shown in the report.

| Platform | Scenario | Steps | Expected |
| --- | --- | --- | --- |
| iOS | Ask to Buy approved while the app is closed | Child Sandbox account in a sandbox family. Purchase, then close the app; approve from the organizer; relaunch without pressing Restore | `last: purchase / pending`; after relaunch `tax: exempt, 1`, one transaction, no sign-in prompt |
| iOS | Ask to Buy approved while the app is open | As above, approve while the report is open | Delivered from the `Transaction.updates` callback without Restore |
| iOS | Ask to Buy declined | Decline; press Purchase | `unavailable`, no new sheet; Restore clears the guard, then Purchase opens one sheet |
| iOS | Sheet left open past five minutes | Purchase, leave the sheet for more than five minutes, then confirm | Game reports `unavailable`; after confirming, delivered once without Restore |
| iOS | App killed during checkout | Purchase, force-quit from the app switcher before confirming, relaunch | Guard `interrupted`; Purchase does not open a sheet until StoreKit or Restore resolves it |
| iOS | Offline after confirming | Confirm a purchase, then switch on Airplane Mode before the result | No grant offline; delivered on the next online launch or foreground |
| Android | All of the above | Deferred to #118 | Not attempted; Android checkout stays `disabled` |

The unexplained first device purchase in #113 (completed in StoreKit, `unavailable` in the Game) is now recovered on the next launch, foreground or update without Restore. `checkoutTrace` will name the failing step if it happens again.

## Restoring permanent access (#114)

A permanent owner gets access back after restart, Reset Save, a failed local delivery, reinstall or on a second device signed in to the same App Store account, without another charge. Restoring access never restores progress, cash or a consumable balance: the Game has no cloud save and no consumable wallet.

**What is stored where.** The purchase identity (Game ID, RevenueCat's anonymous App User ID as `providerReference`, the checkout guard) and the ownership ledger live in their own SQLite tables, outside the save document. Reset Save rewrites the save document and leaves both tables alone; it never calls an SDK logout or reset, and the SDK facade has no such method. No field was added, so the save format and the ledger format are unchanged.

**Identity policy.** RevenueCat's anonymous ID is an association, not a credential. At launch the adapter compares the SDK's current ID with the saved reference:

| Saved reference | SDK ID | Report `provider.identity` | Result |
| --- | --- | --- | --- |
| none | any | `created` | Saved. |
| same | same | `retained` | Unchanged. |
| different | new | `replaced` | The SDK's ID is saved in place of the old one. Billing stays ready. The Game ID, ledger, committed access and any unresolved checkout guard are kept. |

A replaced ID happens when the SDK's own storage is lost while the Game database survives, for example a device restore or cleared app data. Before #114 this left billing `unavailable` for good. The adapter never calls `logIn` with an old anonymous ID, because RevenueCat does not support logging in to anonymous IDs and that would treat the ID as a credential.

**Transfer policy.** Ownership always comes from StoreKit (ADR 1), so the Game does not depend on RevenueCat's customer record. To keep that record in step, an explicit Restore whose App Store sync succeeded also calls the SDK's `restorePurchases()`. With the project's **Restore behavior** set to *Transfer to new App User ID* ([setup step](../ios-revenuecat-setup.md#sandbox-checkout-113)), RevenueCat moves the purchase to the current anonymous ID. The call runs after the App Store sync, so the tester is already signed in. The Game does not wait for it and ignores its result: a failed or stalled transfer changes nothing in the Game and is retried by the next Restore. The report shows `provider.transfer` as `notRequested`, `requested`, `completed` or `failed`. Launch, foreground, `Transaction.updates` and CustomerInfo callbacks never sync with the App Store and never request a transfer, and neither does a Restore whose sync finishes after the Game closed. An owner who gets access back from StoreKit at launch and never presses Restore stays under the old customer in RevenueCat until the next Restore or purchase; Game access does not depend on it.

**Limits.** There is no game account. Access follows the App Store account, so it is not shared between Apple and Android, and progress is never shared between devices. Two devices on one App Store account each hold their own ledger row for the same `originalID` and their own progress.

**Automated evidence.** `src/application/revenueCatIdentity.test.ts` and `src/application/revenueCatRestore.test.ts` drive the real adapter with the RevenueCat and StoreKit fakes on the SQLite Game harness:

- identity, ledger and access survive Reset Save and restart with cash reset to zero and no transfer request;
- a `pending` guard survives Reset Save and a replaced identity, and blocks a second checkout;
- a replaced identity is adopted, billing stays available and access is kept without an App Store sync;
- reinstall and second-device Restore under a new anonymous ID deliver once, keep the fresh install's cash, start no checkout and request one transfer; the first device is unchanged;
- launch, pause/resume, CustomerInfo and StoreKit callbacks never sync or transfer;
- a failed or stalled transfer does not delay or undo restored access; a failed App Store sync requests no transfer;
- a Restore whose receipt write fails publishes nothing, then delivers once across repeated Restore and reopen;
- with RevenueCat and the App Store unreachable after ten hours away, an owner keeps access through one Offline settlement and a non-owner is granted nothing.

`src/bootstrap/billingCheckoutValidation.test.tsx` checks that the report shows `provider` without the anonymous ID. Earlier slices cover failed delivery after checkout (`revenueCatCheckout.test.ts`), crash and reopen (`revenueCatRecovery.test.ts`) and the scripted ledger cases (`purchaseRestore.test.ts`, `managedPurchases.test.ts`).

### Native scenarios (not yet run)

Run on a physical iPhone with the sandbox checkout build and one Sandbox Apple Account that already owns `pm_tax_exemption`. Read the report after each step.

| Scenario | Steps | Expected report |
| --- | --- | --- |
| Restart | Force-quit and relaunch | `provider.identity: retained`, `tax: exempt, 1`, no sign-in prompt |
| Reset Save | Earn cash, Settings → Reset Save, relaunch | Cash zero, `tax: exempt, 1`, `provider.identity: retained`, no prompt |
| Same-store reinstall | Earn cash, delete the app, install the same build, launch, earn a little cash, press **Restore purchases** | At launch `provider.identity: created`; StoreKit may already grant access without Restore. After Restore: `last: restore / current`, `tax: exempt, 1`, `provider.transfer: completed`, cash is only what was earned since reinstall, no purchase sheet |
| Second device | Second iPhone signed in to the same Sandbox Apple Account, fresh install, press **Restore purchases** | Same as reinstall. The first device keeps its progress and `tax: exempt, 1` |
| Transfer in RevenueCat | After either Restore, open the sandbox customer list in the RevenueCat dashboard | The purchase is listed under the new anonymous customer |
| Other store account | Sign in to a different Sandbox Apple Account on a fresh install, press Restore | `last: restore / current`, `tax` not exempt, `provider.transfer: completed`, no access |
| Offline owner | Airplane Mode, relaunch after some time away | `tax: exempt, 1`, one Return summary, `products: unavailable`; Restore returns `unavailable` and changes nothing |
| Android | All of the above | Deferred to #118 |

Open native questions these runs answer: whether `restorePurchases()` shows a second sign-in prompt after `AppStore.sync()`, and whether the transfer appears in the dashboard for a StoreKit 2 non-consumable.

## Refunds (#116)

A confirmed refund removes access from then on. Uncertain or older evidence keeps it, and play that already happened is never rewritten.

**Where refunds come from.** Apple signs a `revocationDate` onto the refunded transaction and drops it from `Transaction.currentEntitlements`. The Game sees it only through a Restore whose `AppStore.sync()` succeeded (ADR 1, Decision 2): the adapter turns a verified, in-scope `latest(productId)` with a `revocationDate` into a named removal. Launch, foreground, Recover, `Transaction.updates` and RevenueCat callbacks never remove access, because their reads are not fresh.

**Server notifications.** App Store Server Notifications (Version 2) go from Apple to RevenueCat's URL ([setup](../ios-revenuecat-setup.md#sandbox-checkout-113)), and Google Real-time developer notifications go to RevenueCat through a Pub/Sub topic RevenueCat provides (Play Console → Monetization setup → Real-time developer notifications; RevenueCat → the Android app → *Connect to Google*). Both update RevenueCat's customer record only. Pocket Mogul runs no server, so nothing receives these notifications on the Game's behalf, and the Game never treats a RevenueCat entitlement change as a refund. Google setup is deferred with Android in #118.

| Evidence | Effect |
| --- | --- |
| Restore after a successful sync; latest record verified, in scope (bundle, environment, `nonConsumable`, `purchased`) and revoked | Removal of that `originalID`, if the Game holds a receipt for it |
| Failed or timed-out sync, `unavailable` | Nothing |
| Product missing from entitlements with no revoked latest record | Nothing |
| Unverified record anywhere in the read | `verificationFailed`; nothing |
| Revoked record for another bundle, environment, product type or a family-shared copy | Nothing |
| Background (`signed`) read listing the refunded record again; replayed checkout completion; CustomerInfo or StoreKit callbacks | Nothing; a removed receipt is never reactivated |
| Missing offerings or products, expired RevenueCat cache, inactive RevenueCat entitlement | Nothing: on iOS the adapter never builds ownership from RevenueCat's `CustomerInfo` or catalogue (ADR 1); tested in `revenueCatRefund.test.ts`, with cached, incomplete and stale scripted evidence in `purchaseRemoval.test.ts` |

**Two times.** A removed receipt keeps `observedAtMs`, the injected-clock time read before the App Store sync started, and `revokedAtMs`, Apple's signed `revocationDate`. The difference is how long the refund took to reach the Game. Neither is the time a response arrived. Ordering uses `observedAtMs` only, so a refund dated before an earlier active observation still removes access when it appears, and an older observation cannot undo a newer removal. The validation report shows `storeKit.revokedAtMs` for a revoked record. Receipts saved before #116 have no `revokedAtMs` and load unchanged.

**What changes.** All ownership sources are projected together in one SQLite transaction with the tax state and any Offline settlement (#101): another unrevoked purchase or the legacy entitlement keeps the exemption. A failed write publishes nothing and leaves the receipt active. Removal is prospective: waived returns, earnings settled while exempt and the existing Return summary stay; taxation starts on the next day with a newly valued basis. Removed receipts survive restart and Reset Save, and a new checkout after a refund opens the App Store (`revenueCatCheckout.test.ts`); on the device in #113 it created a new transaction, …9017.

**Automated evidence.** `src/application/revenueCatRefund.test.ts` drives the real adapter with the RevenueCat and StoreKit fakes on the SQLite Game harness:

- the removal keeps Apple's revocation time separately from the observation time, and Recover alone does not remove;
- a refund seen after an earlier Restore still showed the purchase owned removes access;
- a failed sync, an empty inventory, and unverified, other-app, production and family-shared refunds keep access;
- a stale StoreKit read, a CustomerInfo callback and a replayed checkout do not re-grant;
- a failed save rolls back, then the removal survives Reset Save and restart with a stale StoreKit cache;
- the legacy entitlement keeps the exemption;
- an empty RevenueCat catalogue, an unreadable customer cache and a CustomerInfo callback keep access;
- an owner away for ten hours gets one exempt Offline settlement, then Restore removes access with the waived return, cash and Return summary unchanged, and later play is taxed.

`src/application/purchasePersistence.test.ts` reopens a removed receipt with `revokedAtMs` from SQLite. `src/bootstrap/billingCheckoutValidation.test.tsx` shows the revocation time in the report. The #101 suites (`purchaseRemoval`, `purchaseRemovalTiming`, `purchaseRemovalRecovery`, `managedPurchaseRemoval`) cover the same rules with scripted evidence.

### Refund scenarios

| Store | Steps | Expected report |
| --- | --- | --- |
| iOS | Sandbox checkout build, Sandbox Apple Account. Purchase (`tax: exempt, 1`). Note the time, press **Request refund** (use mobile data if the sheet says *Cannot Connect*). Press **Recover** every few minutes, then **Restore purchases** once `storeKit.revocation` is `revoked` | Before Restore: `tax: exempt, 1` despite `revocation: revoked`, `entitlement: absent`. After Restore: `last: restore / current`, `tax: active, 0`; note `storeKit.revokedAtMs` and the Restore time to record propagation. Cash is unchanged. Relaunch and Reset Save keep `tax` not exempt; **Purchase** opens a new App Store sheet. #113 already ran the refund and repurchase steps on 2026-11-12 (about 15 minutes to reach the device); the propagation times are not yet recorded |
| iOS | As above, but turn on Airplane Mode before pressing Restore | `last: restore / unavailable`, `tax: exempt, 1` |
| Android | Play license tester buys the non-consumable; Play Console → Order management → refund with *Revoke entitlement*; RTDN reaches RevenueCat | Deferred to #118. Today Android checkout is `disabled`, so the Game holds nothing to remove and the scenario cannot run |

## Configuration ownership

Device composition lazily imports the native SDK only for valid configuration when Game initializes billing. One process runtime owns configuration; competing configuration and an SDK already configured elsewhere are rejected. Each Game has a removable listener. Disposal removes its subscription without logout, identity reset or reconfiguration. SDK-generated anonymous identity is persisted by the existing purchase identity transaction outside Reset Save. Since #114 a mismatch adopts the SDK's identity (see [Restoring permanent access](#restoring-permanent-access-114)); it never logs in with a stored anonymous identifier. SDK waits use the Game's existing two-second bounds per operation, not a network prerequisite for free play.

## Native acceptance record

Current source pins: Expo 58.0.24, React Native 0.88.1, core react-native-purchases **10.16.0**, PurchasesHybridCommon **19.17.0** on both platforms, Apple RevenueCat **5.99.0**, Android Purchases **10.30.0**, Play Billing **8.3.0**. Expo and its required patch-level package updates were applied on 2026-11-11 after Expo Doctor's online compatibility check rejected the previous Expo 58.0.23 baseline. Historical binaries below used their recorded versions; they are not native proof of the updated baseline. Core and JS dependencies are locked by bun.lock; native versions listed here come from upstream exact dependency declarations. Resolved native graphs and compilation results are recorded below; source declarations alone are not build proof.

The core autolinks with Expo prebuild. `plugins/withRevenueCatPins.ts` pins the Android hybrid, Purchases and Play Billing dependencies through generated Gradle configuration; Apple hybrid and RevenueCat dependencies are already exact in the upstream podspecs. No hand-edited native project is required. Run `bun install --frozen-lockfile`, `bunx expo prebuild --clean`, then build both native projects. Never use Expo Go. This integration requires a new binary, not an OTA update.

Outstanding native gates: the #114 reinstall, second-device and transfer scenarios ([table](#native-scenarios-not-yet-run)), the #116 refund propagation timing ([table](#refund-scenarios)), Google SDK configuration and metadata, provider cache/failure/freshness probes, native offline launch, and actual store transaction acceptance. Clean iOS/Android compilation and resolved dependency evidence passed as recorded below. The owner subsequently supplied the Apple public SDK key and confirmed the product/entitlement mapping; native iOS configuration and product metadata reads passed on 2026-11-10 as recorded in the later probe. Actual store acceptance is unverified. Simulators, compilation and injected fake results do not prove App Store sandbox or Play license-testing acceptance. Store account setup, agreements, signing, product-to-entitlement mappings and permanent non-consumable designation must be confirmed before probes. No real purchase, refund, pending payment, restore or cross-device claim is made by this slice.


### Compilation evidence (2026-11-09)

- Mac: Xcode 27.2 (27B52), CocoaPods 1.17.0, Node 26.10.0, Bun 1.4.0, Java Liberica 21. Local checks use Bun 1.4.3.
- Clean Expo prebuild succeeded on both platforms with the pinned JS dependencies. No generated native source was edited.
- iOS: `pod install --repo-update` succeeded. Podfile.lock resolved RNPurchases 10.16.0 → PurchasesHybridCommon 19.17.0 → RevenueCat 5.99.0. `xcodebuild -workspace ios/PocketMogul.xcworkspace -scheme PocketMogul -configuration Debug -sdk iphonesimulator -destination id=E82EDCD6-2116-484E-AE23-6C89F2CE4B46 -derivedDataPath /tmp/pm112-derived CODE_SIGNING_ALLOWED=NO build` finished with **BUILD SUCCEEDED**. This is an unsigned simulator development binary, not store acceptance.
- SDK 11.0.1 was rejected during compatibility validation: its required PurchasesHybridCommon 20.4.0 was unavailable from CocoaPods even after updating the index. The committed pin is 10.16.0, with published native dependencies.
- Automated evidence: Game tests cover invalid/unsupported configuration without loading the SDK, localized metadata, disabled checkout, native configuration ownership, identity mismatch (rejected then; adopted since #114), removable listeners, bounded startup, offline taps, retained access and guards, Reset Save, and unchanged ordinary Offline settlement/Return summary through outages and reconciliation. Independent reviews found no unsafe ownership authority or checkout enablement.

- Android: clean prebuild plus `./gradlew app:assembleDebug` succeeded in 14m 10s (558 tasks executed), producing `android/app/build/outputs/apk/debug/app-debug.apk` for arm64-v8a, armeabi-v7a, x86 and x86_64. Gradle 9.4.1, compile SDK 37, target SDK 36, NDK 27.1.12297006 and Kotlin 2.2.10 were used. The `:app:dependencies --configuration debugRuntimeClasspath` report resolved hybrid 19.17.0 → Purchases 10.30.0 → Play Billing 8.3.0, matching the config-plugin pins. This is a debug compilation, not Play store acceptance.
- The iOS app installed and loaded its JavaScript bundle on the iPhone 17 Pro simulator (iOS 26.0) with validation configuration absent. Live RevenueCat initialization and store reads were not attempted without the owner's validation setup.
- Final `bun run check`: 828 logic tests, 135 screen tests, all static checks and 20/20 Expo Doctor checks passed. Mandatory commit hooks also passed. Review findings were addressed by reusing PurchasePolicy and adding the adapter-backed Offline settlement regression.

### Rename configuration

The Pocket Fortune rename introduced `pocketFortuneBillingValidation`. The owner subsequently chose one app record for sandbox testing and eventual release, using the permanent identifier `com.chrisgocode.pocketfortune` in Apple, Google, RevenueCat and app configuration. The earlier `com.pocketfortune.dev` and `com.pocketmogul.dev` identifiers are retired placeholders. Earlier compilation evidence above describes the earlier binaries. The permanent identifier does not enable production billing: explicit sandbox validation configuration and test-only product mappings remain required. See [the setup guide](../ios-revenuecat-setup.md).


### Owner-configured Apple product probe (2026-11-10)

The owner created the Apple non-consumable `pm_tax_exemption` and confirmed that its RevenueCat entitlement identifier is also `pm_tax_exemption`. The infrastructure allowlist now accepts exactly this pair under the existing explicit sandbox profile. Earlier `pm_validation_*` examples are no longer accepted. The actual App Store app name is Pocket Fortune Business Empire; the installed app remains Pocket Fortune.

The owner supplied an Apple public SDK key through the private input card. It is stored only in ignored local configuration, outside automatic Expo `.env` loading, and was not committed or included in the source archive. Metro was started with the validation variable explicitly injected for that process. Ordinary builds remain disabled when that variable is absent.

A new unsigned iOS simulator binary for `com.chrisgocode.pocketfortune` compiled successfully with the pinned SDK. On the iPhone 17 Pro simulator, the developer-menu action executed Game product and ownership reads against the native RevenueCat adapter. The observed report was:

```json
{
  "products": {
    "status": "available",
    "products": [
      { "productId": "pm_tax_exemption", "displayName": "Tax Exemption", "displayPrice": "$1.99" }
    ]
  },
  "ownership": "unavailable",
  "operation": "unavailable",
  "checkout": "disabled"
}
```

This proves native SDK configuration and a live localized StoreKit product read through Game. The ownership status means no authoritative ownership inventory was accepted; that status alone cannot distinguish insufficient evidence from provider unavailability. Product metadata alone does not establish backend credential validity, transaction scope, fresh ownership, refund behavior or store purchase acceptance. No checkout or store restoration was attempted. Physical-device/TestFlight transactions, Google setup and the ownership-evidence feasibility gates remain outstanding.

### iOS acceptance matrix (#112, completed 2026-11-11)

The implementation landed in #119, followed by the Apple configuration and probe in #122. PR #123 adds the remaining evidence and standalone controls. This matrix applies the owner's iOS-only scope decision. The negative ownership-feasibility result completes this investigation; checkout remains blocked in #124.

| Case | Evidence | Outcome |
| --- | --- | --- |
| Reproducible native compilation | Clean iOS prebuild and signed Release builds, resolved native graph and artifact hashes below | Passed on the current Expo 58.0.24 baseline. Historical Android compilation remains supplementary; Android acceptance is deferred to #118. |
| Native configuration and localized metadata | Simulator and physical iPhone reports returned Tax Exemption / $1.99 through Game | Passed for the authorized Apple fixture. No purchase was attempted. |
| Default and invalid configuration | Game + SDK fake tests prove disabled operations, empty products and zero SDK loader calls. The signed ordinary artifact excludes the validation key; the owner observed no billing dialog and working taps | Passed across the approved seams. No native packet-capture claim is made. |
| Ownership freshness and cached failure | Pinned API/source evidence, repeated unchanged provider timestamps, physical disconnected invalidation producing unavailable CustomerInfo, and reconnected recovery with a newer verified timestamp | Feasibility investigation complete. Invalidation and verified signatures are not fresh-only, scope, completeness, removal or pending-absence guarantees. |
| Native offline free play and bounded startup | Owner-operated offline cold launch, Return summary and wallet tap; immediate restart without another summary. Game + injected-clock regressions prove two-second provider bounds and unchanged settlement, including late invalidation completion | Passed across the approved seams. Manual Treasury readings are not an exact financial regression assertion. |
| Configuration ownership and subscription disposal | Game + SDK fake tests prove one process configuration, external configuration rejection, removable listeners, disposal and no invalidation of another owner's SDK | Passed at the approved injected boundary. Native sessions do not claim exhaustive store lifecycle acceptance. |
| Ownership feasibility and dependent checkout readiness | Field-level limitations above; cached/incomplete inventory never grants authority or clears guards | #112 complete as a negative feasibility result; #124 blocks checkout issue #113. No backend/native extension or weakened contract is approved. |

During the initial follow-up, the device tools reported the configured Mac host unavailable: `Could not connect to this host over SSH.` The local Linux host has neither an iOS simulator nor an Android SDK. At that point no new native probe or compilation result was obtained. Automated coverage now exercises valid Apple and Google selection through Game and rejects an externally configured SDK without changing it, adding listeners or preventing free play. These are fake-backed results, not Google SDK configuration or store acceptance.

### Resumed Mac session (2026-11-10, 16:27–16:38 UTC)

The owner restored Mac connectivity after the initial follow-up. The device tools opened the existing iPhone 17 Pro simulator on iOS 26.0. The installed development binary is `com.chrisgocode.pocketfortune`, version 0.1.0, build 1; its executable SHA-256 is `768dd24d359bf718b7b208737da43f711949be3dc8217a718d9ab8dac8e35327`. This session reused that binary and the existing owner-supplied Apple configuration, with Metro on port 8113. It did not compile a new binary or use TestFlight/App Store sandbox transactions.

| Probe | Observed result | Limit |
| --- | --- | --- |
| Initial Game validation read | Empty unavailable products, unavailable ownership/operation, disabled checkout | A live unavailable result, without controlled failure injection. Its cause was not established. |
| Free play after that unavailable result | A wallet tap changed cash from $0.00 to $1.00; $1.00 survived later cold relaunches | Confirms usable free play and saved progress during unavailable billing, not a disconnected cold launch or Offline settlement with passive income. |
| Later cold relaunch and Game validation read | SDK initialization reached ready; `pm_tax_exemption` returned Tax Exemption / $1.99, with ownership/operation unavailable and checkout disabled | Temporary diagnostics only recorded initialization phase and error category. No SDK failure category was recorded in the successful session. The earlier unavailable result was not reproduced or diagnosed. |
| Repeated native ownership reads | Two reads during 16:36–16:37 UTC both reported `requestDate: 2026-11-10T16:36:18Z` and `verification: VERIFIED` | The provider observation timestamp did not advance. A verified signature and successful repeated read do not demonstrate a new observation, fresh-only behavior, complete inventory or removal/pending evidence. |

The timestamp probe temporarily copied only `requestDate` and verification status from the real SDK result into the validation report; Game still received the existing conservative normalized ownership result. No key, anonymous identity, receipt, token, transaction or vendor error text was exported. The temporary diagnostics were removed and the three restored source files matched the repository's hashes before the final uninstrumented relaunch. Its developer-menu report again returned Tax Exemption / $1.99, unavailable ownership/operation and disabled checkout, with no diagnostic fields. The debugger probe timed out, so the developer-menu reports supplied the observations instead.

Offline and failed-refresh/cache-fallback probes remain unverified. The device tool documents iOS simulator Wi-Fi/airplane settings as status-bar overrides, not network isolation, so those toggles were not used as outage evidence. This session had no Google SDK key/product configuration available. The native matrix above still requires a genuinely disconnected launch, controlled provider failure and Google validation; ownership feasibility and dependent checkout remain blocked.

### Physical iPhone preparation and online read (2026-11-11)

After the owner deferred Android, a clean iOS prebuild and Release-configuration device build used Expo 58.0.24 and the required Expo patch updates. Podfile.lock resolved RNPurchases 10.16.0 → PurchasesHybridCommon 19.17.0 → RevenueCat 5.99.0. The device was an iPhone 15 Pro Max on iOS 26.3 with Developer Mode enabled. This is a development-signed local build, version 0.1.0/build 1, not an App Store or TestFlight submission.

Compilation first reached signing over SSH, where codesign returned `errSecInternalComponent`; the certificate verified and Keychain Access already listed codesign as permitted. The owner reran the prepared build from Terminal in the logged-in Mac session and it succeeded. Signature verification with `codesign --verify --deep --strict` then passed, and devicectl reported a successful installation. The app contains its JavaScript bundle and explicit Apple validation configuration; no Metro connection is needed. Its executable SHA-256 is `2428b13349f475237c7009dc2b1d4af498c7f752373f38cc1551b147b33073a0`, and embedded bundle SHA-256 is `c4ce3f106ff8226ab40b5499997f16e33c324bc7da324659cf2f09f658cd59d9`.

The Device panel tool exposed simulators only and rejected the physical device ID even though Xcode reported the phone paired. Installation used the supported build/install tooling; the owner performed on-phone actions manually. On opening the installed app online, the owner reported products available and checkout disabled in the standalone validation dialog. This confirms those reported states; no physical-device transaction, fresh-only guarantee or raw ownership evidence is inferred. The offline, controlled failure/cache and ordinary-build isolation probes remain pending.

The standalone report regression failed before the entry point was implemented and passed afterward. Full repository checks then passed with 833 logic tests, 137 screen tests and 20/20 Expo Doctor checks. The first online Doctor run had rejected ten earlier Expo patch versions; a fresh frozen-lockfile install also removed stale duplicate modules left by the local package update. No compatibility check was disabled.

### Physical read-only closeout (2026-11-11)

The owner verified each newly installed development-signed app online before testing disconnected launches. Apple certificate verification is an installation prerequisite, not a RevenueCat read or an offline-runtime success. Both final validation and ordinary artifacts used the same pinned native graph and passed deep strict signature verification. Their embedded bundle hashes are:

- Validation: `b8f70e1d975d49805bdf7c4e661f5fe4feeb76bdae690ba36bb1c57c32ae67f8` (explicit Apple key present).
- Ordinary: `6a78f851a3c57aa9c9173887565c94531a8c091c0dbbcd656943cb9deee0e17f` (validation key absent).

| Physical case | Owner-observed result | Interpretation |
| --- | --- | --- |
| Radio-disconnected cold launch | With Airplane Mode on and Wi-Fi off, the app opened, products remained available and checkout remained disabled | The embedded-bundle app did not require Metro. Cached metadata is not ownership evidence. |
| Offline settlement and taps | After owning a Vending Machine and waiting two minutes with the app closed, a Return summary appeared and a wallet tap worked | The engine remained usable through unavailable billing. The first summary's exact values were not transcribed. |
| Immediate offline restart | No second Return summary appeared. Treasury readings were $11.68 and $25.31 over an unmeasured interval with foreground play | No repeated summary was observed. The Treasury delta is not proof of an exact payment amount; deterministic adapter-backed settlement tests supply that assertion. |
| Later online baseline | The supplied screenshot showed untouched cache, returned CustomerInfo, `observedAtMs: 1794414541000`, verified signature, unavailable ownership/operation and disabled checkout; Tax Exemption / $1.99 was visible | Even online reads can expose an earlier provider observation. No authority was accepted. |
| Controlled disconnected invalidation | After Airplane Mode on, Wi-Fi off and USB unplugged, Refresh ownership showed `cache: invalidated`, CustomerInfo unavailable, ownership/operation unavailable and checkout disabled | A real unavailable SDK-evidence path was observed. No replacement observation time or authority was invented; cached product metadata remained available. |
| Reconnected invalidation and read | The screenshot showed invalidated cache, returned CustomerInfo, `observedAtMs: 1794415607000`, verified signature and disabled checkout | SDK reads recovered with a newer provider observation. This does not establish a general fresh-only guarantee. |
| Ordinary artifact | After installation with validation configuration absent, the owner reported no Billing validation dialog and a successful wallet tap | The ordinary entry point stayed absent and free play worked. Zero SDK load/network-call guarantees are covered by disabled-selection tests and lazy composition, not by an unperformed packet capture. |

The screenshots also showed legitimate later Return summaries as time away accumulated across setup: 7 minutes away/credited with $41.93 personal cash and $41.94 Treasury growth, then 10 minutes with $58.01/$58.03, and 13 minutes with $74.03/$74.05. These are observed engine results, not claimed controlled before/after totals. The immediate-restart observation and deterministic Game regression establish the non-replay checks at their respective seams.

The new probe regressions cover provider-error redaction, SDK ownership, and bounded invalidation. Review found the initially missing invalidation timeout; a red-before-green regression now proves the injected two-second timeout and that late completion cannot change it to success. Full checks passed with 833 logic tests, 141 screen tests and 20/20 Expo Doctor checks. The native read-only results do not certify store transactions or resolve the ownership contract. Those requirements remain explicit in #124 and the later store-acceptance issues; Android stays deferred in #118.
