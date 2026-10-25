# Getting Clearspring into the App Store and Google Play

A step-by-step launch plan. Do the steps in order: some take days of waiting
on Apple, Google or Dun & Bradstreet, so start those early.

Rules checked October 2026. Stores change their rules, so check anything
marked ⚠ against the store's own page on the day.

---

## Start here: from no accounts to both stores

Expect about 3–5 weeks to the first submission, mostly waiting on
Dun & Bradstreet, Apple and Google. The app, the build workflow, icons,
store screenshots (`docs/store/screenshots/`), listing text and privacy
answers are ready.

1. **Week 1:** confirm the church's legal name, charity number and address;
   make a shared apps@ email; request the D-U-N-S number (free, about 5 + 2
   working days); set up Firebase; check the KJV with Cambridge University
   Press. Push this code to a branch named `app-build-test` (any name
   starting `app-build`): GitHub then runs a **check build** of both apps
   with no accounts or secrets, and the test `.apk` can be installed on any
   Android phone from the run's Artifacts.
2. **Weeks 2–3 (D-U-N-S arrived):** Apple fee waiver request, then Apple
   enrolment ($99 a year unless waived); Play Console ($25 once); Android
   upload key and GitHub secrets; reviewer account.
3. **Weeks 3–5:** run *App builds* with version 1.0.0; Play internal test,
   then production; TestFlight, then submit to Apple.

---

## 0. The decisions to make first

**Whose name goes on the app.** Publish as **Clearspring Church (the
CIO)**, not as you personally. That means:

- the store listing says "Clearspring Church", which is what people expect;
- Google doesn't make organisation accounts run the 14-day, 12-tester closed
  test that personal accounts must ⚠;
- Apple can waive the yearly fee for a charity (below);
- if you step back, the church keeps the app.

Both stores need a **D-U-N-S number** to verify an organisation. It's free
from Dun & Bradstreet. Apple has a lookup and request form at
developer.apple.com/enroll/duns-lookup. It usually takes 5–14 working days,
so **request it today**. You'll need the CIO's legal name, address and
charity number exactly as on the Charity Commission register.

**Which email to use.** Make a shared church address (for example
apps@…) for both developer accounts, so access doesn't depend on one person.

**Giving.** On iPhone the app sends people to Safari to give; they never
pay inside the app (Apple guideline 3.2.2). This is already built. If the
church later becomes an Apple-approved nonprofit, in-app Apple Pay giving
becomes possible, but it isn't needed.

**The KJV.** In the UK the King James Version is under Crown copyright,
which Cambridge University Press looks after. The app shows it. Either email
CUP's Bible permissions team to confirm it's fine for a free church app (it
usually is, with their wording in the copyright line), or remove `kjv` from
`_LOCAL_BIBLES` in `bible_sources.py` before you submit.

---

## 1. Accounts (start now, they take the longest)

### Apple Developer Program

1. Get the D-U-N-S number (above).
2. Enrol at developer.apple.com/programs/enroll as an **Organisation**,
   signing in with a church Apple Account that has two-factor authentication.
   Apple phones to check that you're allowed to sign for the church.
3. **Fee waiver:** registered charities can ask Apple to waive the $99 yearly
   fee (developer.apple.com/support/membership-fee-waivers). Apply before you
   pay. To qualify, the church must be a recognised nonprofit legal entity
   (a CIO is), and the app must be free with no paid digital content.

### Google Play Console

1. Sign up at play.google.com/console as an **Organisation** ($25 once). It
   asks for the D-U-N-S number, a website, and a phone number and email that
   it verifies.
2. Identity checks usually take a few days.

### Firebase (notifications)

Follow **native/README.md → Push notifications**. When you've finished,
Admin → Status → "Native app notifications" says *Working*.

---

## 2. Build the apps

There are two ways to do this. Pick whichever suits you.

**A. On GitHub's computers (no Mac needed).** Add these under the repo's
**Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Where it comes from |
|---|---|
| `GOOGLE_SERVICES_JSON` | the whole `google-services.json` from Firebase |
| `GOOGLE_SERVICE_INFO_PLIST` | the whole `GoogleService-Info.plist` from Firebase |
| `ANDROID_KEYSTORE_BASE64` | your upload key (see below), base64-encoded |
| `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` | chosen when you made the upload key |
| `APPLE_TEAM_ID` | developer.apple.com → Membership → Team ID (10 characters) |
| `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` | App Store Connect → Users and Access → Integrations → App Store Connect API → generate a key with **Admin** access; paste the .p8 file's text into `ASC_KEY_P8` |

To make the **Android upload key**, open Android Studio once and choose
Build → Generate Signed Bundle → Android App Bundle → Create new. Keep the
`.jks` file and its passwords somewhere safe (the church password manager).
On Windows PowerShell, this copies it as base64:
`[Convert]::ToBase64String([IO.File]::ReadAllBytes("upload.jks")) | Set-Clipboard`.
Google signs the app itself (Play App Signing), so if this key is ever lost,
Google can reset it.

Then go to **Actions → App builds → Run workflow** and enter a version
(start with 1.0.0). The build number goes up by itself each run.

**B. On your own computer:** run `native/build-android.bat` (Windows) or
`native/build-ios.sh` (Mac), then use Android Studio's *Generate Signed
Bundle* or Xcode's *Product → Archive*.

---

## 3. Before you submit: make the reviewers' job easy

Apple's biggest risk for this app is **guideline 4.2, "minimum
functionality"**: Apple turns down apps that are just a website in a frame.
Clearspring is more than that, but the reviewer needs to see it within two
minutes. The app now has:

- a real offline screen with a *Try again* button, and offline Bible
  reading, saved chapters and saved audio (iOS service worker enabled);
- native notifications, the share sheet, the audio Bible on the lock
  screen, the Android back button, and links that open in the app;
- nothing that says "add to home screen" or points elsewhere to install.

**Make a reviewer account.** Sign up in the app with
`appreview@<church domain>` and a strong password. Join it to a test group
with a few friendly posts, so the reviewer sees groups working. Put the email
and password in the review notes of both stores. Keep that account; every
update gets reviewed.

**Review notes (Apple → App Review Information → Notes).** Something like:

> Clearspring is the app for Clearspring Church, Cheltenham (registered
> charity no. …). Members use it to read and listen to the Bible offline
> (Bible → any chapter; Bible → Listen keeps playing with the phone locked),
> follow reading plans, watch Sunday sermons, share and pray for prayer
> requests, take part in small groups, and get notifications from the
> church. Sign in with the account above to see groups and saved notes.
> Giving opens in Safari; nothing is sold in the app. People can report and
> hide posts in groups and on the prayer wall, and delete their account from
> More → Account.

---

## 4. App Store Connect (iPhone)

1. **Apps → + → New App**: iOS, name "Clearspring" (or "Clearspring
   Church" if that's taken), primary language English (UK), bundle ID
   `uk.org.clearspring.app`, SKU `clearspring-app`.
2. **App Information:** category *Lifestyle* (secondary: *Education*).
   Content rights: say the app shows third-party content you have the rights
   to (the Bible translations and audio are public domain or licensed, and
   sermon videos are the church's own).
3. **Age rating:** answer the questionnaire honestly. The prayer wall and
   groups mean "user-generated content: yes", which is fine because
   reporting and hiding are built in. Expect a rating around 9+ or 13+ ⚠.
4. **App Privacy** (the "nutrition label"), using the answers in section 6.
   Privacy policy URL: `https://clearspringchurchapp.onrender.com/privacy`.
5. **Pricing:** free. **Availability:** UK only to begin with, or
   everywhere.
6. **Screenshots:** run
   `python tools/store_screenshots.py https://clearspringchurchapp.onrender.com`.
   It saves 6.9-inch iPhone screenshots at the exact size Apple accepts; use 3–6
   of them. The app is built for iPhone only, so no iPad screenshots are
   needed (it still runs on iPads).
7. **Description, keywords, support URL** (`…/contact`): see section 7.
8. When the build from step 2 shows under **TestFlight**, try it yourself,
   then add it to the version and **Submit for Review**. First reviews take
   about a day or two.

If Apple rejects it, the message quotes a guideline. Reply in Resolution
Center calmly, with specifics and screenshots. Rejections under 4.2 are
often reversed after an explanation like the review notes above.

---

## 5. Google Play Console (Android)

1. **Create app:** name "Clearspring", default language English (UK), App,
   Free.
2. **Set up your app** checklist (Dashboard): work through each item:
   - *Privacy policy:* `…/privacy`
   - *App access:* "All or some functionality is restricted" → give the
     reviewer account.
   - *Ads:* No ads.
   - *Content rating:* the IARC questionnaire (user-generated content: yes,
     with moderation).
   - *Target audience:* 13 and over. Avoid ticking under-13 age groups:
     that brings in the Families policy and a much stricter review.
   - *Data safety:* see section 6.
   - *Account deletion:* URL `…/privacy#delete-account`.
   - *Government app / financial features / health:* No.
3. **Store listing:** use the icon `docs/store/play-icon-512.png`, the
   feature graphic `docs/store/feature-graphic.png`, and the Android
   screenshots from `tools/store_screenshots.py`.
4. **Testing → Internal testing:** upload the `.aab`, add your own Google
   account, and install it from the link to try it.
5. **If you published as a personal account** (not recommended): Google
   requires a **closed test with at least 12 testers opted in for 14 days
   in a row** before you can apply for production ⚠. Organisation accounts
   skip this.
6. **Production → Create release**, upload the `.aab`, roll out. Reviews take
   from hours to a few days.
7. **App links:** Play Console → Test and release → **App signing** → copy
   the *App signing key certificate* SHA-256 fingerprint. Add it as
   `ANDROID_CERT_SHA256` in Render. On iPhone, add your Team ID as
   `APPLE_TEAM_ID` in Render. Then links to the site (sign-in emails, shared
   verses) open in the app.

---

## 6. Privacy answers (both stores)

The app has no ads, no analytics and no tracking. Here's what it collects,
and why:

| Data | Collected? | Linked to the person? | Why |
|---|---|---|---|
| Name, email | Yes, if they make an account | Yes | Account, sign-in emails |
| User content (prayer requests, group posts, notes, journal) | Yes | Yes when signed in | App functionality |
| Device ID (the notification token) | Yes, if notifications are on | No | Sending notifications |
| Other user content (game scores) | Yes, if they enter the leaderboard | Yes | Leaderboards |
| Location, contacts, health, financial info, browsing history, purchases | No | — | — |

For both stores:

- **Tracking:** none.
- **Data sold or shared for advertising:** none.
- **Encrypted in transit:** yes (HTTPS).
- **People can ask for deletion:** yes, in the app.
- **Payments:** card details go to Stewardship in the browser, not through
  the app, so the app doesn't collect financial information.

---

## 7. Listing text (edit to taste)

**Subtitle (Apple, 30 characters):** Bible, prayer and church life

**Short description (Play, 80 characters):** The Clearspring Church app:
read and listen to the Bible, pray, watch and connect.

**Description:**

> The app for Clearspring Church, Cheltenham. Everything you need to
> follow Jesus through the week, in one place.
>
> • Read the Bible in many translations, offline, with study notes,
>   commentaries and a library of classic books.
> • Listen to the whole Bible read aloud. It carries on chapter after chapter
>   with your phone locked.
> • Follow reading plans and keep a journal, highlights and notes.
> • Watch Sunday's sermon and catch up on series.
> • Share prayer requests and pray for others. Keep your own prayer list.
> • Join your small group: posts, prayer and plans together.
> • Hear about what's on, with notifications you choose.
> • Games for kids, made by people in the church.
>
> Free, with no adverts and no tracking.

**Keywords (Apple, 100 characters):**
bible,church,prayer,cheltenham,audio bible,sermons,devotional,reading plan,christian,faith

---

## 8. After launch

- **Website changes reach the app straight away.** The app loads the live
  site, so deploying to Render updates everyone. You only need a new store
  build for changes to the native shell: plugins, icons, or
  `capacitor.config.json`.
- **Yearly upkeep:** Google requires apps to target a recent Android version
  (API 36 from 31 Aug 2026 ⚠), and Apple a recent Xcode. Once a year, bump
  Capacitor (`npm install @capacitor/cli@latest @capacitor/core@latest …`),
  run the GitHub build, and submit an update.
- **Reports:** reported prayer requests are held off the wall. Check
  Admin → Prayer regularly, because Apple expects reports to be acted on.
