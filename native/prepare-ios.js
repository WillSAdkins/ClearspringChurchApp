#!/usr/bin/env node
/*
 * Clearspring: settings the iOS project needs that `npx cap add ios`
 * doesn't make. Run by build-ios.sh (and the GitHub build); safe to run
 * again after every `npx cap sync`.
 *
 *   node prepare-ios.js
 *
 * Optional environment variables:
 *   APP_VERSION      the version people see, e.g. 1.0.1   (default: leave as is)
 *   APP_BUILD        the build number, must go up each upload (default: leave)
 *   IPAD=1           also build for iPad (default: iPhone only, which runs
 *                    on iPads in a phone-sized window and needs no iPad
 *                    screenshots)
 */
"use strict";
const fs = require("fs");
const path = require("path");
const plist = require("plist");
const xcode = require("xcode");

const here = __dirname;
const config = JSON.parse(fs.readFileSync(path.join(here, "capacitor.config.json"), "utf8"));
const domain = new URL(config.server.url).host;
const appDir = path.join(here, "ios", "App", "App");
const pbxPath = path.join(here, "ios", "App", "App.xcodeproj", "project.pbxproj");

if (!fs.existsSync(pbxPath)) {
  console.error("  [X] No iOS project yet. Run: npx cap add ios");
  process.exit(1);
}

/* 1. AppDelegate: pass notification registration to the Firebase plugin */
const delegatePath = path.join(appDir, "AppDelegate.swift");
let delegate = fs.readFileSync(delegatePath, "utf8");
if (!delegate.includes("capacitorDidRegisterForRemoteNotifications")) {
  const hooks = `
    // Clearspring: pass push registration to the Firebase Messaging plugin.
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    func application(_ application: UIApplication, didReceiveRemoteNotification userInfo: [AnyHashable: Any], fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        NotificationCenter.default.post(name: Notification.Name.init("didReceiveRemoteNotification"), object: completionHandler, userInfo: userInfo)
    }
}
`;
  const end = delegate.lastIndexOf("}");
  delegate = delegate.slice(0, end).replace(/\s+$/, "\n") + hooks;
  fs.writeFileSync(delegatePath, delegate);
  console.log("  AppDelegate.swift: notification hooks added.");
}

/* 2. Info.plist */
const infoPath = path.join(appDir, "Info.plist");
const info = plist.parse(fs.readFileSync(infoPath, "utf8"));
const modes = new Set(info.UIBackgroundModes || []);
modes.add("audio");                 // the audio Bible keeps playing when locked
modes.add("remote-notification");
info.UIBackgroundModes = Array.from(modes);
info.WKAppBoundDomains = [domain];  // lets the site's offline features (service worker) run
info.FirebaseMessagingAutoInitEnabled = false;      // no token until notifications are turned on
info.FIREBASE_ANALYTICS_COLLECTION_ENABLED = false;
info.ITSAppUsesNonExemptEncryption = false;         // only standard HTTPS
info.CFBundleDisplayName = config.appName;
fs.writeFileSync(infoPath, plist.build(info));
console.log(`  Info.plist: background audio, notifications, offline mode (${domain}).`);

/* 3. Entitlements: notifications and app links */
const entPath = path.join(appDir, "App.entitlements");
fs.writeFileSync(entPath, plist.build({
  "aps-environment": "development",   // Xcode switches this to production when you archive
  "com.apple.developer.associated-domains": [`applinks:${domain}`, `webcredentials:${domain}`],
}));

/* 4. Project settings */
const project = xcode.project(pbxPath);
project.parseSync();
const set = (k, v) => project.updateBuildProperty(k, v, null, "App");
set("CODE_SIGN_ENTITLEMENTS", "App/App.entitlements");
set("TARGETED_DEVICE_FAMILY", process.env.IPAD === "1" ? '"1,2"' : "1");
if (process.env.APP_VERSION) set("MARKETING_VERSION", process.env.APP_VERSION);
if (process.env.APP_BUILD) set("CURRENT_PROJECT_VERSION", process.env.APP_BUILD);
if (process.env.DEVELOPMENT_TEAM) set("DEVELOPMENT_TEAM", process.env.DEVELOPMENT_TEAM);

/* 5. Firebase settings file */
const gsSrc = path.join(here, "GoogleService-Info.plist");
if (fs.existsSync(gsSrc)) {
  fs.copyFileSync(gsSrc, path.join(appDir, "GoogleService-Info.plist"));
  const already = JSON.stringify(project.pbxFileReferenceSection()).includes("GoogleService-Info.plist");
  if (!already) {
    const group = project.findPBXGroupKey({ path: "App" }) || project.findPBXGroupKey({ name: "App" });
    const target = project.getFirstTarget().uuid;
    const file = project.addFile("GoogleService-Info.plist", group, { target: target });
    if (file) {
      file.uuid = project.generateUuid();
      file.target = target;
      project.addToPbxBuildFileSection(file);
      project.addToPbxResourcesBuildPhase(file);
    }
  }
  console.log("  GoogleService-Info.plist added (notifications).");
} else {
  console.log("  [!] No GoogleService-Info.plist next to this script, so notifications");
  console.log("      won't work yet. See README.md, 'Push notifications'.");
}

fs.writeFileSync(pbxPath, project.writeSync().replace(/ explicitFileType = undefined;/g, ""));
console.log("  Xcode project: entitlements, " + (process.env.IPAD === "1" ? "iPhone and iPad" : "iPhone only") + ".");
