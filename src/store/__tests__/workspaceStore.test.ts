import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkspaceStore } from '../workspaceStore';
import type { Page } from '../../types';

describe('workspaceStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useWorkspaceStore.setState({
      activeWorkspaceId: null,
      activePageId: null,
      pageTree: [],
      recentPages: [],
      favoritePageIds: [],
      isPageTreeLoading: false,
    });
  });

  it('manages active workspace and page state', () => {
    const store = useWorkspaceStore.getState();
    store.setActiveWorkspace('ws_123');
    store.setActivePage('page_456');

    expect(useWorkspaceStore.getState().activeWorkspaceId).toBe('ws_123');
    expect(useWorkspaceStore.getState().activePageId).toBe('page_456');
  });

  it('manages favorites and persists to localStorage', () => {
    const store = useWorkspaceStore.getState();
    store.addToFavorites('page_1');
    store.addToFavorites('page_2');

    expect(useWorkspaceStore.getState().favoritePageIds).toEqual(['page_1', 'page_2']);
    expect(JSON.parse(localStorage.getItem('geosnap_favorites') || '[]')).toEqual(['page_1', 'page_2']);

    store.removeFromFavorites('page_1');
    expect(useWorkspaceStore.getState().favoritePageIds).toEqual(['page_2']);
    expect(JSON.parse(localStorage.getItem('geosnap_favorites') || '[]')).toEqual(['page_2']);
  });

  it('maintains recent pages list up to max limit without duplicates', () => {
    const store = useWorkspaceStore.getState();
    const samplePage1: Page = {
      id: 'page_1',
      workspaceId: 'ws_1',
      parentPageId: null,
      title: 'Hà Nội',
      createdBy: 'u1',
      updatedBy: 'u1',
      createdAt: '2026-08-01',
      updatedAt: '2026-08-01',
      visibility: 'private',
      sortKey: 0,
      schemaVersion: 1,
    };

    const samplePage2: Page = {
      ...samplePage1,
      id: 'page_2',
      title: 'Sài Gòn',
    };

    store.addToRecent(samplePage1);
    store.addToRecent(samplePage2);
    store.addToRecent(samplePage1); // re-visit page 1

    const recent = useWorkspaceStore.getState().recentPages;
    expect(recent.length).toBe(2);
    expect(recent[0].id).toBe('page_1'); // most recently added is first
    expect(recent[1].id).toBe('page_2');
  });
});
