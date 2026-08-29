# GeoSnap Workspace — Firestore Schema v1

## New Collections

### workspaces/{workspaceId}
Personal or team workspace container.
- `name` (string ≤100)
- `icon` (string, optional)
- `ownerId` (string, user UID)
- `members` (string[], user UIDs)
- `createdAt`, `updatedAt` (ISO string)
- `schemaVersion` (number)

### pages/{pageId}
A content page (trip, place, journal, etc.).
- `workspaceId` (string)
- `parentPageId` (string | null)
- `title` (string ≤500)
- `icon`, `cover` (string, optional)
- `createdBy`, `updatedBy` (string, user UID)
- `createdAt`, `updatedAt` (ISO string)
- `visibility` ('private' | 'friends' | 'public')
- `archivedAt` (string | null)
- `sortKey` (number)
- `schemaVersion` (number)
- `legacyFolderId`, `legacyType` (optional, for migration)

### blocks/{blockId}
An atomic content element within a page.
- `pageId` (string)
- `parentBlockId` (string | null)
- `type` (BlockType enum)
- `order` (number)
- `data` (object, type-specific)
- `createdBy`, `updatedBy`, `createdAt`, `updatedAt`
- `schemaVersion` (number)

### assets/{assetId}
Binary file metadata (actual files in Storage).
- `workspaceId`, `pageId`, `blockId` (string)
- `uploadedBy` (string)
- `url`, `storageRef`, `filename`, `contentType`
- `sizeBytes`, `width`, `height`
- `latitude`, `longitude`, `takenAt`
- `checksum`, `createdAt`
- `legacyPhotoId` (optional)

### shares/{shareId}
Permission grants for pages.
- `pageId`, `grantedTo`, `grantedBy` (string)
- `permission` ('view' | 'comment' | 'edit' | 'full')
- `expiresAt`, `createdAt` (ISO string)

## Composite Indexes
- pages: workspaceId + sortKey
- pages: workspaceId + archivedAt + sortKey
- pages: workspaceId + parentPageId + sortKey
- blocks: pageId + order
- assets: pageId + createdAt DESC
