import { describe, it, expect } from 'vitest';
import { folderToPage, photosToBlocks } from '../migrationAdapter';
import type { LocationFolder, Photo } from '../../types';
import { SCHEMA_VERSION } from '../../types';

describe('migrationAdapter', () => {
  it('converts a legacy LocationFolder to a virtual Page correctly', () => {
    const folder: LocationFolder & { id: string } = {
      id: 'folder_123',
      uid: 'user_456',
      name: 'Chuyến đi Đà Lạt',
      centerLat: 11.9404,
      centerLng: 108.4583,
      coverPhotoUrl: 'https://example.com/cover.jpg',
      photoCount: 15,
      createdAt: '2026-08-01T10:00:00.000Z',
      visibility: 'public',
      description: 'Chuyến đi săn mây tuyệt vời',
    };

    const page = folderToPage(folder);

    expect(page.id).toBe('legacy_folder_123');
    expect(page.title).toBe('Chuyến đi Đà Lạt');
    expect(page.cover).toBe('https://example.com/cover.jpg');
    expect(page.createdBy).toBe('user_456');
    expect(page.visibility).toBe('public');
    expect(page.legacyFolderId).toBe('folder_123');
    expect(page.legacyType).toBe('folder');
    expect(page.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('converts legacy Photos into virtual gallery and map blocks', () => {
    const photos: Photo[] = [
      {
        id: 'photo_1',
        uid: 'user_456',
        url: 'https://example.com/p1.jpg',
        hasGps: true,
        latitude: 11.94,
        longitude: 108.45,
        uploadedAt: '2026-08-01T10:05:00.000Z',
      },
      {
        id: 'photo_2',
        uid: 'user_456',
        url: 'https://example.com/p2.jpg',
        hasGps: true,
        latitude: 11.95,
        longitude: 108.46,
        uploadedAt: '2026-08-01T10:10:00.000Z',
      },
      {
        id: 'photo_3',
        uid: 'user_456',
        url: 'https://example.com/p3.jpg',
        hasGps: false,
        uploadedAt: '2026-08-01T10:15:00.000Z',
      },
    ];

    const blocks = photosToBlocks(photos, 'folder_123');

    expect(blocks.length).toBe(2); // 1 gallery block + 1 map block
    expect(blocks[0].type).toBe('gallery');
    expect(blocks[0].pageId).toBe('legacy_folder_123');
    expect((blocks[0].data as any).assetIds).toEqual(['photo_1', 'photo_2', 'photo_3']);

    expect(blocks[1].type).toBe('map');
    expect(blocks[1].pageId).toBe('legacy_folder_123');
    expect((blocks[1].data as any).markerAssetIds).toEqual(['photo_1', 'photo_2']);
    expect((blocks[1].data as any).centerLat).toBeCloseTo(11.945);
    expect((blocks[1].data as any).centerLng).toBeCloseTo(108.455);
  });

  it('returns only gallery block when photos have no GPS coordinates', () => {
    const photos: Photo[] = [
      {
        id: 'photo_1',
        uid: 'user_456',
        url: 'https://example.com/p1.jpg',
        hasGps: false,
        uploadedAt: '2026-08-01T10:05:00.000Z',
      },
    ];

    const blocks = photosToBlocks(photos, 'folder_nogps');

    expect(blocks.length).toBe(1);
    expect(blocks[0].type).toBe('gallery');
  });

  it('returns empty array when no photos provided', () => {
    const blocks = photosToBlocks([], 'folder_empty');
    expect(blocks).toEqual([]);
  });
});
