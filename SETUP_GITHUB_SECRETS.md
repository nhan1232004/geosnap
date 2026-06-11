# 🔐 **Setup GitHub Secrets - Copy Paste Ready!**

## **Bước 1: Vào GitHub Repository Settings**

```
https://github.com/YOUR_USERNAME/YOUR_REPO/settings/secrets/actions
```

Click: **"New repository secret"**

---

## **Bước 2: Add 5 Secrets (Copy-Paste)**

### **Secret 1: GOOGLE_SERVICES_JSON**

```
Name: GOOGLE_SERVICES_JSON
Value: (Paste value below)
```

**Value to paste:**
```
ewogICJwcm9qZWN0X2luZm8iOiB7CiAgICAicHJvamVjdF9udW1iZXIiOiAiMTA1MzAwMjk2MzA5OSIsCiAgICAicHJvamVjdF9pZCI6ICJnZW9zbmFwLTRkZDdhIiwKICAgICJzdG9yYWdlX2J1Y2tldCI6ICJnZW9zbmFwLTRkZDdhLmZpcmViYXNlc3RvcmFnZS5hcHAiCiAgfSwKICAiY2xpZW50IjogWwogICAgewogICAgICAiY2xpZW50X2luZm8iOiB7CiAgICAgICAgIm1vYmlsZXNka19hcHBfaWQiOiAiMToxMDUzMDAyOTYzMDk5OmFuZHJvaWQ6YWU2MTA1MTQ5ODE5Y2VlYjUxMGUzZSIsCiAgICAgICAgImFuZHJvaWRfY2xpZW50X2luZm8iOiB7CiAgICAgICAgICAicGFja2FnZV9uYW1lIjogImNvbS5nZW9zbmFwLmFwcCIKICAgICAgICB9CiAgICAgIH0sCiAgICAgICJvYXV0aF9jbGllbnQiOiBbCiAgICAgICAgewogICAgICAgICAgImNsaWVudF9pZCI6ICIxMDUzMDAyOTYzMDk5LTBzZXFjazFsbXB1NzZwbWgzaGJscjI5am80MnB1dGJwLmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29tIiwKICAgICAgICAgICJjbGllbnRfdHlwZSI6IDMKICAgICAgICB9CiAgICAgIF0sCiAgICAgICJhcGlfa2V5IjogWwogICAgICAgIHsKICAgICAgICAgICJjdXJyZW50X2tleSI6ICJBSXphU3lEbnlUWmpjY0FlNUp1cTZEeUJVMndYdzYybjNPLUNKSkUiCiAgICAgICAgfQogICAgICBdLAogICAgICAic2VydmljZXMiOiB7CiAgICAgICAgImFwcGludml0ZV9zZXJ2aWNlIjogewogICAgICAgICAgIm90aGVyX3BsYXRmb3JtX29hdXRoX2NsaWVudCI6IFsKICAgICAgICAgICAgewogICAgICAgICAgICAgICJjbGllbnRfaWQiOiAiMTA1MzAwMjk2MzA5OS0wc2VxY2sxbG1wdTc2cG1oM2hibHIyOWpvNDJwdXRicC5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSIsCiAgICAgICAgICAgICAgImNsaWVudF90eXBlIjogMwogICAgICAgICAgICB9CiAgICAgICAgICBdCiAgICAgICAgfQogICAgICB9CiAgICB9CiAgXSwKICAiY29uZmlndXJhdGlvbl92ZXJzaW9uIjogIjEiCn0=
```

✅ Click **"Add secret"**

---

### **Secret 2: KEYSTORE_PASSWORD**

```
Name: KEYSTORE_PASSWORD
Value: android
```

✅ Click **"Add secret"**

---

### **Secret 3: KEY_ALIAS**

```
Name: KEY_ALIAS
Value: key0
```

✅ Click **"Add secret"**

---

### **Secret 4: KEY_PASSWORD**

```
Name: KEY_PASSWORD
Value: android
```

✅ Click **"Add secret"**

---

### **Secret 5: ANDROID_KEYSTORE**

Copy from server output:
```
Name: ANDROID_KEYSTORE
Value: (Paste keystore base64 from build-secret.txt)
```

---

## **Bước 3: Xong!**

All 5 secrets added ✅

---

## **Next Step:**

```bash
git push origin main
# GitHub Actions tự động start build!
```

**5-10 phút sau** → Check GitHub Actions tab → Download APK! 🎉
