import { describe, it, expect, beforeEach } from 'vitest';
import { findMatchingFolder } from '../lib/clustering';
import { getDistanceMeters } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { Validators, validateOrThrow } from '../lib/validators';
import { generateTripSummary } from '../lib/geminiService';
import { formatFileSize, getOptimizedImageUrl, getImagePlaceholder } from '../lib/imageOptimizer';
import {
  mergePaginatedData,
  deduplicateItems,
  sortByDateDesc,
  filterItems,
  flattenPaginatedResponses,
} from '../lib/pagination';

describe('=== COMPREHENSIVE GEOSNAP SYSTEM AUDIT ===', () => {

  describe('1. Authentication & Global State Store (useAppStore)', () => {
    beforeEach(() => {
      useAppStore.setState({
        user: null,
        userProfile: null,
        unreadNotifications: 0,
        theme: 'dark',
        sidebarOpen: false,
      });
    });

    it('should initialize with default null state', () => {
      const state = useAppStore.getState();
      expect(state.user).toBeNull();
      expect(state.userProfile).toBeNull();
      expect(state.unreadNotifications).toBe(0);
    });

    it('should set and clear user session properly', () => {
      const mockUser = {
        uid: 'user_123',
        email: 'test@geosnap.app',
        displayName: 'Test User',
      };
      useAppStore.getState().setUser(mockUser);
      expect(useAppStore.getState().user?.uid).toBe('user_123');

      useAppStore.getState().setUser(null);
      useAppStore.getState().setUserProfile(null);
      expect(useAppStore.getState().user).toBeNull();
      expect(useAppStore.getState().userProfile).toBeNull();
    });

    it('should manage unread notification badges', () => {
      useAppStore.getState().setUnreadNotifications(5);
      expect(useAppStore.getState().unreadNotifications).toBe(5);
    });

    it('should toggle theme and update sidebar state', () => {
      const initialTheme = useAppStore.getState().theme;
      useAppStore.getState().toggleTheme();
      expect(useAppStore.getState().theme).not.toBe(initialTheme);

      useAppStore.getState().setSidebarOpen(true);
      expect(useAppStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe('2. Photo Clustering & Spatial Algorithms (clustering.ts & utils.ts)', () => {
    it('should accurately calculate distance between coordinates (Haversine)', () => {
      // Hanoi Opera House -> Hoan Kiem Lake (~1km)
      const hanoiOpera = { lat: 21.0245, lng: 105.8576 };
      const hoanKiem = { lat: 21.0285, lng: 105.8542 };
      const dist = getDistanceMeters(hanoiOpera.lat, hanoiOpera.lng, hoanKiem.lat, hoanKiem.lng);
      expect(dist).toBeGreaterThan(400);
      expect(dist).toBeLessThan(1000);
    });

    it('should match an existing folder if photo is within 200m cluster threshold', () => {
      const folders = [
        { id: 'f1', name: 'Hồ Gươm', centerLat: 21.0285, centerLng: 105.8542 },
        { id: 'f2', name: 'Nhà hát lớn', centerLat: 21.0245, centerLng: 105.8576 },
      ];
      // Photo ~50m from Hoan Kiem
      const nearbyPhoto = { lat: 21.0286, lng: 105.8543 };
      const matched = findMatchingFolder(nearbyPhoto.lat, nearbyPhoto.lng, folders);
      expect(matched).not.toBeNull();
      expect(matched?.id).toBe('f1');
    });

    it('should return null if photo is farther than 200m from all existing folders', () => {
      const folders = [
        { id: 'f1', name: 'Hồ Gươm', centerLat: 21.0285, centerLng: 105.8542 },
      ];
      // Photo in Da Nang (~600km away)
      const daNangPhoto = { lat: 16.0544, lng: 108.2022 };
      const matched = findMatchingFolder(daNangPhoto.lat, daNangPhoto.lng, folders);
      expect(matched).toBeNull();
    });
  });

  describe('3. Schema Validators & Data Integrity (validators.ts)', () => {
    it('should validate user profile schema', () => {
      const validUser = {
        uid: 'u_1',
        email: 'user@test.com',
        role: 'user',
        displayName: 'John Doe',
      };
      const res = Validators.userProfile(validUser);
      expect(res.valid).toBe(true);
      expect(res.data?.uid).toBe('u_1');

      const invalidUser = {
        displayName: 'No UID',
      };
      const badRes = Validators.userProfile(invalidUser);
      expect(badRes.valid).toBe(false);
    });

    it('should validate location folder schema', () => {
      const validFolder = {
        name: 'Chuyến đi Hà Nội',
        centerLat: 21.0285,
        centerLng: 105.8542,
        photoCount: 5,
        visibility: 'friends',
      };
      const res = Validators.locationFolder(validFolder);
      expect(res.valid).toBe(true);
      expect(res.data?.name).toBe('Chuyến đi Hà Nội');

      const invalidFolder = {
        name: '',
        centerLat: 'invalid-lat',
      };
      const badRes = Validators.locationFolder(invalidFolder);
      expect(badRes.valid).toBe(false);
    });

    it('should validate post schema', () => {
      const validPost = {
        uid: 'u_1',
        content: 'Khám phá Hà Nội!',
        type: 'post',
        visibility: 'public',
      };
      const res = Validators.post(validPost);
      expect(res.valid).toBe(true);
      expect(res.data?.content).toBe('Khám phá Hà Nội!');

      const badPost = { content: 'No UID' };
      expect(Validators.post(badPost).valid).toBe(false);
    });

    it('should validate email and password formats', () => {
      expect(Validators.email('test@geosnap.app')).toBe(true);
      expect(Validators.email('invalid-email')).toBe(false);

      expect(Validators.password('123456')).toBe(true);
      expect(Validators.password('123')).toBe(false);
    });
  });

  describe('4. Workspace State & Tree Hierarchy (workspaceStore.ts)', () => {
    beforeEach(() => {
      useWorkspaceStore.setState({
        activeWorkspaceId: null,
        activePageId: null,
        pageTree: [],
        recentPages: [],
        favoritePageIds: [],
        isPageTreeLoading: false,
      });
    });

    it('should set active workspace and page', () => {
      useWorkspaceStore.getState().setActiveWorkspace('ws_1');
      useWorkspaceStore.getState().setActivePage('page_1');

      expect(useWorkspaceStore.getState().activeWorkspaceId).toBe('ws_1');
      expect(useWorkspaceStore.getState().activePageId).toBe('page_1');
    });

    it('should manage favorite pages', () => {
      useWorkspaceStore.getState().addToFavorites('page_1');
      expect(useWorkspaceStore.getState().favoritePageIds).toContain('page_1');

      useWorkspaceStore.getState().removeFromFavorites('page_1');
      expect(useWorkspaceStore.getState().favoritePageIds).not.toContain('page_1');
    });

    it('should track recent pages up to MAX_RECENT_PAGES (10)', () => {
      for (let i = 1; i <= 15; i++) {
        useWorkspaceStore.getState().addToRecent({
          id: `p_${i}`,
          workspaceId: 'ws_1',
          parentPageId: null,
          title: `Page ${i}`,
          createdBy: 'u_1',
          updatedBy: 'u_1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          visibility: 'private',
          sortKey: i,
          schemaVersion: 1,
        });
      }
      expect(useWorkspaceStore.getState().recentPages.length).toBe(10);
      expect(useWorkspaceStore.getState().recentPages[0].id).toBe('p_15');
    });
  });

  describe('5. AI Assistant & Fallback Service (geminiService.ts)', () => {
    it('should gracefully provide smart fallback when API key is not configured', async () => {
      const result = await generateTripSummary('Hồ Gươm', 'Hà Nội', 'Việt Nam', 12);
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('tags');
      expect(result.title).toContain('Hồ Gươm');
      expect(result.summary).toContain('12');
      expect(Array.isArray(result.tags)).toBe(true);
    });
  });

  describe('6. Utilities, Optimization & Pagination', () => {
    it('should format file sizes cleanly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(500)).toBe('500 Bytes');
      expect(formatFileSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
    });

    it('should calculate placeholder aspect ratio', () => {
      const placeholder = getImagePlaceholder(600, 300);
      expect(placeholder.paddingBottom).toBe('50%');
    });

    it('should deduplicate and sort paginated items', () => {
      const items = [
        { id: '1', name: 'A', createdAt: '2026-01-01T00:00:00Z' },
        { id: '2', name: 'B', createdAt: '2026-01-03T00:00:00Z' },
        { id: '1', name: 'A-dup', createdAt: '2026-01-01T00:00:00Z' },
      ];
      const deduped = deduplicateItems(items, 'id');
      expect(deduped.length).toBe(2);

      const sorted = sortByDateDesc(deduped, 'createdAt');
      expect(sorted[0].id).toBe('2');
    });
  });

});
