// Optimized Firestore queries with proper indexing
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Query,
  DocumentData,
} from 'firebase/firestore';

/**
 * Get user's folders with pagination (optimized query)
 * Requires index: uid (ASC) + createdAt (DESC)
 */
export async function getUserFoldersOptimized(
  userId: string,
  pageSize: number = 10
): Promise<any[]> {
  const q = query(
    collection(db, 'folders'),
    where('uid', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(pageSize + 1) // +1 to check if more exists
  );
  
  const docs = await getDocs(q);
  return docs.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Get user's feed posts (visible posts from friends)
 * Requires index: visibility (ASC) + createdAt (DESC)
 */
export async function getUserFeedOptimized(
  userId: string,
  pageSize: number = 20
): Promise<any[]> {
  // Query only public and friends posts
  const q = query(
    collection(db, 'posts'),
    where('visibility', 'in', ['public', 'friends']),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );
  
  const docs = await getDocs(q);
  return docs.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Get folder details by ID
 */
export async function getFolderById(folderId: string): Promise<any> {
  const q = query(
    collection(db, 'folders'),
    where('__name__', '==', folderId)
  );
  
  const docs = await getDocs(q);
  if (docs.empty) return null;
  
  const doc = docs.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  };
}

/**
 * Get photos in a folder
 * Requires index: folderId (ASC) + uploadedAt (DESC)
 */
export async function getPhotosByFolderOptimized(
  folderId: string,
  pageSize: number = 50
): Promise<any[]> {
  const q = query(
    collection(db, 'photos'),
    where('folderId', '==', folderId),
    orderBy('uploadedAt', 'desc'),
    limit(pageSize)
  );
  
  const docs = await getDocs(q);
  return docs.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Get comments for a folder (avoid N+1)
 * Should use onSnapshot for realtime
 */
export async function getCommentsByFolderOptimized(
  folderId: string,
  pageSize: number = 20
): Promise<any[]> {
  const q = query(
    collection(db, 'comments'),
    where('folderId', '==', folderId),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );
  
  const docs = await getDocs(q);
  return docs.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Get user's friend requests (pending)
 */
export async function getPendingFriendRequests(
  userId: string
): Promise<any[]> {
  // Query: addresseeId = userId AND status = 'pending'
  const q = query(
    collection(db, 'friendships'),
    where('addresseeId', '==', userId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  
  const docs = await getDocs(q);
  return docs.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Get user's notifications (unread)
 */
export async function getUnreadNotifications(
  userId: string,
  pageSize: number = 50
): Promise<any[]> {
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', userId),
    where('isRead', '==', false),
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );
  
  const docs = await getDocs(q);
  return docs.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

/**
 * Search folders by name (IMPORTANT: requires text search)
 * For now, we'll do client-side filtering
 * TODO: Implement Algolia or Firestore Text Search extension
 */
export async function searchFolders(
  userId: string,
  searchTerm: string
): Promise<any[]> {
  // Get all folders first, then filter client-side
  // This is NOT optimal but works for MVP
  const q = query(
    collection(db, 'folders'),
    where('uid', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  const docs = await getDocs(q);
  const searchLower = searchTerm.toLowerCase();
  
  return docs.docs
    .filter(doc => {
      const data = doc.data();
      return (
        data.name?.toLowerCase().includes(searchLower) ||
        data.city?.toLowerCase().includes(searchLower) ||
        data.country?.toLowerCase().includes(searchLower)
      );
    })
    .map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
}
