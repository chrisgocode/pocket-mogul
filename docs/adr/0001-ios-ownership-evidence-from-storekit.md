# 1. iOS ownership evidence comes from StoreKit 2, checkout stays with RevenueCat

- Status: **Accepted** by the owner on 2026-11-11 (#124), including the custom native module and the three contract changes. Checkout stays disabled until the validation below passes in #113.
- Context issues: #111 (parent), #112 (negative feasibility result), #124 (this decision), #113 (blocked checkout).

## Context

The Game delivers access and clears a checkout guard only from ownership evidence that is `authoritative`, `complete` and observed no earlier than the guard (`validatedInventory` in `src/application/purchaseDelivery.ts`). It clears a guard only when the evidence also lists pending payments and the product is absent from that list (`updateGuard` in `src/application/purchaseOperations.ts`). Removals must be explicit and scoped.

#112 showed that the pinned RevenueCat React Native SDK cannot supply this ([validation record](../validation/revenuecat.md#sdk-evidence-and-blocking-gaps)). `CustomerInfo` has no fresh-only read, no app/bundle scope on transactions, no product class, no explicit refund record and no pending-payment list. A verified signature and a newer `requestDate` do not fill those gaps.

On iOS the store itself keeps a signed, per-app record of every transaction on the device. StoreKit 2 exposes it to the app without a server and without finishing anything.

## Decision

Add a small **read-only StoreKit 2 evidence module** for iOS and build `OwnershipResult` from it. RevenueCat keeps checkout, its anonymous identity and transaction completion. The two meet only inside the infrastructure adapter.

1. **Custom native API (explicitly excluded by #112, needs this approval).** A local Expo module, `modules/storekit-evidence`, written in Swift with the Expo Modules API and autolinked through prebuild. It exposes four calls and nothing else:
   - `entitlements()`: verified records from `Transaction.currentEntitlements`.
   - `latest(productId)`: the verified record from `Transaction.latest(for:)`, including a revoked one.
   - `sync()`: `AppStore.sync()`. It shows an App Store sign-in prompt, so only an explicit tester action may call it.
   - `addUpdatesListener` / remove: fires on `Transaction.updates`, carrying no data. The Game treats it like every other ownership callback: it asks for reconciliation and grants nothing.

   Each record is plain data: `originalId`, `productId`, `productType`, `appBundleId`, `environment`, `ownershipType`, `signedDateMs`, `revocationDateMs`, and whether StoreKit verified the JWS. The module never calls `finish()`, never purchases and never reads `appAccountToken`. The module returns every record with its verification flag; if any record in a read is unverified, the adapter reports the whole read as `verificationFailed` and grants, clears and removes nothing. Android has no implementation; it stays deferred in #118 and reports `unavailable`.

2. **Contract change: freshness comes only from a sync inside the same request.** `BillingPort.restore()` reads the injected clock, calls `sync()`, and only if that sync succeeds reads `entitlements()` and `latest()`. It returns `authoritative`, `complete`, with `observedAtMs` equal to the clock time read just *before* the sync started. That time is never earlier than the Game's own request start, so the existing check (`observedAtMs` no earlier than the request) still decides freshness. `currentOwnership()` never syncs or reads StoreKit; it keeps returning RevenueCat's `cached`, `incomplete` result, which the Game ignores, as it does today. A failed or timed-out sync yields `unavailable`.

3. **Contract change: pending-payment absence on Apple.** StoreKit has no list of pending (Ask to Buy) payments; a pending purchase appears only later through `Transaction.updates`. The adapter will still never return `pendingProductIds`. Instead the purchase policy marks a product `duplicateCharge: 'storePrevents'` when the store will not charge an Apple ID twice for a non-consumable it already owns or has already requested. For such a product only, `updateGuard` may clear a guard when fresh authoritative complete evidence shows no ownership, without a pending list. Raw-store, Google and any other product classes keep the current rule. This is the one place the existing duplicate-charge protection is replaced by a store guarantee, so that guarantee must be proven natively before checkout is enabled (see Validation).

4. **Contract change: an interactive bound for checkout and restore.** Both show a native App Store sheet (Face ID, password or sign-in), which never finishes inside the existing two-second bound. With that bound every real checkout and restore would time out, and the late result could only be recovered by a background read, which cannot be fresh. `purchase()` and `restore()` therefore get a named interactive bound of five minutes on the injected clock. Initialization, products, `currentOwnership()` and completion keep two seconds, so launch, foreground and callbacks never wait on a sheet or prompt. A timeout still returns `unavailable`, keeps the guard, never cancels the native sheet, and late results stay ignored. Free commands stay responsive because provider work is outside the commit queue.

5. **Purchase confirmation.** After RevenueCat reports a completed purchase, the adapter reads `latest(productId)` and returns `completed` only if that record passes every check in the table below. RevenueCat's result alone never grants anything. This is #113's work, listed here so the evidence path is complete.

## Requirement mapping

| Requirement | Source field | Guarantee | Rule |
| --- | --- | --- | --- |
| Fresh response | Successful `AppStore.sync()` | Apple: sync "force[s] the app to obtain transaction information … from the App Store" | `authoritative` only after a successful sync in this process; otherwise `cached`. |
| Observation time | Injected clock read before `sync()` starts | Lower bound on the store state confirmed by that sync | `observedAtMs`. Never `signedDate`, never completion time. |
| Store scope | Module is iOS-only StoreKit | Records come from the App Store | `store: 'apple'`. |
| App scope | `Transaction.appBundleID` | Signed in the verified JWS | Must equal the configured `appId`, or the record grants nothing. |
| Environment scope | `Transaction.environment` (iOS 16+) | Signed in the verified JWS | `sandbox` or `production` must equal the configured environment. `xcode` (local StoreKit config) is rejected. |
| Signature | `VerificationResult.verified` | StoreKit verified the JWS on device | `unverified` → `verificationFailed`. |
| Product classification | `Transaction.productType` | Signed | Only `.nonConsumable` → `productClass: 'nonConsumable'`. Others grant nothing. |
| Stable scoped identity | `Transaction.originalID` | Apple: `id` differs on restore, `originalID` does not | `purchaseId = originalID`, scoped by store, app and environment. Never RevenueCat IDs or dates. |
| Ownership source | `Transaction.ownershipType` | Signed | Only `purchased`. `familyShared` grants nothing for the sandbox fixture. |
| Complete inventory | `Transaction.currentEntitlements` | Apple: one transaction per owned non-consumable; refunded or revoked products are excluded | Complete for authorized non-consumables, only when fresh as above. |
| Explicit removal | `Transaction.latest(for:)` with `revocationDate` | Apple: set when refunded, revoked from Family Sharing or lost through an organization | A verified, scoped, revoked latest record becomes a named removal. Absence from entitlements alone is never a removal. |
| Pending-payment absence | None in StoreKit | Apple stops a second charge for an owned non-consumable (to be proven) | Decision 3: guard clears only for `storePrevents` products after fresh complete absence. |
| Completion | RevenueCat-managed `finish()` | Module has no finish path | `completion.owner: 'provider'` with `verification.source: 'store'`. `acceptsPurchase` currently pairs provider completion only with provider verification; it will also accept store verification. Application completion still requires store verification and `finish`. |

## Considered alternatives

- **Privileged backend reading the RevenueCat REST API.** It needs a secret key, hosting and auth for anonymous players. RevenueCat's subscriber record still has no bundle scope, no explicit refund record and no pending list, so it would close fewer gaps than StoreKit at much higher cost.
- **Treat StoreKit's automatic updates as fresh, timestamped at read time.** Apple says StoreKit keeps this data current, but gives no observation time. Stamping a cached read with the time it was read redates cached data, which the contract forbids.
- **Keep two seconds and let a late sync make later background reads fresh.** The Game rejects evidence observed before a read was requested, so a sync that finished earlier can never make a later read fresh without loosening that rule for every read.
- **Use `signedDate` as the observation time.** It says when Apple signed one transaction, not when the inventory was last confirmed, and an empty inventory has none.
- **Keep checkout blocked.** Valid if the owner rejects both contract changes. #113 stays blocked.

## Consequences

- One more native dependency to keep compiling on each Expo SDK upgrade. It lives in the repo, so clean prebuild still reproduces it.
- Background reads are never fresh. A failed local delivery, an interrupted checkout, an approved Ask to Buy and a refund therefore take effect at the next Restore, after the App Store prompt, not on launch or callback. Access already delivered still loads from the local ledger offline.
- While a checkout or restore sheet is open, other purchase operations queue behind it for up to five minutes.
- `PurchasePolicy` gains a `duplicateCharge` field per product. It is not saved, so the save format is unchanged.
- The minimum iOS version must be at least 16 for `Transaction.environment`.

## Validation required before #113 enables checkout

Prove each at the approved seams: Game + injected fake + native.

- Fake-backed Game tests: no authority before sync; authority after a sync that started after the guard; a sync that started before the guard does not clear it; a sync that starts and succeeds within the interactive bound is authoritative; a late success after the bound is ignored; `currentOwnership()` is never authoritative; checkout and restore use the interactive bound while other reads keep two seconds; wrong bundle, wrong environment, `xcode`, consumable, family-shared and unverified records grant nothing; revoked `latest` becomes a removal and stale callbacks cannot re-grant; the `storePrevents` guard rule clears only after fresh complete absence and never for other products; outages keep access and guards.
- Native, on a physical iPhone with an App Store sandbox account: the module reads the authorized product with the expected fields; sync prompts only from Restore; purchase while owned does not charge again; an Ask to Buy request made twice, then approved, produces one transaction and one charge; a sandbox refund appears as `revocationDate` and drops out of entitlements; reading never finishes a transaction RevenueCat has not finished.
- If the native duplicate-charge checks fail, Decision 3 is void and checkout stays blocked.
