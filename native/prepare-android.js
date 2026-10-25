#!/usr/bin/env node
/*
 * Clearspring: settings the Android project needs that `npx cap add android`
 * doesn't make. Run by build-android.bat (and the GitHub build); safe to run
 * again after every `npx cap sync`.
 *
 *   node prepare-android.js
 *
 * Optional environment variables:
 *   APP_VERSION   the version people see, e.g. 1.0.1    (default: leave)
 *   APP_BUILD     the version code, must go up each upload (default: leave)
 */
"use strict";
const fs = require("fs");
const path = require("path");

const here = __dirname;
const config = JSON.parse(fs.readFileSync(path.join(here, "capacitor.config.json"), "utf8"));
const domain = new URL(config.server.url).host;
const app = path.join(here, "android", "app");
const res = path.join(app, "src", "main", "res");
const manifestPath = path.join(app, "src", "main", "AndroidManifest.xml");

if (!fs.existsSync(manifestPath)) {
  console.error("  [X] No Android project yet. Run: npx cap add android");
  process.exit(1);
}

/* 1. Firebase settings file */
const gs = path.join(here, "google-services.json");
if (fs.existsSync(gs)) {
  fs.copyFileSync(gs, path.join(app, "google-services.json"));
  console.log("  google-services.json copied (notifications).");
} else {
  console.log("  [!] No google-services.json next to this script, so notifications");
  console.log("      won't work yet. See README.md, 'Push notifications'.");
}

/* 2. The small white status-bar icon for notifications */
const icons = path.join(here, "resources", "android-notification");
if (fs.existsSync(icons)) {
  for (const dir of fs.readdirSync(icons)) {
    fs.mkdirSync(path.join(res, dir), { recursive: true });
    for (const f of fs.readdirSync(path.join(icons, dir))) {
      fs.copyFileSync(path.join(icons, dir, f), path.join(res, dir, f));
    }
  }
}
fs.mkdirSync(path.join(res, "values"), { recursive: true });
fs.writeFileSync(path.join(res, "values", "clearspring_colors.xml"),
  '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="clearspring_accent">#0A7269</color>\n</resources>\n');

/* 3. Manifest: notification settings and app links */
let xml = fs.readFileSync(manifestPath, "utf8");
if (!xml.includes("clearspring-native")) {
  const meta = `
        <!-- clearspring-native: notifications -->
        <meta-data android:name="com.google.firebase.messaging.default_notification_icon" android:resource="@drawable/ic_stat_clearspring" />
        <meta-data android:name="com.google.firebase.messaging.default_notification_color" android:resource="@color/clearspring_accent" />
        <meta-data android:name="firebase_messaging_auto_init_enabled" android:value="false" />
        <meta-data android:name="firebase_analytics_collection_enabled" android:value="false" />
    </application>`;
  const links = `
            <!-- clearspring-native: open links to ${domain} in the app -->
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="${domain}" />
            </intent-filter>
        </activity>`;
  xml = xml.replace(/\s*<\/application>/, meta);
  xml = xml.replace(/\s*<\/activity>/, links);   // the first activity is the app itself
  fs.writeFileSync(manifestPath, xml);
  console.log(`  AndroidManifest.xml: notifications and app links (${domain}).`);
}

/* 4. Version */
const gradlePath = path.join(app, "build.gradle");
let gradle = fs.readFileSync(gradlePath, "utf8");
if (process.env.APP_BUILD) gradle = gradle.replace(/versionCode\s+\d+/, "versionCode " + parseInt(process.env.APP_BUILD, 10));
if (process.env.APP_VERSION) gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${process.env.APP_VERSION.replace(/[^0-9A-Za-z.\-]/g, "")}"`);
fs.writeFileSync(gradlePath, gradle);
