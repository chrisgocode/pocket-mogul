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

A valid configuration installs the test driver `await globalThis.pocketFortuneBillingValidation()` in the JavaScript debugger. It uses only Game products/restore/state operations, returning localized product titles/prices, normalized ownership status and operation status. It exposes no anonymous identifier, transaction, receipt, token, raw CustomerInfo or SDK error. `restore()` here performs a read, not RevenueCat's store restoration operation. There is no purchase control. The driver's ownership result is unavailable until the existing contract can be satisfied.

In development builds, the same explicitly configured driver is available through Expo’s developer menu as **Read billing validation**. It displays only the normalized Game report in an alert. The menu action is absent from ordinary disabled composition and is registered only when `__DEV__` is true; the global driver remains available for explicitly configured non-development validation builds.

An explicitly configured standalone build displays the same read-only report after Game opens. **Read again** repeats the Game reads; **Continue** dismisses the report for free play. A cold relaunch displays it again. This entry point works with an embedded JavaScript bundle and does not require Metro or a development menu. Ordinary builds without valid validation configuration do not install the driver or display this dialog.

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
| Completion | Default RevenueCat-managed completion; no observer/application completion setting | BillingPort completion owner is provider. No finish, acknowledge, consume, purchase or restorePurchases SDK method is exposed by the facade. |

The facade deliberately exposes only the fields used for conservative normalization. It stays in infrastructure, including SDK types and the deterministic fake. Game validates cached/incomplete reads as unavailable, retains committed access and unresolved guards, and performs ordinary Offline settlement independently. Adding backend evidence, custom native APIs or weakening the ownership contract is outside the approved scope. Dependent checkout work is blocked on a separately approved resolution of these gaps.

### Resolution (#124)

The owner approved [ADR 1](../adr/0001-ios-ownership-evidence-from-storekit.md) on 2026-11-11. On iOS, explicit restore now syncs with the App Store and reads verified StoreKit 2 transactions through the local `StoreKitEvidence` module, which supplies app, environment, product class, stable `originalID`, revocation and a sync-based observation time. Background reads still use the conservative RevenueCat result above. StoreKit has no pending-payment list; the owner accepted the App Store's single-charge guarantee for the Apple non-consumable instead, subject to native proof. The table above remains accurate for the RevenueCat SDK itself. Checkout stays disabled; #113 enables it only after the ADR's native checks pass.

Compilation (2026-11-11): `pod install` installed `StoreKitEvidence (1.0.0)` from `modules/storekit-evidence/ios` through Expo autolinking, with no generated native file edited. An unsigned `xcodebuild -workspace ios/PocketFortune.xcworkspace -scheme PocketFortune -configuration Release -sdk iphoneos CODE_SIGNING_ALLOWED=NO build` on Xcode 27.2 finished with **BUILD SUCCEEDED**, and the binary contains the `StoreKitEvidenceModule` symbols. A simulator Debug link in the same reused build folder failed on React Native core symbols, outside this module; it was not pursued. A later review added an `OnDestroy` handler that cancels the update listener; it uses the same ExpoModulesCore closure form as the compiled `OnStopObserving` but has not been recompiled, because the shared Mac build folders were cleared for disk space. No StoreKit read, sync or transaction has run on a device yet. Those are the native checks in the ADR.

Sources for the pinned release:

- [React Native 10.16.0 API implementation](https://github.com/RevenueCat/react-native-purchases/blob/10.16.0/src/purchases.ts): getCustomerInfo, invalidation, listener registration/removal, configuration and product reads.
- [TypeScript internal 19.17.0 CustomerInfo](https://github.com/RevenueCat/purchases-hybrid-common/blob/19.17.0/typescript/src/customerInfo.ts): observation, entitlement and transaction fields.
- [RevenueCat caching](https://www.revenuecat.com/docs/test-and-launch/debugging/caching) and [trusted entitlements](https://www.revenuecat.com/docs/entitlements/trusted-entitlements).
- [Permanent products and refunds](https://www.revenuecat.com/docs/platform-resources/non-subscriptions) and [Android non-consumable setup](https://www.revenuecat.com/docs/getting-started/entitlements/android-products#add-non-consumable-products).
- [Expo 58](https://docs.expo.dev/versions/v58.0.0/) and [RevenueCat Expo integration](https://www.revenuecat.com/docs/getting-started/installation/expo): native development builds are required.

## Configuration ownership

Device composition lazily imports the native SDK only for valid configuration when Game initializes billing. One process runtime owns configuration; competing configuration and an SDK already configured elsewhere are rejected. Each Game has a removable listener. Disposal removes its subscription without logout, identity reset or reconfiguration. SDK-generated anonymous identity is persisted by the existing purchase identity transaction outside Reset Save. A mismatch rejects reads; it never logs in with a stored anonymous identifier. SDK waits use the Game's existing two-second bounds per operation, not a network prerequisite for free play.

## Native acceptance record

Current source pins: Expo 58.0.24, React Native 0.88.1, core react-native-purchases **10.16.0**, PurchasesHybridCommon **19.17.0** on both platforms, Apple RevenueCat **5.99.0**, Android Purchases **10.30.0**, Play Billing **8.3.0**. Expo and its required patch-level package updates were applied on 2026-11-11 after Expo Doctor's online compatibility check rejected the previous Expo 58.0.23 baseline. Historical binaries below used their recorded versions; they are not native proof of the updated baseline. Core and JS dependencies are locked by bun.lock; native versions listed here come from upstream exact dependency declarations. Resolved native graphs and compilation results are recorded below; source declarations alone are not build proof.

The core autolinks with Expo prebuild. `plugins/withRevenueCatPins.ts` pins the Android hybrid, Purchases and Play Billing dependencies through generated Gradle configuration; Apple hybrid and RevenueCat dependencies are already exact in the upstream podspecs. No hand-edited native project is required. Run `bun install --frozen-lockfile`, `bunx expo prebuild --clean`, then build both native projects. Never use Expo Go. This integration requires a new binary, not an OTA update.

Outstanding native gates: Google SDK configuration and metadata, provider cache/failure/freshness probes, native offline launch, and actual store transaction acceptance. Clean iOS/Android compilation and resolved dependency evidence passed as recorded below. The owner subsequently supplied the Apple public SDK key and confirmed the product/entitlement mapping; native iOS configuration and product metadata reads passed on 2026-11-10 as recorded in the later probe. Actual store acceptance is unverified. Simulators, compilation and injected fake results do not prove App Store sandbox or Play license-testing acceptance. Store account setup, agreements, signing, product-to-entitlement mappings and permanent non-consumable designation must be confirmed before probes. No real purchase, refund, pending payment, restore or cross-device claim is made by this slice.


### Compilation evidence (2026-11-09)

- Mac: Xcode 27.2 (27B52), CocoaPods 1.17.0, Node 26.10.0, Bun 1.4.0, Java Liberica 21. Local checks use Bun 1.4.3.
- Clean Expo prebuild succeeded on both platforms with the pinned JS dependencies. No generated native source was edited.
- iOS: `pod install --repo-update` succeeded. Podfile.lock resolved RNPurchases 10.16.0 → PurchasesHybridCommon 19.17.0 → RevenueCat 5.99.0. `xcodebuild -workspace ios/PocketMogul.xcworkspace -scheme PocketMogul -configuration Debug -sdk iphonesimulator -destination id=E82EDCD6-2116-484E-AE23-6C89F2CE4B46 -derivedDataPath /tmp/pm112-derived CODE_SIGNING_ALLOWED=NO build` finished with **BUILD SUCCEEDED**. This is an unsigned simulator development binary, not store acceptance.
- SDK 11.0.1 was rejected during compatibility validation: its required PurchasesHybridCommon 20.4.0 was unavailable from CocoaPods even after updating the index. The committed pin is 10.16.0, with published native dependencies.
- Automated evidence: Game tests cover invalid/unsupported configuration without loading the SDK, localized metadata, disabled checkout, native configuration ownership, identity mismatch, removable listeners, bounded startup, offline taps, retained access and guards, Reset Save, and unchanged ordinary Offline settlement/Return summary through outages and reconciliation. Independent reviews found no unsafe ownership authority or checkout enablement.

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
