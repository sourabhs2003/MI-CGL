# Push Notifications

This app creates in-app notifications in Firestore and uses Firebase Cloud Functions to send browser/phone push notifications through FCM.

## Required Setup

1. Generate a Web Push certificate in Firebase Console:
   Project settings -> Cloud Messaging -> Web Push certificates.

2. Add the public key to the frontend environment:

   ```bash
   VITE_FIREBASE_VAPID_KEY=your_web_push_public_key
   ```

3. Install function dependencies:

   ```bash
   cd functions
   npm install
   ```

4. Deploy Firestore rules, hosting, and functions:

   ```bash
   npm run build
   firebase deploy
   ```

   The function uses `https://sourabhzssc.web.app` as the default app URL for notification taps. If you deploy to a custom domain, set `APP_BASE_URL` for the function environment.

## How It Works

- When a user enables notifications, the app saves their FCM token under `users/{uid}/deviceTokens`.
- When a squad alert or motivation alert is created, the app writes a row to `notificationOutbox`.
- The Cloud Function `sendNotificationOutbox` sends the push notification to the recipient's saved tokens.
- If a token is expired, the function disables it so future sends stay clean.

Users must enable notifications on each phone/browser where they want push alerts.
