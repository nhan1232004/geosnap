<div align="center">

# 📍 GeoSnap

### Ứng dụng Mạng Xã Hội Địa Điểm Bằng Hình Ảnh

[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?style=for-the-badge&logo=leaflet&logoColor=white)](https://leafletjs.com/)

**GeoSnap** là web app cho phép người dùng upload ảnh, tự động đọc tọa độ GPS từ metadata EXIF, gom nhóm ảnh theo địa điểm và chia sẻ hành trình với bạn bè.

[Demo](#demo) • [Tính năng](#-tính-năng-chính) • [Cài đặt](#-cài-đặt--chạy-locally) • [Công nghệ](#-công-nghệ-sử-dụng) • [Kiến trúc](#-kiến-trúc-dự-án)

</div>

---

## 🌟 Tính năng chính

### 📸 Upload & Xử lý ảnh thông minh
- **Tự động đọc GPS** từ metadata EXIF của ảnh
- **Clustering thông minh** – gom ảnh trong bán kính ~200m thành một folder địa điểm (thuật toán DBSCAN)
- **Reverse geocoding** – tự động đặt tên folder theo tên đường, quận, thành phố (Nominatim API)
- **Gắn vị trí thủ công** cho ảnh không có GPS bằng bản đồ tương tác
- Hỗ trợ kéo thả (drag & drop) nhiều ảnh cùng lúc

### 🗺️ Hai chế độ xem
- **Timeline View** – duyệt địa điểm theo dòng thời gian, nhóm theo tháng/năm
- **Map View** – xem toàn bộ địa điểm trên bản đồ tương tác (Leaflet)

### 👥 Mạng xã hội địa điểm
- **Kết bạn qua Invite Link** – tương tự cơ chế Locket
- **Social Feed** – xem hành trình mới nhất của bạn bè
- **Reactions** – thả emoji (❤️ 🔥 ✈️ 📍 😍) cho địa điểm của bạn bè
- **Comments** – bình luận trên các folder địa điểm
- **Thông báo realtime** – nhận thông báo tức thì qua Firestore listeners

### 🔒 Privacy & Bảo mật
- **3 mức visibility**: Private / Friends / Public cho mỗi folder
- **Firestore Security Rules** đầy đủ với RLS
- Xác thực qua **Google / Facebook / Email**

### ✨ UI/UX nâng cao
- Toast notification system (success, error, warning, info)
- Loading skeletons với shimmer effect
- Lazy image loading (Intersection Observer)
- Error boundaries cho crash recovery
- Smooth animations (Motion)
- Search & filter địa điểm realtime
- Stats dashboard (tổng địa điểm, ảnh, bạn bè)

---

## 🛠️ Công nghệ sử dụng

| Layer | Công nghệ |
|-------|-----------|
| **Frontend** | React 19, TypeScript 5.8 |
| **Bundler** | Vite 6 |
| **Styling** | Tailwind CSS 4 |
| **State Management** | Zustand |
| **Routing** | React Router DOM 7 |
| **Animations** | Motion (Framer Motion) |
| **Maps** | Leaflet + React Leaflet |
| **Database & Auth** | Firebase (Firestore + Authentication) |
| **EXIF Parsing** | exifr |
| **Geocoding** | Nominatim (OpenStreetMap) |
| **AI Integration** | Google Gemini API |
| **Icons** | Lucide React |
| **File Upload** | React Dropzone |

---

## 🚀 Cài đặt & Chạy locally

### Yêu cầu
- **Node.js** >= 18
- **npm** >= 9
- Tài khoản **Firebase** (Firestore + Authentication)

### Các bước

1. **Clone repository**
   ```bash
   git clone https://github.com/nhan1232004/geosnap.git
   cd geosnap
   ```

2. **Cài đặt dependencies**
   ```bash
   npm install
   ```

3. **Cấu hình biến môi trường**

   Tạo file `.env.local` từ file mẫu:
   ```bash
   cp .env.example .env.local
   ```

   Chỉnh sửa `.env.local` với các giá trị thực:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   APP_URL=http://localhost:3000
   ```

4. **Cấu hình Firebase**

   - Tạo project trên [Firebase Console](https://console.firebase.google.com/)
   - Bật **Firestore Database** và **Authentication** (Google, Facebook, Email/Password)
   - Cập nhật Firebase config trong `src/firebase.ts`

5. **Chạy ứng dụng**
   ```bash
   npm run dev
   ```

   Mở trình duyệt tại `http://localhost:3000`

### Scripts có sẵn

| Script | Mô tả |
|--------|--------|
| `npm run dev` | Chạy dev server (port 3000) |
| `npm run build` | Build production |
| `npm run preview` | Preview bản build |
| `npm run lint` | Kiểm tra TypeScript |
| `npm run clean` | Xóa thư mục dist |

---

## 📁 Kiến trúc dự án

```
geosnap/
├── src/
│   ├── components/              # Reusable UI components
│   │   ├── Toast.tsx            # Toast notification
│   │   ├── ToastContainer.tsx   # Toast context provider
│   │   ├── LoadingSkeleton.tsx  # Skeleton loaders
│   │   ├── LazyImage.tsx        # Lazy loading images
│   │   ├── ErrorBoundary.tsx    # React error boundary
│   │   ├── NotificationCenter.tsx # Realtime notifications
│   │   ├── StatsCard.tsx        # User statistics
│   │   └── SearchBox.tsx        # Search & filter
│   ├── pages/                   # Page components
│   │   ├── Login.tsx            # Đăng nhập / Đăng ký
│   │   ├── Upload.tsx           # Upload ảnh + xử lý EXIF
│   │   ├── Timeline.tsx         # Timeline view
│   │   ├── Map.tsx              # Map view (Leaflet)
│   │   ├── Feed.tsx             # Social feed
│   │   ├── Friends.tsx          # Quản lý bạn bè
│   │   ├── FolderDetail.tsx     # Chi tiết folder
│   │   ├── Profile.tsx          # Trang cá nhân
│   │   └── Invite.tsx           # Invite link page
│   ├── lib/                     # Utilities & helpers
│   │   ├── clustering.ts        # DBSCAN clustering
│   │   ├── geocoding.ts         # Reverse geocoding
│   │   ├── animations.ts        # Animation variants
│   │   └── utils.ts             # Helper functions
│   ├── store/
│   │   └── useAppStore.ts       # Zustand global store
│   ├── types/
│   │   └── index.ts             # TypeScript type definitions
│   ├── App.tsx                  # Root component + routing
│   ├── firebase.ts              # Firebase configuration
│   ├── main.tsx                 # Entry point
│   └── index.css                # Global styles
├── firestore.rules              # Firestore security rules
├── firebase-blueprint.json      # Database schema blueprint
├── firebase-applet-config.json  # Firebase applet config
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript config
├── package.json                 # Dependencies & scripts
├── .env.example                 # Biến môi trường mẫu
└── .gitignore
```

---

## 🗄️ Database Schema (Firestore)

| Collection | Mô tả | Fields chính |
|------------|--------|--------------|
| **users** | Hồ sơ người dùng | `uid`, `email`, `displayName`, `avatarUrl`, `inviteCode`, `bio` |
| **photos** | Ảnh đã upload | `uid`, `url`, `latitude`, `longitude`, `takenAt`, `hasGps`, `folderId` |
| **folders** | Folder địa điểm | `uid`, `name`, `centerLat`, `centerLng`, `photoCount`, `visibility`, `country`, `city` |
| **friendships** | Quan hệ bạn bè | `requesterId`, `addresseeId`, `status` (`pending`/`accepted`/`blocked`) |
| **notifications** | Thông báo | `recipientId`, `actorId`, `type`, `isRead` |
| **comments** | Bình luận | `uid`, `folderId`, `content` |

---

## 🔐 Firestore Security Rules

Dự án sử dụng Firestore Security Rules đầy đủ với:
- ✅ Xác thực người dùng cho mọi thao tác
- ✅ Kiểm tra ownership (chỉ sửa/xóa data của mình)
- ✅ Validation dữ liệu đầu vào
- ✅ Privacy controls cho folders (private/friends/public)
- ✅ Admin role support
- ✅ Friend-based access control

---

## 🔄 Luồng hoạt động chính

### Upload ảnh
```
Chọn ảnh → Đọc EXIF GPS → Reverse Geocoding → Clustering (DBSCAN 200m)
→ Tạo/cập nhật folder → Lưu Firebase → Hiển thị kết quả
```

### Kết bạn qua Invite Link
```
Copy invite link → Gửi cho bạn → Bạn click link → Preview profile
→ Nhấn "Kết bạn" → Friend request → Chấp nhận → Thành bạn bè
```

---

## 📊 Trạng thái phát triển

- ✅ **Phase 1**: Core Features (Upload, GPS, Clustering, Timeline, Map)
- ✅ **Phase 2**: Social Features (Friends, Feed, Reactions, Comments, Notifications)
- 🔄 **Phase 3**: UI/UX Polish (Animations, Dark mode, Responsive)
- ⏳ **Phase 4**: Advanced Features (PWA, Offline, Analytics)

---

## 🤝 Đóng góp

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Tạo Pull Request

---

## 📄 License

Dự án này được phát triển cho mục đích học tập và nghiên cứu.

---

## 👤 Tác giả

**Nguyễn Hữu Nhân**
- GitHub: [@nhan1232004](https://github.com/nhan1232004)

---

<div align="center">

**⭐ Nếu dự án hữu ích, hãy cho một star nhé! ⭐**

</div>
