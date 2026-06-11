import { create } from 'zustand';
import { User } from 'firebase/auth';
import { UserProfile } from '../types';

type Theme = 'dark' | 'light';

function getInitialTheme(): Theme {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('geosnap-theme');
    if (stored === 'dark' || stored === 'light') return stored;
    // Default to dark
    return 'dark';
  }
  return 'dark';
}

interface AppState {
  user: User | null;
  userProfile: UserProfile | null;
  authLoaded: boolean;
  unreadNotifications: number;
  theme: Theme;
  sidebarOpen: boolean;
  setUser: (user: User | null) => void;
  setUserProfile: (profile: UserProfile | null) => void;
  setAuthLoaded: (loaded: boolean) => void;
  setUnreadNotifications: (count: number) => void;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  userProfile: null,
  authLoaded: false,
  unreadNotifications: 0,
  theme: getInitialTheme(),
  sidebarOpen: false,
  setUser: (user) => set({ user }),
  setUserProfile: (profile) => set({ userProfile: profile }),
  setAuthLoaded: (loaded) => set({ authLoaded: loaded }),
  setUnreadNotifications: (count) => set({ unreadNotifications: count }),
  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('geosnap-theme', newTheme);
    set({ theme: newTheme });
  },
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
