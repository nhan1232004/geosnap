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
  try {
    const q = query(
      collection(db, 'workspaces'),
      where('members', 'array-contains', userId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Workspace);
    }
    
    // Fallback: Check ownerId
    const q2 = query(collection(db, 'workspaces'), where('ownerId', '==', userId));
    const snap2 = await getDocs(q2);
    return snap2.docs.map((d) => ({ id: d.id, ...d.data() }) as Workspace);
  } catch (err) {
    console.error('Failed to get user workspaces:', err);
    return [];
  }
}

export async function getOrCreateDefaultWorkspace(userId: string): Promise<Workspace> {
  const workspaces = await getUserWorkspaces(userId);
  if (workspaces.length > 0) {
    const ws = workspaces[0];
    // Check if workspace has pages, if not create starter page
    const existingPages = await getPageTree(ws.id);
    if (existingPages.length === 0) {
      await createStarterPage(ws.id);
    }
    return ws;
  }

  const newWs = await createWorkspace('Không gian của tôi');
  await createStarterPage(newWs.id);
  return newWs;
}

async function createStarterPage(workspaceId: string): Promise<Page> {
  const page = await createPage(workspaceId, null, 'Hành trình đầu tiên 🌟', {
    icon: '✈️',
    visibility: 'private',
  });
  
  try {
    await createBlock(page.id, 'heading_1', { text: 'Chào mừng bạn đến với GeoSnap Workspace!' });
    await createBlock(page.id, 'callout', { 
      text: 'Đây là không gian ghi chú, lập kế hoạch và lưu giữ ký ức du lịch theo phong cách Notion.',
      icon: '💡'
    });
    await createBlock(page.id, 'todo', { text: 'Chuẩn bị hành lý và máy ảnh', checked: true });
    await createBlock(page.id, 'todo', { text: 'Ghé thăm các địa điểm yêu thích', checked: false });
    await createBlock(page.id, 'paragraph', { text: 'Gõ phím / để thêm ảnh, bản đồ, trích dẫn hoặc bấm Trợ lý AI ở thanh công cụ phía trên.' });
  } catch (e) {
    console.warn('Could not populate starter blocks:', e);
  }

  return page;
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

  let maxSortKey = 0;
  try {
    const siblingsQuery = query(
      collection(db, 'pages'),
      where('workspaceId', '==', workspaceId)
    );
    const siblings = await getDocs(siblingsQuery);
    maxSortKey = siblings.size;
  } catch {
    // Default to 0
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

export async function deletePage(id: string, workspaceId?: string): Promise<void> {
  const pagesToDelete = [id];
  
  if (workspaceId) {
    try {
      const tree = await getPageTree(workspaceId);
      const findAndCollect = (nodes: PageTreeNode[]) => {
        for (const node of nodes) {
          if (node.page.id === id) {
            const collect = (n: PageTreeNode) => {
              pagesToDelete.push(n.page.id);
              n.children.forEach(collect);
            };
            node.children.forEach(collect);
            break;
          }
          if (node.children.length > 0) {
            findAndCollect(node.children);
          }
        }
      };
      findAndCollect(tree);
    } catch (e) {
      console.warn('Failed to collect child pages for deletion:', e);
    }
  }

  const batch = writeBatch(db);
  for (const pId of pagesToDelete) {
    const blocks = await getPageBlocks(pId);
    blocks.forEach((b) => batch.delete(doc(db, 'blocks', b.id)));
    batch.delete(doc(db, 'pages', pId));
  }
  await batch.commit();
}

export function flattenPageTree(nodes: PageTreeNode[]): Page[] {
  const result: Page[] = [];
  for (const node of nodes) {
    result.push(node.page);
    if (node.children && node.children.length > 0) {
      result.push(...flattenPageTree(node.children));
    }
  }
  return result;
}

export async function movePage(id: string, newParentId: string | null): Promise<void> {
  await updatePage(id, { parentPageId: newParentId });
}

export async function getPageTree(workspaceId: string): Promise<PageTreeNode[]> {
  try {
    const q = query(
      collection(db, 'pages'),
      where('workspaceId', '==', workspaceId)
    );
    const snap = await getDocs(q);
    const allPages = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Page)
      .filter((p) => !p.archivedAt);

    allPages.sort((a, b) => (a.sortKey || 0) - (b.sortKey || 0));

    // Build tree
    const map = new Map<string, PageTreeNode>();
    const roots: PageTreeNode[] = [];

    allPages.forEach((p) => map.set(p.id, { page: p, children: [] }));
    allPages.forEach((p) => {
      const node = map.get(p.id)!;
      if (p.parentPageId && map.has(p.parentPageId)) {
        map.get(p.parentPageId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  } catch (err) {
    console.error('Failed to get page tree:', err);
    return [];
  }
}

export async function getChildPages(workspaceId: string, parentPageId: string | null): Promise<Page[]> {
  try {
    const q = query(
      collection(db, 'pages'),
      where('workspaceId', '==', workspaceId)
    );
    const snap = await getDocs(q);
    const pages = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }) as Page)
      .filter((p) => (p.parentPageId || null) === parentPageId && !p.archivedAt);

    pages.sort((a, b) => (a.sortKey || 0) - (b.sortKey || 0));
    return pages;
  } catch (err) {
    console.error('Failed to get child pages:', err);
    return [];
  }
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

  let order = 0;
  if (afterBlockId) {
    const afterBlock = await getDoc(doc(db, 'blocks', afterBlockId));
    if (afterBlock.exists()) {
      order = (afterBlock.data().order || 0) + 1;
    }
  } else {
    try {
      const q = query(collection(db, 'blocks'), where('pageId', '==', pageId));
      const snap = await getDocs(q);
      order = (snap.size + 1) * 1000;
    } catch {
      order = Date.now();
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
  try {
    const q = query(
      collection(db, 'blocks'),
      where('pageId', '==', pageId)
    );
    const snap = await getDocs(q);
    const blocks = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Block);
    blocks.sort((a, b) => (a.order || 0) - (b.order || 0));
    return blocks;
  } catch (err) {
    console.error('Failed to get page blocks:', err);
    return [];
  }
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
    batch.update(doc(db, 'blocks', id), { order: (index + 1) * 1000 });
  });
  await batch.commit();
}
