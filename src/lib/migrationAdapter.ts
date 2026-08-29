import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import type { LocationFolder, Photo, Page, Block } from '../types';
import { SCHEMA_VERSION } from '../types';
import type { GalleryData, MapData, ParagraphData } from '../types';
import { createPage, createBlock } from './workspaceService';

/**
 * Convert a legacy LocationFolder to a virtual Page object (read-only, no write).
 * Used for rendering legacy data in the new page UI before migration.
 */
export function folderToPage(folder: LocationFolder & { id: string }): Page {
  return {
    id: `legacy_${folder.id}`,
    workspaceId: '', // Will be set during actual migration
    parentPageId: null,
    title: folder.name,
    icon: '📍',
    cover: folder.coverPhotoUrl,
    createdBy: folder.uid,
    updatedBy: folder.uid,
    createdAt: folder.createdAt,
    updatedAt: folder.createdAt,
    visibility: folder.visibility || 'private',
    sortKey: 0,
    schemaVersion: SCHEMA_VERSION,
    legacyFolderId: folder.id,
    legacyType: 'folder',
  };
}

/**
 * Convert legacy Photos into virtual Block objects for rendering.
 */
export function photosToBlocks(photos: Photo[], folderId: string): Block[] {
  const blocks: Block[] = [];
  const now = new Date().toISOString();

  // Create gallery block from all photos
  if (photos.length > 0) {
    const galleryData: GalleryData = {
      assetIds: photos.map((p) => p.id || ''),
      layout: 'grid',
      columns: 3,
    };
    blocks.push({
      id: `legacy_gallery_${folderId}`,
      pageId: `legacy_${folderId}`,
      parentBlockId: null,
      type: 'gallery',
      order: 0,
      data: galleryData as unknown as Record<string, unknown>,
      createdBy: photos[0]?.uid || '',
      updatedBy: photos[0]?.uid || '',
      createdAt: now,
      updatedAt: now,
      schemaVersion: SCHEMA_VERSION,
    });
  }

  // Create map block from GPS photos
  const gpsPhotos = photos.filter((p) => p.hasGps && p.latitude && p.longitude);
  if (gpsPhotos.length > 0) {
    const avgLat = gpsPhotos.reduce((s, p) => s + (p.latitude || 0), 0) / gpsPhotos.length;
    const avgLng = gpsPhotos.reduce((s, p) => s + (p.longitude || 0), 0) / gpsPhotos.length;
    const mapData: MapData = {
      centerLat: avgLat,
      centerLng: avgLng,
      zoom: 13,
      markerAssetIds: gpsPhotos.map((p) => p.id || ''),
    };
    blocks.push({
      id: `legacy_map_${folderId}`,
      pageId: `legacy_${folderId}`,
      parentBlockId: null,
      type: 'map',
      order: 1,
      data: mapData as unknown as Record<string, unknown>,
      createdBy: photos[0]?.uid || '',
      updatedBy: photos[0]?.uid || '',
      createdAt: now,
      updatedAt: now,
      schemaVersion: SCHEMA_VERSION,
    });
  }

  return blocks;
}

/**
 * Check if a folder has already been migrated.
 */
export async function isMigrated(legacyFolderId: string): Promise<boolean> {
  const q = query(
    collection(db, 'pages'),
    where('legacyFolderId', '==', legacyFolderId)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

/**
 * Migrate a single legacy folder to a real Page + Blocks.
 * Returns the created page, or null if already migrated.
 */
export async function migrateFolder(
  folder: LocationFolder & { id: string },
  photos: Photo[],
  workspaceId: string
): Promise<Page | null> {
  // Check if already migrated
  if (await isMigrated(folder.id)) {
    console.log(`Folder ${folder.id} already migrated, skipping.`);
    return null;
  }

  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  // Create the page
  const page = await createPage(workspaceId, null, folder.name, {
    icon: '📍',
    cover: folder.coverPhotoUrl,
    visibility: folder.visibility || 'private',
    legacyFolderId: folder.id,
    legacyType: 'folder',
  });

  // Create description block if exists
  if (folder.description) {
    const paragraphData: ParagraphData = { text: folder.description };
    await createBlock(page.id, 'paragraph', paragraphData as unknown as Record<string, unknown>);
  }

  // Create gallery block
  if (photos.length > 0) {
    const galleryData: GalleryData = {
      assetIds: photos.map((p) => p.id || ''),
      layout: 'grid',
      columns: 3,
    };
    await createBlock(page.id, 'gallery', galleryData as unknown as Record<string, unknown>);
  }

  // Create map block from GPS photos
  const gpsPhotos = photos.filter((p) => p.hasGps && p.latitude && p.longitude);
  if (gpsPhotos.length > 0) {
    const avgLat = gpsPhotos.reduce((s, p) => s + (p.latitude || 0), 0) / gpsPhotos.length;
    const avgLng = gpsPhotos.reduce((s, p) => s + (p.longitude || 0), 0) / gpsPhotos.length;
    const mapData: MapData = {
      centerLat: avgLat,
      centerLng: avgLng,
      zoom: 13,
      markerAssetIds: gpsPhotos.map((p) => p.id || ''),
    };
    await createBlock(page.id, 'map', mapData as unknown as Record<string, unknown>);
  }

  console.log(`Migrated folder "${folder.name}" → page ${page.id}`);
  return page;
}

/**
 * Migrate multiple folders in batch with progress tracking.
 */
export async function migrateBatch(
  folders: (LocationFolder & { id: string })[],
  photosMap: Map<string, Photo[]>,
  workspaceId: string,
  onProgress?: (completed: number, total: number, current: string) => void
): Promise<{ migrated: Page[]; skipped: string[]; errors: { folderId: string; error: string }[] }> {
  const result = {
    migrated: [] as Page[],
    skipped: [] as string[],
    errors: [] as { folderId: string; error: string }[],
  };

  for (let i = 0; i < folders.length; i++) {
    const folder = folders[i];
    onProgress?.(i, folders.length, folder.name);

    try {
      const photos = photosMap.get(folder.id) || [];
      const page = await migrateFolder(folder, photos, workspaceId);
      if (page) {
        result.migrated.push(page);
      } else {
        result.skipped.push(folder.id);
      }
    } catch (err: any) {
      console.error(`Failed to migrate folder ${folder.id}:`, err);
      result.errors.push({ folderId: folder.id, error: err.message || 'Unknown error' });
    }
  }

  onProgress?.(folders.length, folders.length, 'Done');
  return result;
}
