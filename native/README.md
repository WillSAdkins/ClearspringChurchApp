# Clearspring — native app shell

This wraps the live Flask site at `https://clearspringchurchapp.onrender.com` in a
real iOS and Android app that can be submitted to the App Store and Google Play.

The Flask app is unchanged in how it works. The shell loads it, and
`static/native-bridge.js` detects the shell and adapts a few behaviours
(native push instead of web push, payments out to the system browser).

---

## What you need before starting

| Requirement | For | Cost |
|---|---|---|
| Apple Developer Program account | iOS | $99 (about £79) a year, free for approved nonprofits |
| Google Play Developer account | Android | $25 one-off |
| Node.js 22+ | both | free |
| Firebase project | push notifications | free |
| A Mac with Xcode 26, **or** the GitHub build | iOS | — |
| Android Studio, **or** the GitHub build | Android | — |

The whole launch, step by step (accounts, store listings, review), is in
`docs/APP_STORE_LAUNCH.md`.

### Building without a Mac or Android Studio

`.github/workflows/app-builds.yml` builds both apps on GitHub's computers.
Open the repository on GitHub → **Actions** → **App builds** → **Run
workflow**. The Android build comes back as a download (an `.aab` for Play
Console and an `.apk` to try on a phone); the iPhone build is signed and
sent straight to App Store Connect / TestFlight. The secrets it needs are
listed in the launch guide.

---

## First-time setup (on your own computer)

Windows: double-click `build-android.bat`. Mac: `bash build-ios.sh` (and
`build-android.bat`'s steps work the same in Terminal). They:

1. install Capacitor 8 and its plugins (`npm install`)
2. create the `ios/` or `android/` project if it isn't there
3. make every icon and splash size from `resources/` (`npm run icons`)
4. apply Clearspring's settings — `node prepare-ios.js` /
   `node prepare-android.js`: notifications, background audio, app links,
   offline mode, the notification icon, and the version number
5. open Xcode or Android Studio

`resources/` is made by `python tools/build_app_assets.py` from the church
wordmark; run it again if the logo changes.

---

## Opening and running

```bash
npx cap open ios       # opens Xcode
npx cap open android   # opens Android Studio
```

Build and run onto a simulator or a plugged-in device from there.

Because `server.url` points at Render, you do **not** need to rebuild the app
when you change the website. Deploy to Render and the app picks it up on next
launch. Only changes to native config or plugins need `npx cap sync` and a
resubmission.

---

## Push notifications

The web app uses VAPID web push. That API doesn't exist inside a native
webview, so the app gets a token from Firebase Cloud Messaging (Firebase
passes iPhone notifications on to Apple) and posts it to the same
`/api/push/subscribe` endpoint. The person's choices on Settings →
Notifications are sent with it.

1. Create a Firebase project at console.firebase.google.com (turn Google
   Analytics **off** when it asks — the app doesn't use it).
2. Add an iOS app and an Android app, both with the ID `uk.org.clearspring.app`.
3. Download `google-services.json` and `GoogleService-Info.plist` and put
   both in this `native/` folder. The build scripts copy them into place.
   (For the GitHub build, paste their contents into the repository secrets
   `GOOGLE_SERVICES_JSON` and `GOOGLE_SERVICE_INFO_PLIST` instead.)
4. For iPhones: in developer.apple.com → Keys, make a key with Apple Push
   Notifications service, download the .p8, and upload it in Firebase →
   Project settings → Cloud Messaging → Apple app configuration.
5. For the server: Firebase → Project settings → Service accounts →
   Generate new private key. Paste the whole JSON file into a Render
   environment variable called `FIREBASE_SERVICE_ACCOUNT`. (Remove the old
   `FCM_SERVER_KEY` if it's there: Google switched that off in 2024.)

Admin → Status shows whether it's working. Web push keeps working for
browser users; the two run side by side.

---

## Things Apple will check

**Guideline 4.2 — Minimum Functionality.** This is the real risk. Apple
rejects apps that are "just a website in a wrapper." Clearspring has a
reasonable case because it has offline Bible reading, saved verses,
notifications, games, and a prayer journal — but you must make that case in
the review notes, not assume it's obvious. Write a short paragraph in App
Store Connect listing the features that behave like an app rather than a page.

**Guideline 3.2.2 — Donations.** Unless the church is an Apple-approved
nonprofit, donations must be made outside the app. `native-bridge.js` opens
`/giving` in Safari itself on iPhone (and the in-app browser on Android).
Do not undo that.

**Sign in with Apple.** If you offer any third-party login, Apple requires
Sign in with Apple as an option too. Your magic-link email login is
first-party, so this does not currently apply.

**Privacy nutrition labels.** You collect email addresses and prayer
requests. Declare these in App Store Connect. You also need a privacy policy
URL that is reachable without logging in.

**Account deletion.** Apple requires apps with account creation to offer
in-app account deletion. Check whether `/account` has this — if not, it
needs adding before submission.

---

## Google Play notes

Play is considerably more relaxed about webview apps. The main requirements
are a privacy policy, a data safety form, and a target API level that is
current: API 36 from 31 August 2026, which Capacitor 8 targets.

Play now requires new personal developer accounts to run a 14-day closed
test with 12+ testers before production release. Organisation accounts are
exempt. A church registering as an organisation avoids this.

---

## Updating

| Changed | Action |
|---|---|
| Website content, templates, routes | Deploy to Render. Nothing else. |
| Capacitor plugins or config | `npx cap sync`, rebuild, resubmit |
| App icon or name | rebuild, resubmit |

This is the main advantage of this approach — almost all of your ongoing
work needs no store review at all.


---

## Audio Bible with the screen locked

The web app's audio Bible plays recorded MP3s through a normal audio element,
with lock-screen controls (Media Session). In Safari and Chrome, and when the
app is added to the home screen, it keeps playing with the phone locked.

Inside the native shell:

- **iOS** needs "Audio, AirPlay and Picture in Picture" background mode.
  `build-ios.sh` adds `UIBackgroundModes: audio` to `ios/App/App/Info.plist`
  for you. (In Xcode it shows under Signing & Capabilities → Background Modes.)
- **Android** keeps a playing WebView going when the screen locks, but the
  system may stop it after a while to save battery, and the WebView can't show
  lock-screen controls. If people rely on long listening in the Android app, add
  a native media plugin (for example `@capgo/capacitor-media-session` or a
  foreground-service audio plugin) in a later release.
