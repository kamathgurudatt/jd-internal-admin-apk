# JD Admin — Android APK

Private admin-only mobile app for managing JD Internal Tools from outside the office network.

---

## Prerequisites

Install ALL of these before running any commands:

| Tool | Version | Download |
|---|---|---|
| Node.js | 18 LTS or 20 LTS | https://nodejs.org |
| JDK | 17 (Zulu or Adoptium) | https://adoptium.net |
| Android Studio | Latest | https://developer.android.com/studio |
| Android SDK | API 34 + Build Tools 34 | via Android Studio SDK Manager |

After installing Android Studio:
1. Open SDK Manager (Settings → Appearance → Android SDK)
2. Install: Android 14 (API 34), Build-Tools 34.x, NDK (latest), CMake
3. Set `ANDROID_HOME` environment variable:
   - Windows: `C:\Users\<you>\AppData\Local\Android\Sdk`
   - Add to PATH: `%ANDROID_HOME%\platform-tools`

---

## First-time setup

```powershell
# 1. Initialize the React Native project (generates Android native folder)
npx @react-native-community/cli@latest init JDAdminApp --version 0.73.6

# 2. Copy source files into the new project
#    (replace App.js, index.js, add the src/ folder from this directory)

# 3. Replace package.json with the one in this directory, then install:
cd JDAdminApp
npm install

# 4. Link native modules (react-native-biometrics, react-native-encrypted-storage)
#    These auto-link with React Native 0.73+ — no manual linking needed.

# 5. For react-native-vector-icons, add to android/app/build.gradle:
#    apply from: "../../node_modules/react-native-vector-icons/fonts.gradle"
```

---

## Run on Android device / emulator

```powershell
# Start Metro bundler in one terminal
npm start

# In a second terminal — build and install debug APK
npm run android
# OR: npx react-native run-android
```

The device must have:
- USB debugging enabled (Settings → Developer Options → USB Debugging)
- OR an emulator running in Android Studio (API 26+ / Android 8.0+)

---

## Build release APK (sideload)

```powershell
# Option A — debug APK (fastest, no signing needed)
cd android
.\gradlew assembleDebug
# Output: android\app\build\outputs\apk\debug\app-debug.apk

# Option B — release APK (signed, for permanent install)
# First create a keystore (one time):
keytool -genkey -v -keystore jd-admin.keystore -alias jd-admin -keyalg RSA -keysize 2048 -validity 10000

# Add to android/gradle.properties:
# MYAPP_UPLOAD_STORE_FILE=jd-admin.keystore
# MYAPP_UPLOAD_KEY_ALIAS=jd-admin
# MYAPP_UPLOAD_STORE_PASSWORD=your_password
# MYAPP_UPLOAD_KEY_PASSWORD=your_password

# Build release:
.\gradlew assembleRelease
# Output: android\app\build\outputs\apk\release\app-release.apk
```

---

## Install APK on phone

```powershell
# Via ADB (USB cable)
adb install android\app\build\outputs\apk\debug\app-debug.apk

# Or copy the .apk to the phone and open it (enable "Install unknown apps" in Settings)
```

---

## First app launch — what to do

1. The app opens to the **Login screen**
2. Tap **Configure Server** to expand the server settings
3. Enter your **Server URL** (e.g. `https://your-api.example.com`)
4. Enter your **Bearer Token** (same token configured in server.js)
5. Tap **Save & Continue**
6. Set a **4-digit PIN** (stored encrypted on device)
7. Optionally enable **biometric** unlock in Settings

---

## Project structure

```
JDAdminApp/
├── App.js                          # Root component + AuthContext provider
├── index.js                        # Entry point
├── src/
│   ├── api/
│   │   └── client.js               # Bearer token fetch + EncryptedStorage
│   ├── context/
│   │   └── AuthContext.js          # isAuthenticated global state
│   ├── components/
│   │   ├── AppBar.js               # Top navigation bar
│   │   ├── Avatar.js               # Color-coded initials avatar
│   │   ├── Badge.js                # Status badge (admin/partial/full/restricted)
│   │   ├── ConfirmModal.js         # Bottom-sheet confirmation dialog
│   │   ├── KPICard.js              # Metric card
│   │   ├── ModuleChip.js           # Per-module access toggle chip
│   │   ├── OfflineBanner.js        # Offline indicator strip
│   │   └── UnlockBanner.js         # Pulsing Global Unlock indicator
│   ├── hooks/
│   │   └── useNetworkStatus.js     # Polls server for online/offline state
│   ├── navigation/
│   │   └── AppNavigator.js         # Stack (Login → Main tabs) + Settings modal
│   ├── screens/
│   │   ├── LoginScreen.js          # PIN + biometric + server config
│   │   ├── DashboardScreen.js      # KPIs, coverage bars, health summary
│   │   ├── AccessMatrixScreen.js   # Per-employee per-module toggles
│   │   ├── TeamDirectoryScreen.js  # Employee CRUD + IP management
│   │   ├── GlobalUnlockScreen.js   # Unlock toggle + access log
│   │   ├── SecurityScreen.js       # Scan, findings, hook status
│   │   └── SettingsScreen.js       # Server URL, token, PIN, sign out
│   └── theme/
│       └── colors.js               # JD color system
```

---

## API endpoints consumed

All requests use `Authorization: Bearer <token>`. Base URL is configurable in Settings.

| Method | Path | Screen |
|---|---|---|
| GET | `/api/employees` | Dashboard, Matrix, Team |
| GET | `/api/users` | Dashboard, Matrix, Team |
| GET | `/api/access` | Dashboard, Matrix |
| POST | `/api/access` | Matrix (toggle) |
| DELETE | `/api/access/:ip` | Matrix (revoke all) |
| POST | `/api/users` | Team (add/edit employee) |
| POST | `/api/users/:empId/ips` | Team (add IP) |
| DELETE | `/api/users/:empId/ips/:ip` | Team (remove IP) |
| DELETE | `/api/users/:empId` | Team (delete employee) |
| GET | `/api/global-unlock` | Dashboard, Unlock |
| POST | `/api/global-unlock` | Unlock |
| DELETE | `/api/unlock-log` | Unlock |
| POST | `/api/security-scan` | Security |
| GET | `/api/security-report` | Security |

---

## Security notes

- Bearer token stored in Android EncryptedSharedPreferences (tied to device Keystore)
- PIN stored encrypted via `react-native-encrypted-storage`
- Biometric uses `react-native-biometrics` (fingerprint / face unlock)
- 401 from server → token cleared → redirected to Login immediately
- Auto-lock after configurable inactivity (2 / 5 / 10 / 15 / 30 min)
- All destructive actions (delete employee, global unlock, clear log) require a confirmation modal before the API call fires
- Token and URL are never logged to console

---

## Troubleshooting

| Error | Fix |
|---|---|
| `SDK location not found` | Set `ANDROID_HOME` env var, restart terminal |
| `Command failed: gradlew` | Run `cd android && .\gradlew --version` to diagnose |
| Blank white screen on device | Check Metro is running (`npm start`), check USB debugging is on |
| Biometric not working on emulator | Enroll a fingerprint in Android Settings on the emulator first |
| `react-native-encrypted-storage` crash | Min API 26 required — ensure emulator is API 26+ |
| 401 errors from server | Verify bearer token matches what server.js expects |
