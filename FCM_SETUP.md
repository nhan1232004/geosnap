# Firebase Cloud Messaging Setup Guide

## 1. Get Google Services JSON

### Go to Firebase Console:
1. Open https://console.firebase.google.com/
2. Select project: `geosnap-4dd7a`
3. Project Settings → "Service accounts"
4. Click "Generate new private key" → save `google-services.json`

## 2. Add google-services.json to Android

```bash
# Place file at:
android/app/google-services.json
```

## 3. Update android/build.gradle

Add dependency:
```gradle
buildscript {
  dependencies {
    classpath 'com.google.gms:google-services:4.3.15'
  }
}
```

## 4. Update android/app/build.gradle

Add plugin and dependency:
```gradle
apply plugin: 'com.google.gms.google-services'

dependencies {
  implementation 'com.google.firebase:firebase-messaging:23.2.1'
}
```

## 5. Update AndroidManifest.xml

Add permissions:
```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<service
  android:name="com.getcapacitor.CapacitorFirebaseMessagingService"
  android:exported="false">
  <intent-filter>
    <action android:name="com.google.firebase.MESSAGING_EVENT" />
  </intent-filter>
</service>
```

## 6. Test Push Notifications

### From Firebase Console:
1. Go to Engage → Cloud Messaging
2. Create campaign
3. Select "app" and send test message
4. You'll receive notification on your device!

### Or use Node.js script:
```javascript
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert('path/to/serviceAccountKey.json')
});

admin.messaging().send({
  notification: {
    title: 'Hello GeoSnap!',
    body: 'This is a test notification'
  },
  android: {
    priority: 'high',
    notification: {
      sound: 'default'
    }
  },
  token: 'DEVICE_TOKEN_HERE' // Get from Firestore
});
```

## 7. Sending Notifications from Backend

When user follows someone:
```javascript
// Get follower's push token from Firestore
const followerDoc = await admin.firestore()
  .collection('users')
  .doc(followerId)
  .get();

if (followerDoc.data()?.pushToken) {
  await admin.messaging().send({
    notification: {
      title: `${user.displayName} đang theo dõi bạn`,
      body: 'Xem profile của họ'
    },
    data: {
      screen: `/profile/${userId}`
    },
    token: followerDoc.data().pushToken
  });
}
```

## Done! 🎉

Now your app can:
- ✅ Receive push notifications
- ✅ Handle notification taps
- ✅ Navigate to screens from notifications
- ✅ Save device token for targeted messages
