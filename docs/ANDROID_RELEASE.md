# Android release and download

InstaFrame uses an Expo development build because native WebRTC is not supported by Expo Go.

## Installable APK for testing

1. Set `EXPO_PUBLIC_API_URL` to the deployed HTTPS API URL in the EAS `preview` environment.
2. Run `npx eas login` once with the project owner's Expo account.
3. Run `npm run mobile:apk` from the repository root.
4. When EAS finishes, open the build URL or download the `.apk` from the EAS dashboard.
5. Install it only on approved test devices and verify camera, microphone, notifications, scanner, media uploads and calls.

## Play Store file

Run `npm run mobile:aab`. This produces an Android App Bundle (`.aab`) for Play Console submission. It is not directly installable like an APK.

Never place API, Cloudinary, TURN, push or database secrets inside the app. Only the public API base URL may be included in the mobile build.
