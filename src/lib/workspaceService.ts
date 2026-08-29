import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import type { Workspace, Page, Block, PageTreeNode } from '../types';
import { SCHEMA_VERSION } from '../types';

// ============================================================
// Workspace CRUD
// ============================================================

export async function createWorkspace(name: string): Promise<Workspace> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const ref = doc(collection(db, 'workspaces'));
  const now = new Date().toISOString();
  const workspace: Workspace = {
    id: ref.id,
    name,
    ownerId: user.uid,
    members: [user.uid],
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
  };
  await setDoc(ref, workspace);
  return workspace;
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  const snap = await getDoc(doc(db, 'workspaces', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Workspace) : null;
}

export async function getUserWorkspaces(userId: string): Promise<Workspace[]> {
  const q = query(
    collection(db, 'workspaces'),
    where('members', 'array-contains', userId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Workspace);
}

export async function getOrCreateDefaultWorkspace(userId: string): Promise<Workspace> {
  const workspaces = await getUserWorkspaces(userId);
  if (workspaces.length > 0) return workspaces[0];
  return createWorkspace('Không gian của tôi');
}

// ============================================================
// Page CRUD
// ============================================================

export async function createPage(
  workspaceId: string,
  parentPageId: string | null,
  title: string,
  options?: Partial<Pick<Page, 'icon' | 'cover' | 'visibility' | 'legacyFolderId' | 'legacyType'>>
): Promise<Page> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const ref = doc(collection(db, 'pages'));
  const now = new Date().toISOString();

  // Get max sortKey for siblings
  const siblingsQuery = parentPageId
    ? query(
        collection(db, 'pages'),
        where('workspaceId', '==', workspaceId),
        where('parentPageId', '==', parentPageId),
        orderBy('sortKey', 'desc')
      )
    : query(
        collection(db, 'pages'),
        where('workspaceId', '==', workspaceId),
        where('parentPageId', '==', null),
        orderBy('sortKey', 'desc')
      );

  let maxSortKey = 0;
  try {
    const siblings = await getDocs(siblingsQuery);
    if (!siblings.empty) {
      maxSortKey = (siblings.docs[0].data().sortKey || 0) + 1;
    }
  } catch {
    // Index may not exist yet, default to 0
  }

  const page: Page = {
    id: ref.id,
    workspaceId,
    parentPageId,
    title,
    createdBy: user.uid,
    updatedBy: user.uid,
    createdAt: now,
    updatedAt: now,
    visibility: options?.visibility || 'private',
    sortKey: maxSortKey,
    schemaVersion: SCHEMA_VERSION,
    ...(options?.icon && { icon: options.icon }),
    ...(options?.cover && { cover: options.cover }),
    ...(options?.legacyFolderId && { legacyFolderId: options.legacyFolderId }),
    ...(options?.legacyType && { legacyType: options.legacyType }),
  };

  await setDoc(ref, page);
  return page;
}

export async function getPage(id: string): Promise<Page | null> {
  const snap = await getDoc(doc(db, 'pages', id));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Page) : null;
}

export async function updatePage(id: string, data: Partial<Page>): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  await updateDoc(doc(db, 'pages', id), {
    ...data,
    updatedBy: user.uid,
    updatedAt: new Date().toISOString(),
  });
}

export async function archivePage(id: string): Promise<void> {
  await updatePage(id, { archivedAt: new Date().toISOString() });
}

export async function restorePage(id: string): Promise<void> {
  await updatePage(id, { archivedAt: null });
}

export async function deletePage(id: string): Promise<void> {
  // Delete all blocks first
  const blocks = await getPageBlocks(id);
  const batch = writeBatch(db);
  blocks.forEach((b) => batch.delete(doc(db, 'blocks', b.id)));
  batch.delete(doc(db, 'pages', id));
  await batch.commit();
}

export async function movePage(id: string, newParentId: string | null): Promise<void> {
  await updatePage(id, { parentPageId: newParentId });
}

export async function getPageTree(workspaceId: string): Promise<PageTreeNode[]> {
  const q = query(
    collection(db, 'pages'),
    where('workspaceId', '==', workspaceId),
    where('archivedAt', '==', null),
    orderBy('sortKey', 'asc')
  );
  const snap = await getDocs(q);
  const pages = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Page);

  // Build tree
  const map = new Map<string, PageTreeNode>();
  const roots: PageTreeNode[] = [];

  pages.forEach((p) => map.set(p.id, { page: p, children: [] }));
  pages.forEach((p) => {
    const node = map.get(p.id)!;
    if (p.parentPageId && map.has(p.parentPageId)) {
      map.get(p.parentPageId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export async function getChildPages(workspaceId: string, parentPageId: string | null): Promise<Page[]> {
  const q = query(
    collection(db, 'pages'),
    where('workspaceId', '==', workspaceId),
    where('parentPageId', '==', parentPageId),
    orderBy('sortKey', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Page);
}

// ============================================================
// Block CRUD
// ============================================================

export async function createBlock(
  pageId: string,
  type: Block['type'],
  data: Record<string, unknown>,
  afterBlockId?: string
): Promise<Block> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const ref = doc(collection(db, 'blocks'));
  const now = new Date().toISOString();

  // Calculate order
  let order = 0;
  if (afterBlockId) {
    const afterBlock = await getDoc(doc(db, 'blocks', afterBlockId));
    if (afterBlock.exists()) {
      order = (afterBlock.data().order || 0) + 1;
    }
  } else {
    // Get max order in page
    const q = query(
      collection(db, 'blocks'),
      where('pageId', '==', pageId),
      orderBy('order', 'desc')
    );
    try {
      const snap = await getDocs(q);
      if (!snap.empty) {
        order = (snap.docs[0].data().order || 0) + 1;
      }
    } catch {
      // Index may not exist yet
    }
  }

  const block: Block = {
    id: ref.id,
    pageId,
    parentBlockId: null,
    type,
    order,
    data,
    createdBy: user.uid,
    updatedBy: user.uid,
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
  };

  await setDoc(ref, block);
  return block;
}

export async function getPageBlocks(pageId: string): Promise<Block[]> {
  const q = query(
    collection(db, 'blocks'),
    where('pageId', '==', pageId),
    orderBy('order', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Block);
}

export async function updateBlock(id: string, data: Partial<Block>): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  await updateDoc(doc(db, 'blocks', id), {
    ...data,
    updatedBy: user.uid,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteBlock(id: string): Promise<void> {
  await deleteDoc(doc(db, 'blocks', id));
}

export async function reorderBlocks(pageId: string, blockIds: string[]): Promise<void> {
  const batch = writeBatch(db);
  blockIds.forEach((id, index) => {
    batch.update(doc(db, 'blocks', id), { order: index });
  });
  await batch.commit();
}
