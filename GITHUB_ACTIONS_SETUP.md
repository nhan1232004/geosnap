# 🚀 **GitHub Actions - Auto-Build APK**

## **Cách Setup (5 phút)**

### **Step 1: Get google-services.json từ Firebase**

```
1. Firebase Console → Settings → Android App
2. Download "google-services.json"
3. Convert to base64:
   base64 google-services.json | tr -d '\n'
4. Copy output
```

### **Step 2: Add GitHub Secrets**

Vào: `https://github.com/YOUR_REPO/settings/secrets/actions`

Add 5 secrets:

1. **`GOOGLE_SERVICES_JSON`** (base64 string)
   - Paste google-services.json (base64)

2. **`KEYSTORE_PASSWORD`**
   - Default: (ask nếu không biết)

3. **`KEY_ALIAS`**
   - Default: `geosnap` hoặc `key0`

4. **`KEY_PASSWORD`**
   - Same as KEYSTORE_PASSWORD

5. **`ANDROID_KEYSTORE`** (base64)
   ```bash
   base64 -i android/app/android.keystore | tr -d '\n'
   ```

### **Step 3: Push Code**

```bash
git add .
git commit -m "Setup GitHub Actions"
git push origin main
```

### **Step 4: Check Build Status**

1. Vào: `https://github.com/YOUR_REPO/actions`
2. Watch workflow run
3. ✅ Build success!

### **Step 5: Download APK**

Build complete → Go to Releases tab → Download APK!

---

## **Automatic Releases**

Mỗi lần push:
- ✅ Auto-build APK
- ✅ Create release (v1, v2, v3...)
- ✅ Download ready!

---

## **Workflow file:**
`.github/workflows/build-apk.yml` (already created!)

---

## **✨ What Happens When You Push:**

1. 📥 Code pushed to GitHub
2. 🔨 GitHub Actions triggers
3. 🏗️ Build APK in cloud
4. 📦 Create GitHub Release
5. ✅ You download APK

**No local build needed!**

---

## **🔐 Secure Notes:**

- Keystore password = stored in GitHub Secrets (encrypted)
- google-services.json = encrypted
- No sensitive data in logs
- Only you can see secrets

---

## **Next Time You Need APK:**

Just:
```bash
git push
# Wait 5-10 minutes
# Go to Releases → Download!
```

That's it! 🎉
