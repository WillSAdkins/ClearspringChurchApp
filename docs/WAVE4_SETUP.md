# Wave 4 setup: modern translations and BibleProject videos

Everything in Wave 4 is switched off until you add the keys below. Without
keys the app works exactly as before, using its free public-domain and open
translations.

## 1. ESV (Crossway): free for church use

1. Go to https://api.esv.org, create an account and choose **Create an API application**.
2. Describe it honestly: "Clearspring Church, Cheltenham app. Free, non-commercial,
   no ads." Crossway approves church and ministry apps without a separate permission letter.
3. Copy the token it gives you.
4. In Render: **Environment → Add environment variable**: `ESV_API_KEY` = the token. Save; Render redeploys.

What the app does to keep within Crossway's terms:
- shows "ESV" and Crossway's copyright line with the text, and links each page to www.esv.org;
- lists the full notice on Library → Sources → Copyrighted Bible translations;
- never shows more than 500 verses on one page and keeps no more than 500 verses in memory;
- marks ESV pages `no-store`, so they are not saved for offline reading.

Conditions to be aware of: use must stay non-commercial (an app mainly for
donations or adverts counts as commercial), must fit Crossway's doctrinal
basis, and Crossway can withdraw access at any time.

## 2. NIV, NLT, CSB, NKJV, NASB through API.Bible (optional)

1. Sign up at https://api.bible and choose the free **Starter** plan (non-commercial).
2. Add up to 3 copyrighted Bibles to your app in the API.Bible dashboard. Which
   ones are offered is up to the publishers. The app will pick up any of
   NIV, NLT, CSB, NKJV and NASB that your key can reach.
3. In Render, add `API_BIBLE_KEY` = your key.

Limits: 5,000 calls a month on Starter. The app caches each chapter for up to
30 days, which API.Bible's terms allow, so normal use stays well under that.

API.Bible asks every app to report views (FUMS). Clearspring does this from the
server, with an anonymous daily ID, so no third-party script runs on members'
phones. API.Bible's own guide suggests a browser script; if they ever ask us to
use it, it can be switched.

## 3. BibleProject videos: nothing to set up

BibleProject lets app makers link to or embed their videos without asking, as
long as they are not edited, re-hosted or put behind payment, and are credited.
The app links to bibleproject.com (it never embeds, so no YouTube tracking) and
shows "BibleProject is the author and owner of this content."

## 4. Check it worked

Open **Admin → System status**. Under features you will see:
- **ESV Bible (Crossway)**: on when `ESV_API_KEY` is set;
- **Other modern translations (API.Bible)**: lists the translations your key can reach.

Then open any chapter and look for ESV (and the others) in the translation picker.
