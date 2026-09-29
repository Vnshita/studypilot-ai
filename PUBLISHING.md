# Publishing Alcove Study to the App Stores

The app ships as a PWA (installable directly from the browser) and as native
wrappers for Google Play and the Apple App Store via Capacitor. Everything
below happens **outside this environment** — you need Android Studio, Xcode,
and paid developer accounts.

## One-time setup

```bash
bun install                       # Capacitor packages are already in package.json
bun run build                     # production web build → dist/
bunx cap add android              # creates the android/ native project
bunx cap add ios                  # creates the ios/ native project

# Brand the native shells with the generated launchers/splash:
bun run store-assets
cp android-store-assets/mipmap-*/ic_launcher*.png android/app/src/main/res/
# (place each density file in the matching mipmap-* directory)
```

## Android — Google Play

1. **Package id** is `app.alcove.study` (set in `capacitor.config.json`).
   Change it once, before your first upload, if you want something else.
2. **Deep-link verification** (required for `https://` links to open in the
   app): replace the placeholder fingerprint in
   `public/.well-known/assetlinks.json` with your signing cert's SHA-256:
   ```bash
   keytool -list -printcert -jarfile app-release.aab | grep SHA256
   ```
   Then deploy the web build so the file is served at
   `https://yourdomain/.well-known/assetlinks.json`.
3. **Build the bundle:**
   ```bash
   bun run cap:sync
   bun run cap:open:android       # opens Android Studio
   # Android Studio → Build → Generate Signed Bundle (Android App Bundle)
   ```
4. **Play Console:** create the app, upload the `.aab` to internal testing,
   complete the Data Safety form (we collect email + payment simulation),
   and set content rating. Listing graphics are in `store/android/`:
   `feature-graphic.png` (1024×500) and `high-res-icon-512.png` (512×512).

## iOS — App Store

1. Requirements: macOS with Xcode 16+, an Apple Developer Program
   membership ($99/yr), and an iOS device or simulator.
2. **Bundle id** `app.alcove.study` is set in `capacitor.config.json`;
   Xcode signing will ask you to register it.
3. **App icon:** Xcode 15+ uses a single 1024 px asset. Copy
   `store/ios/AppIcon.appiconset/` over
   `ios/App/App/Assets.xcassets/AppIcon.appiconset/`.
4. **Build & archive:**
   ```bash
   bun run cap:sync
   bun run cap:open:ios           # opens Xcode
   # Xcode → Product → Archive → Distribute App
   ```
5. **App Store Connect:** create the app, add the archived build, complete
   the privacy questionnaire (email address; no third-party trackers), and
   note for App Review that accounts are created in-app via email code.

## Release cadence

```bash
# After any web change:
bun run cap:sync     # rebuilds dist/ and copies it into both platforms
# then build/archive in Android Studio / Xcode as above.
```

## What's already handled here

- PWA manifest with maskable icons + app shortcuts (Android install prompt)
- iOS meta tags, apple-touch-icon, standalone display, safe-area insets
- Service worker: offline app shell; Convex API traffic is never cached
- `InstallBanner` component: native Android prompt, iOS gesture hint
- Launcher icons at every Android density, Play feature graphic, 1024 px
  iOS icon, and the app-link assetlinks.json served from the web origin

## Notes

- `capacitor.config.json` sets `androidScheme: "https"` so cookies/storage
  behave like the web app.
- The simulated checkout is fine for review with a note, but swap in a real
  payment gateway before charging real money — both stores require it for
  physical services.
