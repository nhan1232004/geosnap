# 🚀 **GeoSnap Quick Start**

## **🌐 Web App (Ready Now)**

```
👉 https://geosnap-4dd7a.web.app
```

**Features:** Timeline • Map • Feed • Messages • Friends

---

## **📱 Android APK (3 Steps)**

### **Step 1: Get google-services.json**
```
1. Open: https://console.firebase.google.com/project/geosnap-4dd7a/settings/general
2. Scroll to "Android apps"
3. Click on app or create new one
4. Download "google-services.json"
5. Put in: android/app/google-services.json
```

### **Step 2: Build APK**
```bash
cd android
./gradlew assembleRelease
```

### **Step 3: Install**
```bash
adb install app/build/outputs/apk/release/app-release.apk
```

---

## **🔧 System Requirements**

- **Java**: JDK 17+
- **Android SDK**: API 24+
- **Node.js**: v20+

---

## **📊 What You Get**

| Feature | Web | Android |
|---------|-----|---------|
| Social Feed | ✅ | ✅ |
| Messaging | ✅ | ✅ |
| Photos & Map | ✅ | ✅ |
| Push Notifications | ✅ | ✅ (with google-services.json) |
| Camera | ✅ | ✅ |
| Offline Mode | ✅ | ✅ |
| Dark Mode | ✅ | ✅ |

---

## **🎯 Current Status**

✅ Web app live
✅ Android project ready (Capacitor configured)
✅ Push notifications setup (needs google-services.json)
✅ All features complete
✅ Cloud Functions deployed

---

## **📞 Troubleshooting**

### Build fails?
```bash
./gradlew clean
./gradlew assembleRelease
```

### App stuck at splash?
- Check `adb logcat` for errors
- Verify Firebase config in app

### No notifications?
- Confirm google-services.json in android/app/
- Enable Firebase Messaging API

---

## **🎉 Done!**

Your GeoSnap app is ready. Build APK and enjoy!

Questions? Check FINAL_DELIVERY.md for detailed guide.
