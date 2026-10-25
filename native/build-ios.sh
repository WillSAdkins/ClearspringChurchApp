#!/bin/bash
# ============================================================
#  Clearspring — build the iOS app
#
#  Run on a Mac:   bash build-ios.sh
#
#  You need first:
#    - Xcode 26 or newer from the Mac App Store (large — start early)
#    - Node.js 22 or newer from https://nodejs.org
#  Optional, put next to this script before running:
#    - GoogleService-Info.plist  (from Firebase, for notifications)
# ============================================================

set -e
cd "$(dirname "$0")"

echo
if [ "$(uname)" != "Darwin" ]; then
  echo "  [X] iOS apps can only be built on a Mac."
  echo "      Apple requires Xcode, which is macOS only. Options:"
  echo "        - borrow a Mac"
  echo "        - a cloud Mac service (MacStadium, MacInCloud)"
  echo "        - GitHub Actions with a macOS runner"
  echo
  echo "      Android has no such restriction — use build-android.bat."
  echo
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "  [X] Node.js isn't installed. Get it from https://nodejs.org"
  echo
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 22 ]; then
  echo "  [X] Node.js $NODE_MAJOR is too old. Capacitor 8 needs 22 or newer."
  echo "      Get the LTS version from https://nodejs.org"
  echo
  exit 1
fi

echo "  Installing dependencies. First run takes a few minutes..."
echo
npm install

if [ ! -d "ios" ]; then
  echo
  echo "  Creating the iOS project..."
  npx cap add ios
fi

echo
echo "  Syncing..."
npx cap sync ios

echo
node prepare-ios.js

if [ -d "resources" ] && [ ! -f "ios/.icons-done" ]; then
  echo "  Making the app icon and splash screen..."
  npm run icons && touch ios/.icons-done
fi

echo
echo "  Opening Xcode."
echo
echo "  In Xcode:"
echo "    1. Click the project name in the left sidebar"
echo "    2. Signing & Capabilities -> pick your Apple Developer team"
echo "       (notifications, background audio and app links are already set)"
echo "    3. Choose a device or simulator at the top and press play"
echo
npx cap open ios
