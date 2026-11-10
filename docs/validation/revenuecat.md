# RevenueCat validation (#112)

This is a read-only feasibility build for #111. Checkout is disabled, including direct calls through Game. No commercial product is authorized. No save or economy format changes are needed.

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

## SDK evidence and blocking gaps

Evidence below is source/API inspection of the pinned release, not a successful native transaction or live freshness probe.

| Contract requirement | Concrete SDK surface | Decision in this build |
| --- | --- | --- |
| Fresh-only read | `Purchases.getCustomerInfo()` takes no fetch policy. `invalidateCustomerInfoCache()` invalidates cache but is not a fresh-only response guarantee. Listener notifications also carry CustomerInfo. | Never label a response authoritative. No cache invalidation masquerading as verification. |
| Observation time | `CustomerInfo.requestDate` is an ISO timestamp describing the provider response; `latestPurchaseDate` describes a purchase. | Preserve parsed requestDate on cached/incomplete evidence. Invalid dates are unavailable. Never substitute local completion time. |
| Signature verification | `entitlements.verification`, with informational verification enabled at configuration | FAILED becomes verificationFailed. VERIFIED does not prove scope, completeness, freshness or revocation. |
| Scope | Entitlement info has `store`, `isSandbox`, `productIdentifier`; CustomerInfo has `originalAppUserId`. | No app/bundle evidence on the transaction record. Build configuration and anonymous IDs cannot prove runtime store/app/environment. No ownership is normalized. |
| Stable transaction identity | `nonSubscriptionTransactions` contains `transactionIdentifier`, `productIdentifier`, `purchaseDate`; entitlement product identifiers are not transaction IDs. | A transaction identifier alone is insufficient to invent a scoped reference or product classification. |
| Complete permanent inventory | `allPurchasedProductIdentifiers`, `nonSubscriptionTransactions`, active/all entitlements | Purchase history and active flags do not establish a fresh complete inventory of currently valid permanent sources. Emit cached/incomplete with no ownership or removals. |
| Explicit permanent removal | No explicit permanent-refund/revocation transaction evidence on these records; server notifications affect provider state | Missing entitlements are not removal evidence. Refund mapping remains blocked. |
| Pending-payment absence | No complete pending inventory on CustomerInfo | Omit pendingProductIds, including an empty list. Never clear an unresolved checkout guard. |
| Completion | Default RevenueCat-managed completion; no observer/application completion setting | BillingPort completion owner is provider. No finish, acknowledge, consume, purchase or restorePurchases SDK method is exposed by the facade. |

The facade deliberately exposes only the fields used for conservative normalization. It stays in infrastructure, including SDK types and the deterministic fake. Game validates cached/incomplete reads as unavailable, retains committed access and unresolved guards, and performs ordinary Offline settlement independently. Adding backend evidence, custom native APIs or weakening the ownership contract is outside the approved scope. Dependent checkout work is blocked on a separately approved resolution of these gaps.

Sources for the pinned release:

- [React Native 10.16.0 API implementation](https://github.com/RevenueCat/react-native-purchases/blob/10.16.0/src/purchases.ts): getCustomerInfo, invalidation, listener registration/removal, configuration and product reads.
- [TypeScript internal 19.17.0 CustomerInfo](https://github.com/RevenueCat/purchases-hybrid-common/blob/19.17.0/typescript/src/customerInfo.ts): observation, entitlement and transaction fields.
- [RevenueCat caching](https://www.revenuecat.com/docs/test-and-launch/debugging/caching) and [trusted entitlements](https://www.revenuecat.com/docs/entitlements/trusted-entitlements).
- [Permanent products and refunds](https://www.revenuecat.com/docs/platform-resources/non-subscriptions) and [Android non-consumable setup](https://www.revenuecat.com/docs/getting-started/entitlements/android-products#add-non-consumable-products).
- [Expo 58](https://docs.expo.dev/versions/v58.0.0/) and [RevenueCat Expo integration](https://www.revenuecat.com/docs/getting-started/installation/expo): native development builds are required.

## Configuration ownership

Device composition lazily imports the native SDK only for valid configuration when Game initializes billing. One process runtime owns configuration; competing configuration and an SDK already configured elsewhere are rejected. Each Game has a removable listener. Disposal removes its subscription without logout, identity reset or reconfiguration. SDK-generated anonymous identity is persisted by the existing purchase identity transaction outside Reset Save. A mismatch rejects reads; it never logs in with a stored anonymous identifier. SDK waits use the Game's existing two-second bounds per operation, not a network prerequisite for free play.

## Native acceptance record

Source pins: Expo 58.0.23, React Native 0.88.1, core react-native-purchases **10.16.0**, PurchasesHybridCommon **19.17.0** on both platforms, Apple RevenueCat **5.99.0**, Android Purchases **10.30.0**, Play Billing **8.3.0**. Core and JS dependencies are locked by bun.lock; native versions listed here come from upstream exact dependency declarations. Resolved native graphs and compilation results are recorded below; source declarations alone are not build proof.

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
