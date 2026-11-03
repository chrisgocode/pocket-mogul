# Research: Expo + ads stack vs. current versions (ticket 02)

Checked 2026-11-03 against primary sources (Expo docs/changelog, the react-native-google-mobile-ads repo docs and package metadata, Google AdMob docs, Hermes repo). Every claim below links to its source.

## Answer

- **Current stable Expo SDK is 58** (released 2026-10-15), with **React Native 0.88, React 19.3.0**, minimum Node 22.13.x, iOS 16.4+, Android 7+ (compileSdk 37 / targetSdk 36), Xcode 26.4+. SDK 57 (RN 0.86, React 19.2.3, released 2026-06-30) is the previous one. ([Expo SDK reference](https://docs.expo.dev/versions/latest/), [Expo changelog](https://expo.dev/changelog), [SDK 58 post](https://expo.dev/changelog/sdk-58))
- **Every library in §2 still fits SDK 58.** No library needs replacing. Some items need sharper wording:
  - **react-native-google-mobile-ads v17.4.0** (2026-10-21) requires RN ≥ 0.86, the New Architecture, iOS 15.1 and Android minSdk 24. SDK 58 meets all four. The library ships an Expo config plugin. It **cannot run in Expo Go**, so it needs a development build.
  - **expo-sqlite** `withExclusiveTransactionAsync` still exists and works as §14 describes. It is native-only. Any other async write that runs during the transaction **aborts with `database is locked`**. Bind parameters **do not accept `bigint`**.
  - **Hermes supports BigInt.**
  - **Expo Router** JS tabs are bundled in SDK 56+. Native tabs are stable in SDK 58 at `expo-router/native-tabs`, with a **5-tab maximum on Android**. The spec has exactly five tabs.
  - **jest-expo on SDK 58 requires Jest 30.** `react-test-renderer` is deprecated, and React Native Testing Library is the recommended library.
- **The ad init order is UMP consent → ATT → `mobileAds().initialize()` → load.** The SDK is initialized only when `canRequestAds` is true. The spec only says "documented consent and privacy sequence" and should state this order explicitly.

## Spec changes recommended

| § | Current text | Suggested change |
|---|---|---|
| 2 | "At setup, select the current stable Expo SDK and its supported React Native and React versions." | Keep, and add the baseline checked on 2026-11-03: "Expo SDK 58 (RN 0.88, React 19.3.0, Node ≥ 22.13). react-native-google-mobile-ads ^17.4 requires RN ≥ 0.86, the New Architecture, iOS ≥ 15.1 and Android minSdk ≥ 24. SDK 58 meets all of these. If you start on SDK 57, the minimum is RN 0.86." |
| 2 | "Expo Go may support early UI work, but acceptance testing uses development or release builds." | "Expo Go cannot load react-native-google-mobile-ads, which has native code. The store version of Expo Go also supports only the newest SDK. Use a development build (`expo-dev-client`) from the first build. If Expo Go is used at all, the ad adapter must choose the mock adapter without importing the native module." |
| 2 | Native development row: "Expo development builds with expo-dev-client" | Add: "Rebuild the development build after installing native modules, changing config-plugin options, or upgrading the SDK. iOS builds need macOS/Xcode or EAS Build (the working machine is Linux)." |
| 2 | Rewarded ads row: "react-native-google-mobile-ads behind an adapter" | "react-native-google-mobile-ads ^17.4 via its Expo config plugin (`androidAppId`, `iosAppId`, `userTrackingUsageDescription`, `skAdNetworkItems`). Add `expo-tracking-transparency` only if ATT is requested manually instead of through UMP's IDFA explainer." |
| 2 | Navigation: "Expo Router … Five main tabs and nested detail screens" | Add: "Put a Stack inside each tab for detail screens. Keep Goals and Settings as header-launched routes, not tabs: Android native tabs allow at most five." Optionally name the choice: JS `Tabs` from `expo-router`, or `NativeTabs` from `expo-router/native-tabs` (SDK 58+). |
| 2 | Unit tests: "Jest with jest-expo and React Native Testing Library" | Add: "Jest 30 (required by jest-expo on SDK 58). Do not use react-test-renderer." |
| 2 | "Verify BigInt behavior on both native targets during the first build." | Keep. Add: "Hermes supports BigInt. Verify the BigInt formatting path you use (e.g. `toString()` plus a custom formatter, or `Intl.NumberFormat` with bigint) on both platforms. `JSON.stringify` throws on BigInt, so serialize with an explicit replacer or reviver." |
| 14 | "With expo-sqlite, use the transaction-scoped handle from withExclusiveTransactionAsync and parameterized queries." | Keep. Add: "Every query inside the transaction must use the `txn` object. While the exclusive transaction holds the write lock, other async writes fail with `database is locked`. Route *all* writes (including backups and migrations) through the same serialized queue, or retry on that error. expo-sqlite bind values are `string \| number \| null \| boolean \| blob`, so bind BigInt amounts as base-10 strings in TEXT columns, never as JS numbers. Enable `PRAGMA journal_mode = WAL` on open. Not available on web, which is out of scope anyway." |
| 15 | "Initialize the real SDK through its documented consent and privacy sequence" | "On every launch: (1) `AdsConsent.gatherConsent()` (UMP request-info-update, plus the form if required); (2) on iOS, the ATT prompt, either through the UMP IDFA explainer configured in AdMob or through `expo-tracking-transparency`; (3) set request configuration (test device IDs and similar); (4) `mobileAds().initialize()` only if `canRequestAds`; (5) load the rewarded ad. If consent gathering errors, still try with the previous session's consent. Do not persist the consent status yourself." |
| 15 | "Use test unit IDs during development [5]." | "Use `TestIds.REWARDED`, which is platform-aware. On physical devices, also register hashed test device IDs before `initialize()`." |
| 15 | "The ad adapter exposes availability, load, show, earned-reward, closed, and failed events." | Map these to SDK events: `RewardedAdEventType.LOADED`, `RewardedAdEventType.EARNED_REWARD`, `AdEventType.CLOSED`, `AdEventType.ERROR`, and optionally `AdEventType.PAID`. In v17.2+, `show()` returns a promise that **rejects** when the ad is not loaded or already showing, so treat a rejection as "failed". After CLOSED, call `load()` again. `EARNED_REWARD` is client-only. AdMob SSV exists but needs a server, which is consistent with the spec's no-backend stance. |
| 15 | "Production IDs and store declarations are owner-provided release configuration." | Add the specific declarations: the AdMob app IDs in the config plugin; the iOS `NSUserTrackingUsageDescription` (via `userTrackingUsageDescription`) and SKAdNetwork IDs; Google Play Console "App contains ads: Yes". |
| 21 | Ref 5: "React Native Google Mobile Ads and its ad format documentation…" | Link explicitly: https://docs.page/invertase/react-native-google-mobile-ads (source: https://github.com/invertase/react-native-google-mobile-ads/tree/main/docs). Update the date to 2026-11-03. |

## Details

### 1. Expo SDK version matrix

From the [Expo SDK reference (v58.0.0)](https://docs.expo.dev/versions/latest/):

| Expo SDK | React Native | React | RN Web | Min Node |
|---|---|---|---|---|
| 58.0.0 | 0.88 | 19.3.0 | 0.21.0 | 22.13.x |
| 57.0.0 | 0.86 | 19.2.3 | 0.21.0 | 22.13.x |
| 56.0.0 | 0.85 | 19.2.3 | 0.21.0 | 20.19.x |

The platform minimums for SDK 58 are Android 7+ (compileSdk 37, targetSdk 36), iOS 16.4+, and Xcode 26.4+.

[Expo changelog](https://expo.dev/changelog) release dates are SDK 56 on 2026-05-21, SDK 57 on 2026-06-30, and SDK 58 on 2026-10-15.

Points from the [SDK 58 post](https://expo.dev/changelog/sdk-58) that matter here:
- **RN upgrade and TypeScript.** The upgrade goes from RN 0.86 to 0.88. RN 0.87's Strict TypeScript API is now the default, so deep imports from `react-native/Libraries/*` are type errors.
- **Removed APIs.** `InteractionManager` and the `Modal` `animated` prop were removed. Don't use them in the game.
- **Expo Go lag.** The store Expo Go for SDK 58 was due "within a few weeks" of release and "will support only SDK 58". Until then, `create-expo-app` produces SDK 57 projects. For SDK 58, use the `default@sdk-58` template with a development build.
- **expo-sqlite.** libSQL was removed, which does not matter for this spec. `interruptSync()` was added.
- **expo-router.** Native tabs, toolbars, loaders and similar features are now stable. Navigation core was reworked, `expo-router/react-navigation` imports may need changes, and `withLayoutContext` is deprecated in favor of `integrateWithRouter`.
- **Dev builds.** "If you use development builds with expo-dev-client: create a new development build after upgrading."
- **Android release builds.** R8 is enabled by default in Android release builds. Verify that ads and BigInt code survive minification in the release smoke test.
- **Upgrading.** Run `npx expo install expo@^58.0.0 --fix`, then `npx expo-doctor@latest`.

### 2. react-native-google-mobile-ads (RNGMA)

- **Version and requirements.**
  - The latest release is **v17.4.0 (2026-10-21)** ([releases](https://github.com/invertase/react-native-google-mobile-ads/releases)). v17.0.0 (2026-09-18) was a major release and dropped the Legacy Architecture.
  - `packages/core/package.json` gives peer deps `react-native >=0.86.0` and `expo >=47.0.0`. It bundles the native SDKs iOS GMA 13.10.0 / UMP 3.1.0 and Android GMA 25.5.0 / UMP 4.0.0 ([package.json](https://raw.githubusercontent.com/invertase/react-native-google-mobile-ads/main/packages/core/package.json)).
  - [Prerequisites](https://github.com/invertase/react-native-google-mobile-ads/blob/main/docs/prerequisites.mdx): "React Native 0.86.0 or newer", "New Architecture turned on. The Legacy Architecture is not supported.", iOS deployment target 15.1, Android `minSdkVersion` 24.
  - **Compatibility: SDK 58 (RN 0.88) and SDK 57 (RN 0.86) both qualify. SDK 56 (RN 0.85) does not.**
  - **Xcode 27 note:** some GMA/UMP resource-bundle pods inherit iOS 12.0, so the docs recommend a Podfile `post_install` clamp to 15.1. In Expo this needs a small config plugin or `expo-build-properties` if it shows up.
- **Expo config plugin and dev build.** [Install with Expo](https://github.com/invertase/react-native-google-mobile-ads/blob/main/docs/installation/expo.mdx):
  - "This package contains native code, so Expo Go cannot run it. Use a development build… usually with `expo-dev-client` or … EAS Build."
  - Install with `npx expo install react-native-google-mobile-ads` and add the plugin entry `["react-native-google-mobile-ads", { androidAppId, iosAppId, userTrackingUsageDescription, skAdNetworkItems }]`.
  - Put the IDs on the plugin only. Re-run prebuild or rebuild after changing plugin options.
  - The [v17 migration guide](https://github.com/invertase/react-native-google-mobile-ads/blob/main/docs/migration/v17.mdx) says "The Expo config plugin deliberately has no SDK version parameters."
- **Rewarded ad events.** [Rewarded ads](https://github.com/invertase/react-native-google-mobile-ads/blob/main/docs/ad-formats/rewarded.mdx):
  - Create the ad with `RewardedAd.createForAdRequest(adUnitId, opts)`, then listen with `addAdEventListener`.
  - The events are `RewardedAdEventType.LOADED`, `RewardedAdEventType.EARNED_REWARD` (with a `{amount, type}` payload), `AdEventType.CLOSED`, `AdEventType.PAID`, and `AdEventType.ERROR`. The docs also show `load()` again after `CLOSED`, and say "Complete consent and SDK initialization before calling `load()`."
  - "While the `EARNED_REWARD` event only occurs on the client, Server Side Verification (or SSV) can be used…"
  - Since v17.2, `show()` rejects its promise for not-loaded or already-showing ([migration v17](https://github.com/invertase/react-native-google-mobile-ads/blob/main/docs/migration/v17.mdx)). The `useRewardedAd` hook's `show` is "press-safe".
  - v17 adds idempotent `destroy()` and a structured error `reason`/`phase`. The legacy `code` is deprecated and will be removed in v18, so the adapter should branch on `reason`.
- **Test unit IDs.** [Testing](https://github.com/invertase/react-native-google-mobile-ads/blob/main/docs/testing.mdx):
  - `TestIds.REWARDED` is platform-aware and "selects the official Android or iOS demo unit".
  - Emulators and simulators are test devices automatically. For a physical device, register its hashed ID with `mobileAds().setRequestConfiguration({ testDeviceIdentifiers })` **before** `initialize()`.
  - Any request not confirmed as test mode can return live inventory, which creates invalid-traffic risk.
- **Consent → ATT → init order.**
  - [Initialize](https://github.com/invertase/react-native-google-mobile-ads/blob/main/docs/initialization.mdx): ads "may be preloaded … upon calling `initialize`", so consent and request flags must be set before initialization.
  - [Consent and privacy](https://github.com/invertase/react-native-google-mobile-ads/blob/main/docs/consent-basics.mdx): the Expo example runs `AdsConsent.gatherConsent()`, then `expo-tracking-transparency` `requestTrackingPermissionsAsync()` if the status is undetermined, then `if (canRequestAds) mobileAds().initialize()`.
  - [European user consent](https://github.com/invertase/react-native-google-mobile-ads/blob/main/docs/european-user-consent.mdx):
    - Request consent info "at every app launch".
    - "If an error occurs during the consent gathering process, you should still attempt to request ads. The UMP SDK uses the consent status from the previous session."
    - "Do not persist the status."
    - If an ATT message is configured in AdMob, "the UMP SDK will automatically handle the ATT alert", including an IDFA explainer.
  - Google confirms both points:
    - "You should request an update of the user's consent information at every app launch" and "Before requesting ads, use `canRequestAds`" ([AdMob iOS privacy](https://developers.google.com/admob/ios/privacy)).
    - On ATT: "We recommend waiting for the completion callback prior to loading ads", and UMP can "trigger an IDFA explainer" ([AdMob iOS 14+/ATT](https://developers.google.com/admob/ios/ios14)).
  - Prerequisites also says to select "Yes, my app contains ads" in Google Play Console before release.

### 3. expo-sqlite `withExclusiveTransactionAsync`

From the [Expo SQLite docs (v58, recommended `~58.0.15`)](https://docs.expo.dev/versions/latest/sdk/sqlite/):
- Platforms are Android, iOS, macOS and tvOS. "This function is not supported on web."
- "Only queries that run within the scope function passed to `withExclusiveTransactionAsync()`" are inside the transaction. "Any queries inside the transaction must be executed on the `txn` object."
- "As long as the transaction is converted into a write transaction, the other async write queries will abort with `database is locked` error." This is the main implementation consequence for §14: backups, history writes and migrations must not race the command queue.
- `withTransactionAsync` (non-exclusive) "can be interrupted by other async queries", so §14 is right to pick the exclusive variant.
- Bind values: "`string` | `number` | `null` | `boolean` | `SQLiteBindBlobValue`". bigint is not listed, so store money as TEXT. The spec already stores BigInt as base-10 strings in JSON, so this is consistent. It also applies to any ledger or receipt columns.
- The docs recommend `PRAGMA journal_mode = WAL` on new databases.

### 4. BigInt on Hermes

- The [Hermes Features list](https://github.com/facebook/hermes/blob/main/doc/Features.md) includes "BigInt". It was announced as ongoing work in [Hermes as the default (2022)](https://reactnative.dev/blog/2022/07/08/hermes-as-the-default) and has shipped since.
- **Not verified here:** `Intl.NumberFormat.prototype.format(bigint)` and `BigInt.prototype.toLocaleString` support in Hermes on each platform. The spec's existing "verify BigInt on both native targets" step should explicitly cover the formatting path. A plain `toString()`-based formatter avoids the question.
- `JSON.stringify` throws a TypeError on BigInt values (standard JS behavior), so save serialization needs explicit string conversion. §14 already implies this.

### 5. Expo Router tabs

- The [Tabs guide](https://docs.expo.dev/router/advanced/tabs/) says the JS tabs layout (React Navigation bottom tabs) "is bundled with Expo Router" in SDK 56+. It uses a `(tabs)/_layout.tsx` wrapped in a root `Stack`, and `href: null` hides a route from the tab bar.
- [Native tabs](https://docs.expo.dev/router/advanced/native-tabs/):
  - The import is `expo-router/native-tabs` in SDK 58+; earlier SDKs use `unstable-native-tabs`.
  - "On Android, there is a limitation of having a maximum of 5 tabs in the tab bar." The spec has exactly 5, so Goals and Settings must stay header routes.
  - Native tabs don't push screens themselves: "nest a native `<Stack />` layout inside the native tabs."
- Either option fits §3. Native tabs are stable as of SDK 58 ([SDK 58 post](https://expo.dev/changelog/sdk-58)).

### 6. jest-expo

[Unit testing with Jest](https://docs.expo.dev/develop/unit-testing/):
- Install with `npx expo install jest-expo jest @types/jest --dev` and set the preset to `"jest-expo"`.
- "In SDK 58 and later, `jest-expo` requires Jest 30."
- `@testing-library/react-native` is the recommended library. "`react-test-renderer` does not support React 19 and above", so remove it.

### 7. Development builds

[Development builds intro](https://docs.expo.dev/develop/development-builds/introduction/): development builds include `expo-dev-client`. You must rebuild after "Installing or updating a library containing native code" and after "Upgrading your Expo SDK version".

## Not checked / open

- Hermes `Intl` support for formatting bigint (see §4). Verify on device.
- react-native-svg and expo-haptics: both are standard Expo SDK modules, and I found no SDK 58 breaking notes for them. Their pages were not individually re-read.
- Zod and Maestro versions were out of scope for this ticket.
