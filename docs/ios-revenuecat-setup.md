# Pocket Fortune: iOS and RevenueCat setup

Use one Pocket Fortune app record for sandbox testing and eventual release. The permanent iOS bundle ID and Android package are `com.chrisgocode.pocketfortune`, chosen from the owner's existing `chrisgocode` developer identity. Apple must confirm availability when registering it. The `.dev` identifiers from earlier development builds are retired.

| Field | Value |
| --- | --- |
| App Store name | Pocket Fortune Business Empire |
| App Store subtitle | Business Empire |
| Bundle ID | `com.chrisgocode.pocketfortune` |
| App Store Connect SKU | `pocket-fortune` |
| RevenueCat project | Pocket Fortune |
| RevenueCat Apple app | Pocket Fortune iOS |

## 1. Complete the Apple account prerequisites

Use an active Apple Developer Program membership. In App Store Connect → Business, complete the Paid Applications Agreement and required tax/banking information. These are required for sandbox purchase testing. Follow [RevenueCat's Apple prerequisites](https://www.revenuecat.com/docs/getting-started/entitlements/ios-products).

## 2. Register the permanent bundle ID

In Apple Developer → Certificates, Identifiers & Profiles → Identifiers, add an App ID for an app. Set the description to Pocket Fortune and the explicit Bundle ID to `com.chrisgocode.pocketfortune`. Follow [Apple's registration guide](https://developer.apple.com/help/account/identifiers/register-an-app-id/). If Apple rejects the identifier as unavailable, resolve that before creating the app record or uploading a binary; code and every service must agree on the identifier.

## 3. Create the App Store Connect app

In App Store Connect → Apps → + → New App, choose iOS, name Pocket Fortune Business Empire, primary language English (U.S.), the bundle ID above and SKU `pocket-fortune`. Enter Business Empire in the subtitle field when completing the listing. Choose United States only when configuring release availability. Creating the app record is preparation; public release is a later submission. Follow [Apple's app-record guide](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/).

## 4. Create the sandbox test product

Inside the app, open In-App Purchases and add a Non-Consumable. Use reference name Tax Exemption, product ID `pm_tax_exemption`, localized display name Tax Exemption and description Permanent tax exemption in-game. Complete required localization and a test price. This is the existing sandbox fixture, not an approved commercial product or price. The app remains named Pocket Fortune. See [Apple product setup](https://www.revenuecat.com/docs/getting-started/entitlements/ios-products).

## 5. Connect the Apple app to RevenueCat

Create or rename the RevenueCat project to Pocket Fortune. Under Apps, add an Apple App Store app named Pocket Fortune iOS using `com.chrisgocode.pocketfortune`.

In App Store Connect → Users and Access → Integrations → In-App Purchase, generate an In-App Purchase key named RevenueCat Pocket Fortune. Download its original `.p8` file once, keep it securely, and upload it directly into RevenueCat's In-App Purchase key configuration. Enter its Key ID and Issuer ID where requested, save and check credential validation. This is the required StoreKit 2 credential. See [RevenueCat's key instructions](https://www.revenuecat.com/docs/service-credentials/itunesconnect-app-specific-shared-secret/in-app-purchase-key-configuration).

For automatic product imports, also configure the optional App Store Connect API key: generate it under Users and Access → Integrations → App Store Connect API with at least App Manager access, and upload its original `AuthKey_*.p8` file to RevenueCat's separate App Store Connect API section. Follow [the API-key instructions](https://www.revenuecat.com/docs/service-credentials/itunesconnect-app-specific-shared-secret/app-store-connect-api-key-configuration). It is a different key from the In-App Purchase key. RevenueCat's [credential reference](https://www.revenuecat.com/docs/service-credentials/itunesconnect-app-specific-shared-secret) describes the shared secret as a legacy StoreKit 1 requirement; this app uses StoreKit 2.

## 6. Add the product and entitlement

In RevenueCat → Product catalog → Products, import or manually add the Apple product with exact ID `pm_tax_exemption` and Non-Consumable type. Under Entitlements, create `pm_tax_exemption` and attach that Apple product. The current read-only integration fetches products directly by ID, so it does not require an Offering or paywall. See [the entitlement guide](https://www.revenuecat.com/docs/getting-started/entitlements).

## 7. Prepare the sandbox tester and public SDK key

Create a Sandbox Apple Account in App Store Connect → Users and Access → Sandbox, using an email you control and United States as its country/region. See [Apple's tester guide](https://developer.apple.com/help/app-store-connect/test-in-app-purchases/create-a-sandbox-apple-account/).

Find the Apple public SDK key beginning `appl_` in RevenueCat → API keys or the Apple app settings. Provide that public key and confirm the two exact product/entitlement IDs when configuring the binary. Private `.p8` files stay in Apple/RevenueCat and secure owner storage; they are not needed in the app or chat. See [RevenueCat's API-key guide](https://www.revenuecat.com/docs/projects/authentication).

## App configuration and remaining gates

The repository uses the same permanent identifier in app.json and the infrastructure validation allowlist. Ordinary builds still select disabled billing. Explicit `revenuecat-validation` configuration, sandbox environment and allowlisted test product mappings are still required to initialize the read-only provider. Registering the permanent app identity does not enable production billing or checkout. Existing ownership-evidence feasibility gaps and actual store acceptance remain tracked in #112 and [the evidence record](validation/revenuecat.md).

The simulator can remain shut down during account setup. New native binaries are needed before live SDK reads with the permanent identifier; generated prebuild configuration alone is not a compiled or store-tested binary.

For an explicitly configured development build, open Expo’s developer menu with a three-finger long press and select **Billing validation** to view the redacted Game report and its controls. Reading the report never syncs with the App Store, so it never shows a sign-in prompt.

## Sandbox checkout (#113)

Checkout needs a second, separate opt-in: add `"checkout": "sandbox"` to the validation configuration. Without it the report offers only **Restore purchases** and **Recover**, and Game purchases return `disabled` without contacting RevenueCat. The opt-in is accepted only for the Apple store on iOS, where the StoreKit evidence module can confirm the transaction; Android stays disabled (#118). Ordinary builds have no configuration and no controls.

Before the first sandbox purchase, confirm in the owner's accounts:

- App Store Connect: the Paid Applications Agreement is active, `pm_tax_exemption` is a Non-Consumable with a price and localization (status *Ready to Submit* is enough for sandbox), and a Sandbox Apple Account exists.
- RevenueCat: the In-App Purchase key is valid, `pm_tax_exemption` is attached to the `pm_tax_exemption` entitlement, and **Project settings → Restore behavior** is *Transfer to new App User ID* so reinstall and second-device restores work for anonymous users.
- App Store Connect → the app → App Information → App Store Server Notifications: set the Sandbox Server URL to the URL RevenueCat shows in its Apple app settings, so sandbox refunds reach RevenueCat. The Game itself reads refunds from StoreKit at the next Restore.
- On the iPhone: Settings → Developer → Sandbox Apple Account signed in with the tester. Never use a real Apple Account for these purchases.

The report's controls are **Purchase test product**, **Request refund** (Apple's refund sheet through RevenueCat's `beginRefundRequestForProduct`; sandbox approves any reason automatically, and the change reached the device after about 15 minutes; if the sheet says *Cannot Connect*, retry on another network), **Restore purchases** (the only control that calls `AppStore.sync()` and can prompt), **Recover** (background reconciliation, never prompts; since #115 it grants a signed StoreKit purchase that has no receipt yet) and **Refresh ownership** (RevenueCat cache invalidation, then Recover). Each result appears under `last`; `checkoutTrace` shows what RevenueCat and StoreKit returned for the last native checkout; `tax` shows the Game's exemption status and how many purchases granted it; `storeKit` shows the redacted latest StoreKit transaction for the product. The same actions are available from the JavaScript debugger as `pocketFortuneBillingValidation.purchase()`, `.refund()`, `.restore()` and `.recover()`.

For physical offline validation, use a development-signed standalone build with an embedded JavaScript bundle and explicit sandbox validation configuration. After Game opens, its read-only report offers **Read again** and **Continue**; a cold relaunch displays it again. This does not depend on Metro. Ordinary builds with validation configuration absent have no report or driver.

Native validation additionally offers **Refresh ownership** for controlled cache probes. It requests SDK cache invalidation, runs the Game's background Recover and repeats the Game reads and displays only the last SDK result's redacted status, provider observation time and verification label. Compare online, offline and reconnected results. Invalidation and a verified signature do not establish freshness or authoritative ownership. See the [evidence semantics](validation/revenuecat.md#explicit-configuration).

Generate the iOS project with `bunx expo prebuild --clean --platform ios`, then build the connected device target locally with Xcode. Set `EXPO_PUBLIC_BILLING_VALIDATION` in the build process using the protected local configuration described in the evidence record. Select the owner's signing team and automatic signing; keep generated native projects unmodified. A command-line build can use:

```bash
xcodebuild -workspace ios/PocketFortune.xcworkspace -scheme PocketFortune \
  -configuration Release -destination 'id=<DEVICE_ID>' \
  -derivedDataPath /tmp/pocket-fortune-validation \
  DEVELOPMENT_TEAM=<TEAM_ID> CODE_SIGN_STYLE=Automatic \
  -allowProvisioningUpdates -allowProvisioningDeviceRegistration build
```

The Release configuration embeds the bundle; development signing permits installation on the registered test phone. This is a local validation artifact, not a store submission. If signing over SSH returns `errSecInternalComponent` while the certificate validates and local Keychain Access already permits codesign, try the same build from Terminal in the owner's logged-in Mac session. Keep passwords in local system prompts.
