import { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { ToastProvider, useToast } from './components/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { registerToastNotifier } from './lib/asyncErrorHandler';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { Sun, Moon, Menu, X } from 'lucide-react';
import { initializePushNotifications } from './services/notifications';

const Login = lazy(() => import('./pages/Login'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const Timeline = lazy(() => import('./pages/Timeline'));
const Upload = lazy(() => import('./pages/Upload'));
const MapViewPage = lazy(() => import('./pages/Map'));
const FolderDetail = lazy(() => import('./pages/FolderDetail'));
const Friends = lazy(() => import('./pages/Friends'));
const InvitePage = lazy(() => import('./pages/Invite'));
const Feed = lazy(() => import('./pages/Feed'));
const Profile = lazy(() => import('./pages/Profile'));
const Messages = lazy(() => import('./pages/Messages'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const StoryViewer = lazy(() => import('./pages/StoryViewer'));
const Explore = lazy(() => import('./pages/Explore'));
const WorkspacePage = lazy(() => import('./pages/WorkspacePage'));

function LoadingFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-bg-deep">
      <div className="w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { OfflineBanner } from './components/OfflineBanner';
import { UserProfile } from './types';

const NAV_ITEMS = [
  {
    to: '/', label: 'Timeline', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    )
  },
  {
    to: '/map', label: 'Map', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
        <line x1="9" y1="3" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="21"/>
      </svg>
    )
  },
  {
    to: '/workspace', label: 'Workspace', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
        <path d="M6 6h10"/><path d="M6 10h10"/>
      </svg>
    )
  },
  {
    to: '/upload', label: 'Upload', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    )
  },
  {
    to: '/feed', label: 'Bảng tin', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2"/>
      </svg>
    )
  },
  {
    to: '/messages', label: 'Nhắn tin', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    )
  },
  {
    to: '/explore', label: 'Khám phá', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
      </svg>
    )
  },
  {
    to: '/friends', label: 'Bạn bè', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    )
  },
  {
    to: '/dashboard', label: 'Thống kê', icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    )
  },
];

function AppContent() {
  const { user, userProfile, authLoaded, unreadNotifications, theme, sidebarOpen, setUser, setAuthLoaded, setUserProfile, toggleTheme, setSidebarOpen } = useAppStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const isFullHeightPage = ['/messages', '/map', '/workspace'].some((p) =>
    location.pathname.startsWith(p)
  );

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Register toast instance for asyncErrorHandler
  useEffect(() => {
    registerToastNotifier(toast);
  }, [toast]);

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    if (user) {
      initializePushNotifications(toast);
    }
  }, [user, toast]);

  // Authenticate user via Firebase Auth on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setUserProfile(null);
        setAuthLoaded(true);
        return;
      }

      try {
        let profile: UserProfile | null = null;
        try {
          const docSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (docSnap.exists()) {
            profile = docSnap.data() as UserProfile;
          }
        } catch (e) {
          console.warn('Could not fetch from Firestore, using auth fallback:', e);
        }

        if (!profile) {
          profile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'User',
            avatarUrl: firebaseUser.photoURL || undefined,
            role: 'user',
            createdAt: new Date().toISOString(),
          };
        }

        setUser({
          uid: profile.uid,
          email: profile.email,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUrl,
        });
        setUserProfile(profile);
      } catch (err) {
        console.error('Failed to process auth state:', err);
      } finally {
        setAuthLoaded(true);
      }
    });

    return () => unsubscribe();
  }, [setUser, setUserProfile, setAuthLoaded]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Logout error:', e);
    }
    setUser(null);
    setUserProfile(null);
    navigate('/login');
  };

  if (!authLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-deep">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand shadow-[0_0_30px_rgba(255,107,53,0.5)] animate-pulse" />
          <div className="text-text-dim text-sm">Đang tải GeoSnap...</div>
        </div>
      </div>
    );
  }

  const avatarUrl = userProfile?.avatarUrl || user?.avatarUrl;
  const displayName = userProfile?.displayName || user?.displayName || user?.email || 'User';
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
      {/* Public invite page - no sidebar */}
      <Route path="/invite/:code" element={<InvitePage />} />
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* App with sidebar */}
      <Route path="/*" element={
        !user ? <Navigate to="/login" /> : (
          <div className="flex h-screen overflow-hidden relative">
            <div className="atmosphere" />
            <OfflineBanner />

            {/* Mobile overlay */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 bg-overlay z-30 md:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Desktop Sidebar */}
            <aside className={`desktop-sidebar w-[240px] bg-sidebar-bg border-r border-border-dim backdrop-blur-xl flex flex-col shrink-0 relative z-10 ${sidebarOpen ? 'fixed inset-y-0 left-0 z-40 !flex md:relative' : ''}`}>
              {/* Logo */}
              <div className="px-6 pt-8 pb-6 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-brand rounded-lg shadow-[0_0_20px_rgba(255,107,53,0.4)] flex items-center justify-center brand-pulse">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <span className="text-[20px] font-extrabold tracking-tight text-text-heading">GeoSnap</span>
                </div>
                {/* Close button - mobile only */}
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="md:hidden p-1.5 rounded-lg text-text-dim hover:text-text-main hover:bg-surface transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nav */}
              <nav className="flex-1 px-3">
                <ul className="flex flex-col gap-1">
                  {NAV_ITEMS.map(item => (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === '/'}
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-150 ${
                            isActive
                              ? 'bg-brand/15 text-brand shadow-[inset_0_0_0_1px_rgba(255,107,53,0.25)]'
                              : 'text-text-dim hover:text-text-main hover:bg-card-hover'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <span className={isActive ? 'text-brand' : 'text-text-dim'}>{item.icon}</span>
                            {item.label}
                            {item.label === 'Bạn bè' && unreadNotifications > 0 && (
                              <span className="ml-auto w-5 h-5 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center">
                                {unreadNotifications > 9 ? '9+' : unreadNotifications}
                              </span>
                            )}
                          </>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* Theme Toggle */}
              <div className="px-4 pb-2">
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[14px] font-medium text-text-dim hover:text-text-main hover:bg-card-hover transition-all"
                >
                  {theme === 'dark' ? (
                    <><Sun className="w-[18px] h-[18px]" /> Chế độ sáng</>
                  ) : (
                    <><Moon className="w-[18px] h-[18px]" /> Chế độ tối</>
                  )}
                </button>
              </div>

              {/* User Profile Bottom */}
              <div className="p-4 border-t border-border-dim">
                <div
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-card-hover transition-all cursor-pointer group"
                  onClick={() => { setSidebarOpen(false); navigate(`/profile/${user?.uid}`); }}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={displayName} className="w-9 h-9 rounded-full object-cover ring-2 ring-border-dim group-hover:ring-brand/40 transition-all no-transition" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-brand font-bold text-sm">
                      {avatarInitial}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-text-main truncate">{displayName}</div>
                    <div className="text-[11px] text-text-dim truncate">{user?.email}</div>
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLogout(); }}
                    title="Đăng xuất"
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-text-dim hover:text-red-400"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                  </button>
                </div>
              </div>
            </aside>

            {/* Main content */}
            <main className={`flex-1 relative bg-bg-deep main-content flex flex-col ${isFullHeightPage ? 'overflow-hidden !pb-0' : 'overflow-auto'}`}>
              {/* Mobile Header */}
              <div className="md:hidden sticky top-0 z-20 bg-bg-deep/80 backdrop-blur-xl border-b border-border-dim px-4 py-3 flex items-center justify-between shrink-0">
                <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-card-hover transition-colors">
                  <Menu className="w-5 h-5 text-text-main" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-brand rounded-md flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <span className="text-[16px] font-bold text-text-heading">GeoSnap</span>
                </div>
                <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-card-hover transition-colors">
                  {theme === 'dark' ? <Sun className="w-5 h-5 text-text-dim" /> : <Moon className="w-5 h-5 text-text-dim" />}
                </button>
              </div>

              <ErrorBoundary resetKeys={[location.pathname]} title="Lỗi tải trang">
                <Routes>
                  <Route path="/workspace" element={<WorkspacePage />} />
                  <Route path="/workspace/:workspaceId" element={<WorkspacePage />} />
                  <Route path="/workspace/:workspaceId/page/:pageId" element={<WorkspacePage />} />
                  <Route path="/" element={<Timeline />} />
                  <Route path="/map" element={<MapViewPage />} />
                  <Route path="/upload" element={<Upload />} />
                  <Route path="/folder/:id" element={<FolderDetail />} />
                  <Route path="/friends" element={<Friends />} />
                  <Route path="/feed" element={<Feed />} />
                  <Route path="/explore" element={<Explore />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/profile/:uid" element={<Profile />} />
                  <Route path="/story-viewer" element={<StoryViewer />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </ErrorBoundary>
              <PWAInstallPrompt />
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-20 bg-bg-deep/90 backdrop-blur-xl border-t border-border-dim px-2 py-1 items-center justify-around">
              {NAV_ITEMS.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-[10px] font-medium transition-all ${
                      isActive ? 'text-brand' : 'text-text-dim'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={isActive ? 'text-brand' : 'text-text-dim'}>{item.icon}</span>
                      <span>{item.label}</span>
                      {item.label === 'Bạn bè' && unreadNotifications > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand text-white text-[8px] font-bold flex items-center justify-center">
                          {unreadNotifications > 9 ? '9+' : unreadNotifications}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        )
      } />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}
