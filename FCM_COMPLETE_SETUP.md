# ⚠️ IMPORTANT - Complete These Steps!

## 1️⃣ Download google-services.json (REQUIRED)

```bash
# Go to Firebase Console:
https://console.firebase.google.com/project/geosnap-4dd7a/settings/general

# 1. Click "Android app" (or add if not exists)
# 2. Package name: com.geosnap.app
# 3. Click "Register app"
# 4. Download "google-services.json"
# 5. Place in: android/app/google-services.json

# Replace the template file!
```

## 2️⃣ Deploy Cloud Functions (for push notifications)

```bash
cd functions
npm install
firebase deploy --only functions
```

## 3️⃣ Update Firestore Rules (Allow read pushToken)

Add this to firestore.rules:
```firestore
match /users/{userId} {
  allow read: if isAuthenticated();
  allow update: if isOwner(userId) && (
    !('pushToken' in request.resource.data) ||
    request.resource.data.pushToken is string
  );
}
```

Then deploy:
```bash
firebase deploy --only firestore:rules
```

## 4️⃣ Build APK

```bash
cd android
./gradlew assembleRelease

# APK: app/build/outputs/apk/release/app-release.apk
```

## ✅ Features After Setup:

- 🔔 Get notified when someone posts
- 💬 Get notified on new messages
- 👥 Get notified on friend requests
- 📱 Tap notification to go directly to screen

---

## 🐛 Troubleshooting

**No notifications received?**
- ✅ Check if google-services.json is in android/app/
- ✅ Check if device token is saved in Firestore
- ✅ Check Firestore Cloud Messaging API is enabled

**Device token not saving?**
- ✅ Check if POST_NOTIFICATIONS permission granted
- ✅ Check browser console for errors

---

## 🧪 Test Push Notifications

### Method 1: Firebase Console
1. Go to Cloud Messaging tab
2. Create new campaign
3. Select app and device
4. Send test notification

### Method 2: Use Node.js script
```javascript
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.cert('path/to/serviceAccountKey.json')
});

admin.messaging().send({
  notification: {
    title: 'Test GeoSnap!',
    body: 'Push notifications working 🎉'
  },
  android: {
    priority: 'high',
    notification: { sound: 'default' }
  },
  token: 'DEVICE_TOKEN_FROM_FIRESTORE'
});
```

---

**Done? Let me know!** 🚀
