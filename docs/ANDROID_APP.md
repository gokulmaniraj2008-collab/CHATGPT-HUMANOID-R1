# HUMANOID R1 Android app (Capacitor)

## First milestone

This repository now has a Capacitor Android wrapper and a GitHub Actions workflow that builds an installable **debug APK**. The existing Vercel website remains the source of truth and is not replaced.

### Important architecture choice

The first APK loads the existing production website at:

`https://chatgpt-humanoid-r1.vercel.app`

This keeps the current same-origin secure pairing cookie and existing `/api/chat` and `/api/session` endpoints working without weakening cookie security or changing the website backend.

**This is an online wrapper, not an offline app yet.** An internet connection is required, and the latest website changes appear inside the app when the website is redeployed. The APK does not yet bundle a complete offline copy of the app.

Capacitor's `server.url` setting is used deliberately for this first integration. Before a store release, review the production WebView security model and consider moving to bundled web assets plus a carefully designed native API/session bridge. Do not change the session cookie to cross-site or expose API keys just to make local bundled assets work.

## Build an APK

The workflow `.github/workflows/android-apk.yml` runs for relevant pull requests, pushes to `main`, or manually from GitHub Actions.

1. Open the repository's **Actions** tab.
2. Select **Build HUMANOID R1 Android APK**.
3. Open a successful run.
4. Download the `humanoid-r1-android-debug` artifact.
5. Extract it and install `app-debug.apk` on an Android phone. Allow installation from the file source if Android asks.

The debug APK is for testing. It is not a signed Play Store release.

## App icon and media permissions

The Android build applies a HUMANOID R1 purple launcher icon (including adaptive and round variants) and the web app manifest uses the matching SVG icon.

Only the permissions needed by current media features are declared: camera, microphone, and audio settings. Capacitor's Android WebView permission handler requests camera or microphone access when the user starts the corresponding feature; the app also explains why access is needed before opening the system prompt. No location, contacts, broad storage, or notification permission is requested because those features are not currently implemented.

## Current limitations

- Camera and microphone permission prompts must still be verified on a physical Android device, including deny and grant flows.
- AI vision image upload is not implemented by this Android wrapper.
- Push notifications, offline chat, native camera capture, and Play Store signing are future work.
- The app requires internet because it loads the production website.

## Local development

Requirements: Node.js 22+, Android Studio, Android SDK, and a compatible JDK.

```sh
npm install
npm run prepare:mobile
npx cap add android
npx cap sync android
npx cap open android
```

Do not commit signing keys, keystores, pairing codes, or API credentials.
