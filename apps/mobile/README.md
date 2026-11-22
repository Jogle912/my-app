# StudyPilot mobile app (Android + iPhone)

Expo (React Native) app. The scheduling engine (`@studypilot/scheduler`) runs **on the phone**; the
server (`apps/server`) stores data, handles sign-in, and later Canvas and AI.

## Run it on your phone during development

1. Start the server on your computer (see the root README), reachable from your phone on the same Wi-Fi.
2. Create `apps/mobile/.env.local` with your computer's LAN address:
   `EXPO_PUBLIC_API_URL=http://192.168.x.x:3000`
3. `npm run dev:mobile` (from the repo root) and open the app with a development build or Expo Go.

## Install a test build on your Pixel (no Play Store)

1. Deploy the server somewhere your phone can reach over https (e.g. Render), then put that URL in
   `eas.json` → `build.preview.env.EXPO_PUBLIC_API_URL`.
2. Create a free Expo account, then from `apps/mobile`: `npx eas-cli@latest login` and
   `npx eas-cli@latest build --platform android --profile preview`.
3. EAS builds an `.apk` in the cloud and gives you a link/QR code. Open it on the Pixel and install
   (Android will ask you to allow installs from that source).

iPhone test builds need an Apple Developer account ($99/year) and go through TestFlight:
`npx eas-cli@latest build --platform ios --profile production` then `npx eas-cli@latest submit -p ios`.

## Checks

```bash
npm run lint -w @studypilot/mobile
npm run typecheck -w @studypilot/mobile
npm run test -w @studypilot/mobile   # Jest + React Native Testing Library
```

`expo export --platform android|ios` bundles the app offline and is a quick "does it compile" check.
The web target exists only so screens can be exercised in automated browser tests; StudyPilot is not
shipped as a website.

## Before publishing

- `app.json` uses the placeholder identifier `app.studypilot.mobile`; change it to a reverse-domain
  name you own before the first store upload (it can't be changed afterwards).
- Icons in `assets/images` come from `scripts/make-icons.py` and are placeholders for real branding.
