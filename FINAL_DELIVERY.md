# 🚀 **GeoSnap - Social Photo Location App**

## 📱 **Sản Phẩm Cuối Cùng**

---

## 🌐 **Web App (Live)**
### 👉 **https://geosnap-4dd7a.web.app**

**Features:**
- ✅ Social Feed (posts + stories + folders)
- ✅ Real-time Messaging (chat with friends)
- ✅ Friend System (requests, accept, block)
- ✅ Location-based Photos (Timeline + Map view)
- ✅ Dark/Light Mode
- ✅ Responsive Design

---

## 📦 **Android Native App**

### **Build Instructions:**

**Requirement:**
- Java JDK 17+
- Android SDK

**Step 1: Download google-services.json**
```bash
# Firebase Console → Settings → Android App
# → Download google-services.json
# → Place in: android/app/google-services.json
```

**Step 2: Build APK**
```bash
cd GEOSNAP/GEO/android
./gradlew assembleRelease
```

**Step 3: Find APK**
```
android/app/build/outputs/apk/release/app-release.apk
```

**Step 4: Install on Device**
```bash
adb install app-release.apk
```

### **Native Features:**
- 🔔 **Push Notifications** (Firebase Cloud Messaging)
- 📷 **Camera Access**
- 📍 **Geolocation**
- 💾 **Offline Storage**
- 🎨 **Native UI Components**

---

## 🔧 **Technology Stack**

### **Frontend:**
- ⚛️ React 19 + TypeScript
- 🎨 Tailwind CSS + Lucide Icons
- 📱 Capacitor (native bridge)
- 🗺️ Leaflet Maps
- 🎬 Motion (animations)

### **Backend:**
- 🔥 Firebase (Auth, Firestore, Hosting, Storage)
- ☁️ Cloud Functions (push notifications)
- 🔔 Firebase Cloud Messaging (FCM)
- 🛡️ Firestore Security Rules

### **Mobile:**
- 📦 Capacitor Android
- 🔌 Push Notifications Plugin
- 📸 Camera Plugin (ready)
- 📍 Geolocation Plugin (ready)

---

## 📊 **Features List**

### **Authentication**
- ✅ Email/Password login
- ✅ Google Sign-in
- ✅ Facebook Sign-in
- ✅ Auto user profile creation

### **Social**
- ✅ Friend requests (send/accept/block)
- ✅ User profiles (edit avatar, bio)
- ✅ Follower count
- ✅ Friend suggestions

### **Sharing**
- ✅ Photo timeline with geolocation
- ✅ Location folders (group photos by place)
- ✅ Post/Story feed
- ✅ Reactions (❤️ 🔥 😍 👏 ✈️)
- ✅ Comments on posts

### **Messaging**
- ✅ Real-time chat (Firebase Firestore)
- ✅ Conversation list
- ✅ Delete messages
- ✅ Message notifications

### **Push Notifications** (Automatic via Cloud Functions)
- ✅ New post from friends
- ✅ New messages
- ✅ Friend requests
- ✅ Notification sounds + vibration

### **Map**
- ✅ Show all location folders on map
- ✅ Cluster view
- ✅ Click to view folder details

### **UI/UX**
- ✅ Dark/Light theme toggle
- ✅ Mobile bottom nav
- ✅ Desktop sidebar
- ✅ Loading states
- ✅ Error handling
- ✅ Toast notifications

---

## 🔐 **Security**

### **Firestore Security Rules**
- ✅ User authentication required
- ✅ Data privacy (friends-only sharing)
- ✅ Friend-based access control
- ✅ Message recipient/sender validation
- ✅ Comment ownership verification

### **Firebase Security**
- ✅ OAuth 2.0 authentication
- ✅ Secure token storage
- ✅ HTTPS only
- ✅ No sensitive data in logs

---

## 📂 **Project Structure**

```
GEOSNAP/GEO/
├── src/
│   ├── pages/              # Main pages
│   ├── components/         # Reusable components
│   ├── services/           # Business logic
│   ├── store/              # Zustand state management
│   ├── lib/                # Utilities
│   └── App.tsx             # Main app
├── android/                # Capacitor Android project
├── functions/              # Cloud Functions
├── firestore.rules         # Security rules
├── capacitor.config.ts     # Capacitor config
└── vite.config.ts          # Build config
```

---

## 🚀 **Deployment**

### **Web App:**
```bash
npm run build
firebase deploy --only hosting
```

### **Android APK:**
```bash
cd android
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk
```

### **Cloud Functions:**
```bash
firebase deploy --only functions
```

---

## 📝 **Git Commits Summary**

- ✨ Add messaging system & fix Feed issues
- 🎯 Improve Messages UI - add friends list + fix Feed error handling
- 🔧 Fix Messages permissions - use getDoc instead of query
- 🐐 Fix Messages read permission - allow authenticated users
- 🚀 Fix Android splash screen stuck + add error handling
- ✨ Convert to native Capacitor app + add push notifications
- 🔔 Complete Firebase Cloud Messaging setup

---

## 🎯 **What's Ready**

### **✅ Complete:**
- ✅ Web app (fully functional)
- ✅ Android project (Capacitor configured)
- ✅ Push notification handler
- ✅ Cloud Functions (auto-send notifications)
- ✅ Firestore database + security rules
- ✅ Authentication system
- ✅ All social features

### **⏳ Needs Your Action:**
1. Download `google-services.json` from Firebase
2. Place in `android/app/google-services.json`
3. Build APK with `./gradlew assembleRelease`
4. Install on device

---

## 🧪 **Test Accounts**

Use any Google/Facebook account to test.

**Features to test:**
1. Sign up → create profile
2. Add friends → send/accept requests
3. Upload photos → create folders
4. Post on feed → get notifications
5. Send messages → test chat
6. Like posts → reactions

---

## 📞 **Support**

### **Common Issues:**

**No notifications?**
- ✅ Check google-services.json is in android/app/
- ✅ Check Firebase API enabled
- ✅ Check device has internet

**Build fails?**
- ✅ Check Java JDK 17+ installed
- ✅ Check Android SDK installed
- ✅ Run: `./gradlew clean`

**App crashes on startup?**
- ✅ Check logcat: `adb logcat | grep GeoSnap`
- ✅ Check Firebase config is correct

---

## 🎉 **Ready to Ship!**

Your app is:
- 📱 **Native** (Capacitor Android)
- 🔔 **Smart** (Push notifications)
- 🔐 **Secure** (Firebase auth + rules)
- 🚀 **Modern** (React + TypeScript + Tailwind)
- 📊 **Feature-rich** (All social features)

**Next Steps:**
1. Download google-services.json
2. Build APK
3. Test on real device
4. Upload to Google Play Store

---

**Good luck! 🚀**
Made with ❤️ using React, Firebase, and Capacitor
