@echo off
REM ============================================================
REM  Clearspring - build the Android app
REM
REM  Double-click this. It installs what's needed, creates the
REM  Android project, and opens Android Studio.
REM
REM  You need first:
REM    - Node.js 22+     https://nodejs.org  (the LTS button)
REM    - Android Studio  https://developer.android.com/studio
REM  Optional, put next to this file before running:
REM    - google-services.json  (from Firebase, for notifications)
REM ============================================================

title Clearspring - Android build
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   [X] Node.js isn't installed.
  echo       Get it from https://nodejs.org - choose the LTS version,
  echo       then run this again.
  echo.
  pause
  exit /b 1
)

for /f %%v in ('node -p "process.versions.node.split('.')[0]"') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 22 (
  echo.
  echo   [X] Node.js %NODE_MAJOR% is too old. Capacitor 8 needs 22 or newer.
  echo       Get the LTS version from https://nodejs.org
  echo.
  pause
  exit /b 1
)

echo.
echo   Installing dependencies. First run takes a few minutes...
echo.
call npm install
if errorlevel 1 goto failed

if not exist "android" (
  echo.
  echo   Creating the Android project...
  call npx cap add android
  if errorlevel 1 goto failed
)

if exist "resources" if not exist "android\.icons-done" (
  echo.
  echo   Making the app icon and splash screen...
  call npm run icons
  if not errorlevel 1 echo done> "android\.icons-done"
)

echo.
echo   Syncing...
call npx cap sync android
if errorlevel 1 goto failed

call node prepare-android.js
if errorlevel 1 goto failed

echo.
echo   Opening Android Studio. Press the green Run button there to
echo   put the app on a phone or emulator.
echo.
call npx cap open android
goto done

:failed
echo.
echo   [X] Something failed above. The message usually says what.
echo.

:done
pause
