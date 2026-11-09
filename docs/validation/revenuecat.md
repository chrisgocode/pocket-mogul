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
  "appId": "com.pocketmogul.dev",
  "apiKey": "appl_REPLACE",
  "productId": "pm_validation_exemption",
  "entitlementId": "pm_validation_exemption"
}
```

Android uses `store: google` and its `goog_` public key. All fields are required; unknown fields, other app IDs, production environment, platform/store/key mismatches and product/entitlement IDs outside `pm_validation_` are rejected. These explicit build mappings authorize only test metadata queries. They cannot establish runtime store scope or grant access. Ordinary artifacts must be built with the variable absent; verify disabled status in the artifact before distribution.

A valid configuration installs the test driver `await globalThis.pocketMogulBillingValidation()` in the JavaScript debugger. It uses only Game products/restore/state operations, returning localized product titles/prices, normalized ownership status and operation status. It exposes no anonymous identifier, transaction, receipt, token, raw CustomerInfo or SDK error. `restore()` here performs a read, not RevenueCat's store restoration operation. There is no purchase control. The driver's ownership result is unavailable until the existing contract can be satisfied.

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

Source pins: Expo 58.0.23, React Native 0.88.1, core react-native-purchases **10.16.0**, PurchasesHybridCommon **19.17.0** on both platforms, Apple RevenueCat **5.99.0**, Android Purchases **10.30.0**, Play Billing **8.3.0**. Core and JS dependencies are locked by bun.lock; native versions listed here come from upstream exact dependency declarations. Native resolved graphs and binary acceptance must be recorded after compilation; source declarations alone are not resolved build proof.

The core autolinks with Expo prebuild. `plugins/withRevenueCatPins.ts` pins the Android hybrid, Purchases and Play Billing dependencies through generated Gradle configuration; Apple hybrid and RevenueCat dependencies are already exact in the upstream podspecs. No hand-edited native project is required. Run `bun install --frozen-lockfile`, `bunx expo prebuild --clean`, then build both native projects. Never use Expo Go. This integration requires a new binary, not an OTA update.

Outstanding native gates: clean iOS and Android compilation, resolved dependency evidence, initialization with real public validation keys, localized metadata on each store, live cache/failure/freshness probes and offline launch. No real SDK key or authorized store product configuration has been supplied in this session. Actual store acceptance is unverified. Simulators, compilation and injected fake results do not prove App Store sandbox or Play license-testing acceptance. Store account setup, agreements, signing, product-to-entitlement mappings and permanent non-consumable designation must be confirmed before probes. No real purchase, refund, pending payment, restore or cross-device claim is made by this slice.
