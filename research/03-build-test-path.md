# Research 03: Building and device-testing from a Linux machine

Ticket: `issues/03-research-build-test-path.md`. Spec refs: §2 (Expo dev builds, Maestro smoke tests), §18 AC28 ("Complete tap, business, rental, trade, return, and test-ad flows on iOS and Android"), §19 phase 6 gate. Sources were checked on 2026-11-03.

## Answer

- **iOS cannot be run locally from Linux.** Expo Build (EAS) can compile iOS in the cloud from any OS. But an iOS **simulator** build runs only in the iOS Simulator, which needs macOS and Xcode. An iOS **device** build needs a paid Apple Developer account ($99/yr) for signing. Expo's only path to an iPhone without a paid account is `npx expo run:ios --device`, which needs Xcode, so it is not available here.
- **Android is fully possible from Linux.** Cloud builds produce an APK that installs directly, with no Play Console account. To run it you need a physical Android phone over USB/adb, or an emulator on a host with KVM. **This machine has no `/dev/kvm`.** It is a container on a Proxmox kernel with 8 vCPU and about 5 GB RAM, so an accelerated emulator cannot run here unless the host exposes KVM. Java is also not installed, and Maestro needs Java 17+.
- **Cheapest path that satisfies AC28 with no Mac and no iPhone:** Expo **Starter plan ($19/month, for one or two months)**, using cloud CI/CD Workflows to run Maestro:
  - **iOS:** build with `ios.simulator: true` and run a `type: maestro` job on Expo's hosted iOS simulator.
  - **Android:** build `buildType: apk` and run a `maestro` job on a `linux-*-nested-virtualization` emulator runner.
  - **Cost:** about $0.05 per Maestro job plus runner minutes. macOS costs $0.075/min, so a 15-minute iOS run is about $1.20. The Linux nested-virtualization runner costs $0.020/min.
  - **Accounts:** no Apple Developer or Play Console account is needed. AdMob demo/test ad unit IDs work without an AdMob account.
  - **Evidence:** Maestro screenshots, recordings, and JUnit output.
  - **Free-plan variant:** the Free plan can produce the builds (15 Android + 15 iOS, monthly quota, low priority, 45-minute timeout). But it lists Maestro E2E jobs as "—" (not included), and you would still need a Mac to run the iOS simulator build.
- **What this path does not cover:** the §18 performance check ("representative physical device in a release build") and any manual test of real ads on hardware. For the iOS half of that you need the **Apple Developer Program ($99/yr) plus an iPhone**, with an EAS ad hoc build (100 devices/yr). For Android you need any Android phone (free, sideloaded APK). For release you need Apple $99/yr and Google Play Console ($25 one-time). New personal Play accounts must first run a closed test with **12 testers for 14 days**.
- **Caveat:** Expo's docs say "Maestro tests are in alpha" for the workflow `maestro` job. Expo does not publish Free-tier queue times; it says only "low priority".

## Options

| # | Option | iOS for AC28? | Android for AC28? | Needs | Cost | Notes |
|---|---|---|---|---|---|---|
| A | **EAS Free builds + manual install** | Simulator build only; needs a Mac to run | Yes: APK on a phone or KVM emulator | Expo account; Android phone | $0 | Free quota is "Up to 15 Android and 15 iOS builds" and resets monthly. Low priority, 45-minute timeout, no overage (builds stop until the quota resets). |
| B | **EAS Starter + Workflows `maestro` jobs (cloud simulator/emulator)** | **Yes** (hosted iOS Simulator) | **Yes** (hosted emulator, nested-virtualization Linux runner) | Expo account; GitHub repo linked (for PR triggers; `eas workflow:run` works manually) | $19/mo + $0.05/job + minutes (macOS $0.075/min, Linux nested-virtualization $0.020/min) | **Cheapest full AC28 path without hardware.** Includes $45 build credit and high-priority queue. Maestro job is alpha. |
| C | **Local Maestro on Linux + Android** | No (Maestro iOS needs Xcode simulators on macOS) | Yes | Java 17+, Android SDK, phone over adb or KVM host | $0 | Fast inner loop for Android flows. Not possible in this container (no `/dev/kvm`, no Java) unless the owner's real machine is used. |
| D | **Apple Developer Program + iPhone + EAS ad hoc build** | Yes, manual testing only (Maestro does not support physical iOS devices) | n/a | $99/yr Apple membership, iPhone UDID registered | $99/yr + device | Needed for the physical-device performance check and for TestFlight/release. Ad hoc covers up to 100 iPhones/yr; adding a device needs a rebuild. Membership can take 24–72 h before devices can be added. |
| E | **Maestro Cloud** | Yes | Yes | Maestro Cloud subscription | $250 per device per month (free trial offered) | Much more expensive than B for this scope. |
| F | **Rent or buy a Mac** (cloud Mac or used Mac) | Yes (Xcode simulator + local Maestro; free personal team for a device, with 7-day profiles and 3 devices) | Yes | Mac access | varies (not researched) | Only worth it if repeated local iOS debugging is needed. |

### Account needs by stage

| Stage | iOS | Android |
|---|---|---|
| Dev build (expo-dev-client) | Simulator: Expo account only. Device: **paid Apple Developer** (no Xcode on Linux, so no free personal team) | Expo account only; APK sideload |
| Internal test | Ad hoc (EAS internal distribution) or TestFlight: **paid Apple Developer** | APK via EAS internal distribution: **no Play account**. Play internal-testing track: Play Console ($25) |
| Release | Apple Developer $99/yr + App Store Connect | Play Console $25 one-time, identity verification, Android device verification. New personal accounts: closed test with 12 testers × 14 days before production |

## Questions for the owner

1. **Equipment:** Do you own an **iPhone**? An **Android phone**? Do you have access to any **Mac**, even occasionally?
2. **Machine:** Is there a Linux host with KVM where we can run the Android emulator, or can KVM be passed through to this container? Currently there is no `/dev/kvm` and only about 5 GB RAM.
3. **Expo:** Do you have an Expo account? Is it OK to pay for **Starter at $19/mo** for the validation period, to run Maestro on hosted iOS simulators and Android emulators? This is the cheapest full AC28 path.
4. **Apple:** Will you enrol in the **Apple Developer Program ($99/yr)** now (needed for any iPhone install, the physical-device performance check, TestFlight, and release), or defer until release? Individual or organization? Organizations need extra verification.
5. **Google:** Will you register a **Play Console** account ($25 one-time) now or at release? Personal or organization? Personal accounts face the 12-tester/14-day closed-test gate. Can you recruit 12 testers?
6. **Acceptance evidence:** Does AC28 on iOS accept **simulator** evidence (Maestro run artifacts), or must it be on a physical iPhone?
7. **Budget ceiling:** What is the monthly cap for CI and builds (for example, $0 / $20 / $50)? Should the Free-plan monthly quota (15+15 builds) be treated as a hard limit?
8. **Repo hosting:** Is the code on GitHub? Workflows' PR trigger needs the project linked to a GitHub repo.

## Sources

- Expo pricing (plans, build quotas, concurrency, queue priority, timeouts, Maestro job price, per-minute runner rates): https://expo.dev/pricing
- Expo billing FAQ (Free quota is monthly, no overages, builds unavailable until reset): https://docs.expo.dev/billing/faq/
- Expo plans (Free = "limited quantity of low-priority builds", "limits reset monthly"): https://docs.expo.dev/billing/plans/
- Create a development build ("All builds that run on an iPhone device require a paid Apple Developer account"; simulator builds can't install on devices; `expo run:ios --device` is the only path without a paid account, and it needs Xcode): https://docs.expo.dev/develop/development-builds/create-a-build/
- iOS Simulator builds (no Apple Developer account needed): https://docs.expo.dev/build-reference/simulators/
- Internal distribution (iOS ad hoc needs a paid account, 100 iPhones/yr, 24–72 h for new memberships; Android APK): https://docs.expo.dev/build/internal-distribution/
- Local builds (`eas build --local`, macOS/Linux; iOS needs fastlane/CocoaPods): https://docs.expo.dev/build-reference/local-builds/
- Workflows E2E with Maestro (build → `maestro` job, `.apk`/`.app`, GitHub link): https://docs.expo.dev/eas/workflows/examples/e2e-tests/
- Workflows pre-packaged `maestro` job ("Maestro tests are in alpha", nested-virtualization Linux runner for Android): https://docs.expo.dev/eas/workflows/pre-packaged-jobs/
- Maestro README (Java 17+, CLI on macOS/Linux/WSL, "Physical iOS devices are not yet supported"): https://github.com/mobile-dev-inc/maestro/blob/main/README.md
- Maestro iOS/QuickStart (iOS simulators via Xcode): https://docs.maestro.dev/get-started/supported-platform/ios, https://docs.maestro.dev/get-started/quickstart
- Maestro Cloud pricing ($250/device/month): https://maestro.dev/pricing
- Apple Developer Program ($99 annual membership, TestFlight, App Store distribution): https://developer.apple.com/programs/
- Apple free account vs membership (Personal Team via Xcode: 3 devices, 7-day profiles): https://developer.apple.com/support/compare-memberships/
- Google Play Console registration (US$25 one-time, identity verification): https://support.google.com/googleplay/android-developer/answer/6112435
- Play testing requirement for new personal accounts (12 testers, 14 days, accounts created after 13 Nov 2023): https://support.google.com/googleplay/android-developer/answer/14151465
- Android emulator acceleration (KVM on Linux; can't run an accelerated emulator inside another VM): https://developer.android.com/studio/run/emulator-acceleration
- AdMob test ads ("Android emulators are automatically configured as test devices"; demo ad units): https://developers.google.com/admob/android/test-ads
- Local environment check (this session): `ls /dev/kvm` → absent; `java` → not installed; 8 vCPU / ~5 GB RAM.
