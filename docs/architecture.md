# GeoSnap Architecture & System Design Documentation

This document provides a comprehensive technical overview of the **GeoSnap** frontend architecture, runtime data flow, state management, caching mechanisms, build pipeline, and CI/CD automation.

---

## 1. Technology Stack

GeoSnap is built on a modern, mobile-first Web/PWA and hybrid mobile foundation:

| Layer / Capability | Technology | Version | Description / Role |
| :--- | :--- | :--- | :--- |
| **Framework & UI** | [React](file:///d:/geosnap-main/geosnap-main/package.json#L31) | `^19.0.0` | Declarative component UI library with modern hooks |
| **Language** | [TypeScript](file:///d:/geosnap-main/geosnap-main/package.json#L48) | `~5.8.2` | Static type safety and strict schema models |
| **Build Tool** | [Vite](file:///d:/geosnap-main/geosnap-main/package.json#L38) | `^6.2.0` | Ultra-fast ESM bundler and development server |
| **Styling** | [Tailwind CSS](file:///d:/geosnap-main/geosnap-main/package.json#L46) | `^4.1.14` | Utility-first styling via `@tailwindcss/vite` engine |
| **State Management** | [Zustand](file:///d:/geosnap-main/geosnap-main/package.json#L39) | `^5.0.12` | Lightweight, centralized client store |
| **Backend & BaaS** | [Firebase SDK](file:///d:/geosnap-main/geosnap-main/package.json#L27) | `^12.18.0` | Firebase Auth, Cloud Firestore (NoSQL), Cloud Storage |
| **Map & Geospatial** | [Leaflet](file:///d:/geosnap-main/geosnap-main/package.json#L28) / [React-Leaflet](file:///d:/geosnap-main/geosnap-main/package.json#L34) | `^1.9.4` / `^5.0.0` | Interactive map rendering, marker clusters, geocoding display |
| **Mobile Runtime** | [Capacitor](file:///d:/geosnap-main/geosnap-main/package.json#L15-L17) | `^8.3.4` (Core/Android) | Native bridge packaging web app into Android APK |
| **Realtime Messaging** | [Socket.IO Client](file:///d:/geosnap-main/geosnap-main/package.json#L36) | `^4.8.3` | WebSocket client for live 1-on-1 chat and presence |
| **PWA & Offline** | [vite-plugin-pwa](file:///d:/geosnap-main/geosnap-main/package.json#L50) / Workbox | `^1.3.0` | Service Worker registration, runtime asset and map tile caching |
| **Animation** | [Motion](file:///d:/geosnap-main/geosnap-main/package.json#L30) (Framer Motion) | `^12.23.24` | Fluid animations, spring transitions, and gestures |
| **Metadata Parsing** | [exifr](file:///d:/geosnap-main/geosnap-main/package.json#L25) | `^7.1.3` | High-performance client-side EXIF GPS/timestamp extraction |

---

## 2. Directory Structure

```text
src/
├── App.tsx                    # Root layout, routing definition, sidebar, and auth lifecycle
├── firebase.ts               # Firebase App, Auth, Firestore, and Storage initialization
├── index.css                 # Global CSS styles, Tailwind directives, theme variables
├── main.tsx                  # Application entrypoint mounting App to DOM
│
├── components/               # Reusable presentation & feature components (16 files)
│   ├── ErrorBoundary.tsx     # React ErrorBoundary with retry fallbacks
│   ├── ErrorFallback.tsx     # Generic error fallback presentation
│   ├── LazyImage.tsx         # Progressive image loader with intersection observer
│   ├── Lightbox.tsx          # Fullscreen interactive photo modal & viewer
│   ├── LoadingSkeleton.tsx   # Shimmer skeleton loader components
│   ├── NotificationCenter.tsx# Dropdown notification list & read marker
│   ├── OfflineBanner.tsx     # Network status banner detecting offline state
│   ├── PWAInstallPrompt.tsx  # PWA installation banner / trigger
│   ├── SearchBox.tsx         # Search bar for places, trips, and friends
│   ├── StatsCard.tsx         # Reusable statistic summary widget
│   ├── Toast.tsx             # Toast notification item component
│   ├── ToastContainer.tsx    # Toast context provider and viewport stack
│   ├── Stories/
│   │   └── StoriesBar.tsx    # Horizontal avatar tray for 24h stories
│   └── feed/
│       ├── CreatePost.tsx    # Rich post creation modal with image uploader
│       ├── PostItem.tsx      # Social feed post card with comments & reactions
│       └── StoryBar.tsx      # Feed story carousel wrapper
│
├── lib/                      # Business logic, helpers, and client SDK wrappers (13 files)
│   ├── animations.ts         # Framer Motion animation variants & spring transitions
│   ├── api.ts                # REST API client with auto-refresh token & retry logic
│   ├── asyncErrorHandler.ts  # Global unhandled rejection & toast bridge
│   ├── clustering.ts         # DBSCAN spatial clustering (200m radius threshold)
│   ├── errorHandler.ts       # Error normalization & standard error classes
│   ├── firestoreService.ts   # Firestore CRUD operations & real-time snapshot helpers
│   ├── geocoding.ts          # Reverse-geocoding via OpenStreetMap Nominatim API
│   ├── imageOptimizer.ts     # Client-side canvas image downsampling & compression
│   ├── offlineManager.ts     # Offline queue, action dispatcher, and local caching
│   ├── pagination.ts         # Cursor-based Firestore query pagination
│   ├── socket.ts             # Socket.IO client connection & channel manager
│   ├── utils.ts              # Mathematical distance, date formatters, and classnames
│   └── validators.ts         # Payload validation guards
│
├── pages/                    # Routed page views (14 files)
│   ├── AuthCallback.tsx      # OAuth redirect handler
│   ├── Dashboard.tsx         # Travel statistics, charts, and activity summary
│   ├── Explore.tsx           # Public discovery feed and trending destinations
│   ├── Feed.tsx              # Social timeline of friends' posts and location folders
│   ├── FolderDetail.tsx      # Detailed view of a location folder with photo gallery
│   ├── Friends.tsx           # Friends management, incoming/outgoing requests, search
│   ├── Invite.tsx            # Referral link landing and invitation resolver
│   ├── Login.tsx             # Authentication (Email/Password & Google Sign-In)
│   ├── Map.tsx               # Fullscreen Leaflet interactive world/country map
│   ├── Messages.tsx          # Real-time chat & conversation panel
│   ├── Profile.tsx           # User profile, visited countries, and authored albums
│   ├── StoryViewer.tsx       # Immersive full-screen 24h story viewer
│   ├── Timeline.tsx          # Chronological timeline of user's personal travel history
│   └── Upload.tsx            # EXIF photo upload, batch clustering, and album generator
│
├── services/                 # Background system services (2 files)
│   ├── listenerCleanup.ts    # Centralized Firestore listener unsubscription tracker
│   └── notifications.ts      # Push notification setup (Capacitor Push & FCM)
│
├── store/                    # State management (1 file)
│   └── useAppStore.ts        # Zustand global store
│
└── types/                    # TypeScript interfaces & types (2 files)
    ├── images.d.ts           # Static image asset declarations
    └── index.ts              # Core domain models (UserProfile, Photo, Folder, Post, etc.)
```

---

## 3. Data Flow & Authentication Architecture

GeoSnap implements a reactive unidirectional data flow anchored by Firebase Authentication and the Firestore SDK:

```mermaid
flowchart TD
    subgraph AuthLifecycle["1. Authentication Lifecycle"]
        FBAuth["Firebase Auth State"] -->|onAuthStateChanged| Listener["Auth Listener (App.tsx)"]
        Listener -->|Get ID Token| Token["Token Retrieval"]
        Listener -->|Fetch doc('users', uid)| FSDoc["Firestore UserProfile"]
        Token -->|Set Auth Header| APIClient["api.ts Client"]
        Token -->|Connect WS| SocketIO["Socket.IO Server"]
        FSDoc -->|hydrate| Zustand["Zustand useAppStore"]
    end

    subgraph AppState["2. State & UI Dispatch"]
        Zustand -->|user / userProfile| ProtectedRoutes["Protected Route Guard"]
        Zustand -->|theme / sidebar| UIState["Global Layout & Sidebar"]
        Zustand -->|unreadNotifications| Badges["Navigation Badges"]
    end

    subgraph DataAccess["3. Data Persistence & Realtime"]
        ProtectedRoutes -->|Direct SDK CRUD / Listeners| Firestore["Cloud Firestore"]
        ProtectedRoutes -->|Photo Uploads| CloudStorage["Cloud Storage"]
        ProtectedRoutes -->|Realtime Chat Messages| SocketIO
        ProtectedRoutes -->|Offline Mutations| OfflineQueue["localStorage Queue (offlineManager.ts)"]
    end
```

### Data Access Strategy
1. **Firestore Client SDK**: Direct client-to-Firestore CRUD operations via `firebase/firestore`. Security is validated server-side by `firestore.rules`.
2. **Socket.IO Realtime Bridge**: Private chat messages (`/messages`) leverage Socket.IO for sub-second bidirectional delivery, with persistence synchronized into Firestore `messages` collection.
3. **REST API Client (`lib/api.ts`)**: Built with automatic JWT header attachment, token refresh queuing, exponential backoff retries, and offline failover. Prepared for future Node/Express microservices backend integration.

---

## 4. State Management (`store/useAppStore.ts`)

Global application state is managed by a single Zustand store:

```typescript
interface AppState {
  user: ClientUser | null;              // Basic authenticated user info (uid, email, displayName, avatarUrl)
  userProfile: UserProfile | null;      // Full Firestore profile document (role, bio, inviteCode, createdAt)
  authLoaded: boolean;                  // Initial auth loading completion flag
  unreadNotifications: number;          // Unread notification badge counter
  theme: 'dark' | 'light';              // UI theme with localStorage persistence ('geosnap-theme')
  sidebarOpen: boolean;                 // Mobile responsive sidebar drawer state
  setUser: (user: ClientUser | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setAuthLoaded: (loaded: boolean) => void;
  setUnreadNotifications: (count: number) => void;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
}
```

---

## 5. Routing Architecture

Routing is managed by `react-router-dom` (v7) via `BrowserRouter`:

| Path | Component | Access | Purpose |
| :--- | :--- | :--- | :--- |
| `/login` | `Login.tsx` | Public | Authentication with Google Sign-In & Email/Password |
| `/auth/callback` | `AuthCallback.tsx` | Public | OAuth callback redirect processor |
| `/invite/:code` | `Invite.tsx` | Public | Invite link landing page for user referrals |
| `/` | `Timeline.tsx` | Protected | Personal chronological travel journey |
| `/map` | `Map.tsx` | Protected | Full-screen interactive map with geolocated photo clusters |
| `/upload` | `Upload.tsx` | Protected | Photo uploader with EXIF parsing & clustering |
| `/folder/:id` | `FolderDetail.tsx` | Protected | Location folder details, photo grid, comments, reactions |
| `/friends` | `Friends.tsx` | Protected | Social friends list, requests, search |
| `/feed` | `Feed.tsx` | Protected | Social stream of friends' trips, posts, and stories |
| `/explore` | `Explore.tsx` | Protected | Public discovery feed and trending locations |
| `/messages` | `Messages.tsx` | Protected | Real-time 1-on-1 private messaging |
| `/profile/:uid` | `Profile.tsx` | Protected | User public profile, travel stats, and albums |
| `/story-viewer` | `StoryViewer.tsx` | Protected | Full-screen 24-hour expiring story player |
| `/dashboard` | `Dashboard.tsx` | Protected | Travel analytics, visited countries counter, activity metrics |

---

## 6. Key Architectural Patterns & Algorithms

### 6.1 EXIF Extraction & DBSCAN Spatial Clustering

When photos are uploaded in [Upload.tsx](file:///d:/geosnap-main/geosnap-main/src/pages/Upload.tsx):
1. **EXIF Parsing**: `exifr.parse(file, ['latitude', 'longitude', 'DateTimeOriginal'])` extracts GPS coordinates and original capture timestamps.
2. **Spatial Clustering (DBSCAN 200m)**:
   - For each photo with GPS coordinates $(lat_1, lng_1)$, the distance to existing folders or batch centroid is calculated using the Haversine formula:
     $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
   - If distance $d \le 200\text{ meters}$, the photo is grouped into that existing folder cluster.
   - If $d > 200\text{ meters}$, a new folder cluster is spawned.
3. **Reverse Geocoding**: Coordinates are reverse-geocoded using OpenStreetMap Nominatim (`lib/geocoding.ts`) with client-side rate limiting and caching to resolve `country`, `city`, `district`, and `street`.
4. **Folder Creation**: Photos are uploaded to Firebase Storage, compressed, and linked to newly created or updated `folders` documents.

### 6.2 Offline Action Queue & Synchronization (`lib/offlineManager.ts`)

- **State Detection**: Listens to `window.online` and `window.offline` events.
- **Action Queueing**: Mutations (`CREATE_FOLDER`, `UPDATE_FOLDER`, `DELETE_FOLDER`, `CREATE_POST`, `REACT_ITEM`, `POST_COMMENT`) occurring while disconnected are stored in `localStorage` under `geosnap_offline_queue`.
- **Sync Dispatcher**: When connection is restored, `syncOfflineQueue()` iterates through pending mutations with a maximum retry ceiling (`MAX_RETRIES = 3`).
- **Data Caching**: Arbitrary JSON datasets are cached locally via `cacheOfflineData()` with customizable TTL (`maxAgeMs = 7 days`).

### 6.3 PWA Service Worker & Workbox Caching (`vite.config.ts`)

`VitePWA` is configured with comprehensive precaching and runtime caching strategies:
- **Precached Assets**: All build bundles, CSS, HTML, SVG, and fonts up to 5MB.
- **Google Fonts Cache**: `CacheFirst` for `https://fonts.googleapis.com/.*` (1 year TTL).
- **Map Tiles Cache**: `CacheFirst` for `basemaps.cartocdn.com` (200 tile limit, 7-day TTL) for seamless offline map exploration.
- **Firebase Storage Cache**: `StaleWhileRevalidate` for `firebasestorage.googleapis.com` (100 images, 24h TTL).

---

## 7. Build Pipeline & Chunk Splitting Strategy

The Vite build config employs manual chunking to isolate third-party vendor dependencies:

```typescript
build: {
  chunkSizeWarningLimit: 600,
  rollupOptions: {
    output: {
      manualChunks: {
        'react-core': ['react', 'react-dom', 'react-router-dom'],
        'map-libs': ['leaflet', 'react-leaflet'],
        'motion': ['motion'],
        'ui-utils': ['lucide-react', 'clsx', 'tailwind-merge', 'date-fns'],
      }
    }
  }
}
```

### Native Android Bridge (Capacitor)
- Native configuration in `capacitor.config.ts` packages the `dist/` web output into the Android shell (`android/app`).
- Plugins handle native camera permissions, geolocation, and push notifications via `@capacitor/push-notifications`.

---

## 8. CI/CD Workflows

GeoSnap employs GitHub Actions for automated continuous integration, deployment, and native APK releases:

### 8.1 Android APK Release Build (`.github/workflows/build-apk.yml`)
- **Trigger**: Push to `main` branch or manual `workflow_dispatch`.
- **Environment**: Ubuntu 22.04, Node.js 20, Java 21 (Zulu distribution).
- **Execution**:
  1. `npm ci --legacy-peer-deps`
  2. `npm run build` (Compiles Vite web assets to `dist/`)
  3. `npx cap sync android` (Synchronizes web distribution to Android native asset folder)
  4. `./gradlew assembleRelease --no-daemon` (Builds unsigned release APK)
  5. Uploads `geosnap-release-apk` artifact.
  6. Creates GitHub Release tagged `v${{ github.run_number }}` with APK download asset.

### 8.2 Firebase Hosting Deployment (`.github/workflows/deploy-firebase.yml`)
- **Trigger**: Push to `main` branch or manual `workflow_dispatch`.
- **Environment**: Ubuntu Latest, Node.js 20.
- **Execution**:
  1. `npm ci --legacy-peer-deps && npm run build`
  2. Authenticates via `FIREBASE_SERVICE_ACCOUNT_GEOSNAP_4DD7A` or `FIREBASE_TOKEN`.
  3. `npx firebase-tools deploy --only hosting --project geosnap-4dd7a`.
