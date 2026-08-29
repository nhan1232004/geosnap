// GeoSnap Workspace Domain Types
// Schema version for forward compatibility
export const SCHEMA_VERSION = 1;

export interface Workspace {
  id: string;
  name: string;
  icon?: string;
  ownerId: string;
  members: string[]; // user UIDs
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface Page {
  id: string;
  workspaceId: string;
  parentPageId: string | null; // null = root page
  title: string;
  icon?: string;
  cover?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  visibility: 'private' | 'friends' | 'public';
  archivedAt?: string | null;
  sortKey: number;
  schemaVersion: number;
  // Legacy migration tracking
  legacyFolderId?: string;
  legacyType?: 'folder' | 'post';
}

export type BlockType =
  | 'paragraph'
  | 'heading_1' | 'heading_2' | 'heading_3'
  | 'bulleted_list' | 'numbered_list' | 'todo'
  | 'quote' | 'callout' | 'divider'
  | 'image' | 'gallery' | 'map'
  | 'child_page';

export interface Block {
  id: string;
  pageId: string;
  parentBlockId: string | null;
  type: BlockType;
  order: number;
  data: Record<string, unknown>; // Type-specific payload
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface Asset {
  id: string;
  workspaceId: string;
  pageId?: string;
  blockId?: string;
  uploadedBy: string;
  url: string;
  storageRef: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  latitude?: number;
  longitude?: number;
  takenAt?: string;
  checksum?: string;
  createdAt: string;
  // Legacy tracking
  legacyPhotoId?: string;
}

export type SharePermission = 'view' | 'comment' | 'edit' | 'full';

export interface ShareGrant {
  id: string;
  pageId: string;
  grantedTo: string; // userId or 'public'
  permission: SharePermission;
  grantedBy: string;
  expiresAt?: string;
  createdAt: string;
}

export interface PageTreeNode {
  page: Page;
  children: PageTreeNode[];
}
