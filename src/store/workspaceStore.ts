import { create } from 'zustand';
import type { Page, PageTreeNode } from '../types';

interface WorkspaceState {
  activeWorkspaceId: string | null;
  activePageId: string | null;
  pageTree: PageTreeNode[];
  recentPages: Page[];
  favoritePageIds: string[];
  isPageTreeLoading: boolean;

  setActiveWorkspace: (id: string | null) => void;
  setActivePage: (id: string | null) => void;
  setPageTree: (tree: PageTreeNode[]) => void;
  setRecentPages: (pages: Page[]) => void;
  addToRecent: (page: Page) => void;
  addToFavorites: (pageId: string) => void;
  removeFromFavorites: (pageId: string) => void;
  setPageTreeLoading: (loading: boolean) => void;
}

const MAX_RECENT_PAGES = 10;

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  activeWorkspaceId: null,
  activePageId: null,
  pageTree: [],
  recentPages: [],
  favoritePageIds: JSON.parse(localStorage.getItem('geosnap_favorites') || '[]'),
  isPageTreeLoading: false,

  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),
  setActivePage: (id) => set({ activePageId: id }),
  setPageTree: (tree) => set({ pageTree: tree }),
  setRecentPages: (pages) => set({ recentPages: pages }),

  addToRecent: (page) => {
    const current = get().recentPages;
    const filtered = current.filter((p) => p.id !== page.id);
    const updated = [page, ...filtered].slice(0, MAX_RECENT_PAGES);
    set({ recentPages: updated });
  },

  addToFavorites: (pageId) => {
    const current = get().favoritePageIds;
    if (!current.includes(pageId)) {
      const updated = [...current, pageId];
      localStorage.setItem('geosnap_favorites', JSON.stringify(updated));
      set({ favoritePageIds: updated });
    }
  },

  removeFromFavorites: (pageId) => {
    const current = get().favoritePageIds;
    const updated = current.filter((id) => id !== pageId);
    localStorage.setItem('geosnap_favorites', JSON.stringify(updated));
    set({ favoritePageIds: updated });
  },

  setPageTreeLoading: (loading) => set({ isPageTreeLoading: loading }),
}));
