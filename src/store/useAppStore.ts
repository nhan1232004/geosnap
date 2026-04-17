import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AppState {
  user: User | null;
  authLoaded: boolean;
  setUser: (user: User | null) => void;
  setAuthLoaded: (loaded: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  authLoaded: false,
  setUser: (user) => set({ user }),
  setAuthLoaded: (loaded) => set({ authLoaded: loaded }),
}));
