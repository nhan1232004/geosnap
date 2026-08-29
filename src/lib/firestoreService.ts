// Complete Firestore service for all GeoSnap & Workspace features
import { db, storage } from '../firebase';
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
  limit,
  onSnapshot,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type {
  LocationFolder,
  Photo,
  Post,
  Comment,
  Friendship,
  Notification,
  Message,
  UserProfile,
} from '../types';

// ===============================================================
// 1. Folders CRUD
// ===============================================================

export async function getUserFoldersOptimized(
  userId: string,
  pageSize: number = 50
): Promise<LocationFolder[]> {
  try {
    const q = query(
      collection(db, 'folders'),
      where('uid', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );
    const docs = await getDocs(q);
    return docs.docs.map((d) => ({ id: d.id, ...d.data() }) as LocationFolder);
  } catch {
    // Fallback without index
    const qFallback = query(collection(db, 'folders'), where('uid', '==', userId));
    const docs = await getDocs(qFallback);
    const items = docs.docs.map((d) => ({ id: d.id, ...d.data() }) as LocationFolder);
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function getFolderById(folderId: string): Promise<LocationFolder | null> {
  const docRef = doc(db, 'folders', folderId);
  const snap = await getDoc(docRef);
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as LocationFolder) : null;
}

export async function createFolderDoc(data: Omit<LocationFolder, 'id'>): Promise<LocationFolder> {
  const docRef = doc(collection(db, 'folders'));
  const folder: LocationFolder = {
    id: docRef.id,
    ...data,
  };
  await setDoc(docRef, folder);
  return folder;
}

export async function updateFolderDoc(folderId: string, data: Partial<LocationFolder>): Promise<void> {
  await updateDoc(doc(db, 'folders', folderId), data);
}

export async function deleteFolderDoc(folderId: string): Promise<void> {
  // Delete all photos in folder first
  const photos = await getPhotosByFolderOptimized(folderId);
  const batch = writeBatch(db);
  photos.forEach((p) => {
    if (p.id) batch.delete(doc(db, 'photos', p.id));
  });
  batch.delete(doc(db, 'folders', folderId));
  await batch.commit();
}

export async function searchFolders(userId: string, searchTerm: string): Promise<LocationFolder[]> {
  const folders = await getUserFoldersOptimized(userId, 100);
  const searchLower = searchTerm.toLowerCase();
  return folders.filter((f) =>
    f.name?.toLowerCase().includes(searchLower) ||
    f.city?.toLowerCase().includes(searchLower) ||
    f.country?.toLowerCase().includes(searchLower)
  );
}

// ===============================================================
// 2. Photos CRUD & Storage Upload
// ===============================================================

export async function getPhotosByFolderOptimized(
  folderId: string,
  pageSize: number = 100
): Promise<Photo[]> {
  try {
    const q = query(
      collection(db, 'photos'),
      where('folderId', '==', folderId),
      orderBy('uploadedAt', 'desc'),
      limit(pageSize)
    );
    const docs = await getDocs(q);
    return docs.docs.map((d) => ({ id: d.id, ...d.data() }) as Photo);
  } catch {
    const qFallback = query(collection(db, 'photos'), where('folderId', '==', folderId));
    const docs = await getDocs(qFallback);
    return docs.docs.map((d) => ({ id: d.id, ...d.data() }) as Photo);
  }
}

export async function getUserAllPhotos(userId: string): Promise<Photo[]> {
  const q = query(collection(db, 'photos'), where('uid', '==', userId));
  const docs = await getDocs(q);
  return docs.docs.map((d) => ({ id: d.id, ...d.data() }) as Photo);
}

export async function uploadImageFile(file: File, path: string): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function createPhotoDoc(data: Omit<Photo, 'id'>): Promise<Photo> {
  const docRef = doc(collection(db, 'photos'));
  const photo: Photo = {
    id: docRef.id,
    ...data,
    visibility: data.visibility || 'private',
  };
  await setDoc(docRef, photo);
  return photo;
}

export async function deletePhotoDoc(photoId: string): Promise<void> {
  await deleteDoc(doc(db, 'photos', photoId));
}

// ===============================================================
// 3. Posts & Feed
// ===============================================================

export async function getUserFeedOptimized(
  userId: string,
  pageSize: number = 30
): Promise<Post[]> {
  try {
    const q = query(
      collection(db, 'posts'),
      where('visibility', 'in', ['public', 'friends']),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );
    const docs = await getDocs(q);
    return docs.docs.map((d) => ({ id: d.id, ...d.data() }) as Post);
  } catch (err) {
    console.warn('getUserFeedOptimized query failed, falling back to public posts only:', err);
    try {
      const qPublic = query(
        collection(db, 'posts'),
        where('visibility', '==', 'public'),
        limit(pageSize)
      );
      const docs = await getDocs(qPublic);
      const items = docs.docs.map((d) => ({ id: d.id, ...d.data() }) as Post);
      return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
      return [];
    }
  }
}

export async function createPostDoc(data: Omit<Post, 'id'>): Promise<Post> {
  const docRef = doc(collection(db, 'posts'));
  const post: Post = {
    id: docRef.id,
    ...data,
  };
  await setDoc(docRef, post);
  return post;
}

export async function togglePostReactionDoc(
  postId: string,
  userId: string,
  emoji: string
): Promise<void> {
  const docRef = doc(db, 'posts', postId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;
  const currentReactions = snap.data().reactions || {};
  if (currentReactions[userId] === emoji) {
    delete currentReactions[userId];
  } else {
    currentReactions[userId] = emoji;
  }
  await updateDoc(docRef, { reactions: currentReactions });
}

export async function deletePostDoc(postId: string): Promise<void> {
  await deleteDoc(doc(db, 'posts', postId));
}

export async function getActiveStories(): Promise<Post[]> {
  const now = new Date().toISOString();
  try {
    const q = query(
      collection(db, 'posts'),
      where('type', '==', 'story'),
      where('expiresAt', '>', now),
      orderBy('expiresAt', 'desc')
    );
    const docs = await getDocs(q);
    return docs.docs.map((d) => ({ id: d.id, ...d.data() }) as Post);
  } catch {
    const qFallback = query(collection(db, 'posts'), where('type', '==', 'story'));
    const docs = await getDocs(qFallback);
    return docs.docs.map((d) => ({ id: d.id, ...d.data() }) as Post);
  }
}

// ===============================================================
// 4. Comments
// ===============================================================

export async function getCommentsByFolderOptimized(
  folderId: string,
  pageSize: number = 50
): Promise<Comment[]> {
  try {
    const q = query(
      collection(db, 'comments'),
      where('folderId', '==', folderId),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );
    const docs = await getDocs(q);
    return docs.docs.map((d) => ({ id: d.id, ...d.data() }) as Comment);
  } catch {
    const qFallback = query(collection(db, 'comments'), where('folderId', '==', folderId));
    const docs = await getDocs(qFallback);
    return docs.docs.map((d) => ({ id: d.id, ...d.data() }) as Comment);
  }
}

export async function createCommentDoc(data: Omit<Comment, 'id'>): Promise<Comment> {
  const docRef = doc(collection(db, 'comments'));
  const comment: Comment = {
    id: docRef.id,
    ...data,
  };
  await setDoc(docRef, comment);
  return comment;
}

export async function deleteCommentDoc(commentId: string): Promise<void> {
  await deleteDoc(doc(db, 'comments', commentId));
}

// ===============================================================
// 5. Friendships
// ===============================================================

export async function getFriendsList(userId: string): Promise<UserProfile[]> {
  try {
    const q1 = query(
      collection(db, 'friendships'),
      where('requesterId', '==', userId),
      where('status', '==', 'accepted')
    );
    const q2 = query(
      collection(db, 'friendships'),
      where('addresseeId', '==', userId),
      where('status', '==', 'accepted')
    );

    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const friendUids = new Set<string>();

    snap1.docs.forEach((d) => friendUids.add(d.data().addresseeId));
    snap2.docs.forEach((d) => friendUids.add(d.data().requesterId));

    const uidList = Array.from(friendUids);
    if (uidList.length === 0) return [];

    const profiles: UserProfile[] = [];
    const CHUNK_SIZE = 30;
    for (let i = 0; i < uidList.length; i += CHUNK_SIZE) {
      const chunk = uidList.slice(i, i + CHUNK_SIZE);
      const qUsers = query(collection(db, 'users'), where('uid', 'in', chunk));
      const uSnap = await getDocs(qUsers);
      uSnap.docs.forEach((u) => profiles.push({ uid: u.id, ...u.data() } as UserProfile));
    }
    return profiles;
  } catch (e) {
    console.error('getFriendsList error:', e);
    return [];
  }
}

export async function getPendingFriendRequests(userId: string): Promise<Friendship[]> {
  try {
    const q = query(
      collection(db, 'friendships'),
      where('addresseeId', '==', userId),
      where('status', '==', 'pending')
    );
    const docs = await getDocs(q);
    if (docs.empty) return [];

    const rawFriendships = docs.docs.map((d) => ({ id: d.id, ...d.data() }) as Friendship);
    const requesterIds = Array.from(new Set(rawFriendships.map((f) => f.requesterId)));

    const profileMap = new Map<string, UserProfile>();
    const CHUNK_SIZE = 30;
    for (let i = 0; i < requesterIds.length; i += CHUNK_SIZE) {
      const chunk = requesterIds.slice(i, i + CHUNK_SIZE);
      const qUsers = query(collection(db, 'users'), where('uid', 'in', chunk));
      const uSnap = await getDocs(qUsers);
      uSnap.docs.forEach((u) => profileMap.set(u.id, { uid: u.id, ...u.data() } as UserProfile));
    }

    return rawFriendships.map((f) => ({
      ...f,
      requesterProfile: profileMap.get(f.requesterId),
    }));
  } catch (e) {
    console.error('getPendingFriendRequests error:', e);
    return [];
  }
}

export async function sendFriendRequestDoc(requesterId: string, addresseeId: string): Promise<void> {
  const friendshipId = `${requesterId}_${addresseeId}`;
  const friendship: Friendship = {
    id: friendshipId,
    requesterId,
    addresseeId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, 'friendships', friendshipId), friendship);
}

export async function respondFriendRequestDoc(
  friendshipId: string,
  status: 'accepted' | 'blocked'
): Promise<void> {
  await updateDoc(doc(db, 'friendships', friendshipId), {
    status,
    updatedAt: new Date().toISOString(),
  });
}

// ===============================================================
// 6. Realtime Messages
// ===============================================================

export function subscribeConversationMessages(
  conversationId: string,
  callback: (messages: Message[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'messages'),
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Message);
      callback(messages);
    },
    (err) => {
      console.warn('onSnapshot messages error, fallback:', err);
    }
  );
}

export async function sendMessageDoc(data: Omit<Message, 'id'>): Promise<Message> {
  const docRef = doc(collection(db, 'messages'));
  const msg: Message = {
    id: docRef.id,
    ...data,
  };
  await setDoc(docRef, msg);
  return msg;
}

export async function deleteMessageDoc(messageId: string): Promise<void> {
  await deleteDoc(doc(db, 'messages', messageId));
}

// ===============================================================
// 7. Notifications
// ===============================================================

export function subscribeUserNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Notification);
      callback(notifs);
    },
    (err) => {
      console.warn('Notifications snapshot error:', err);
    }
  );
}

export async function getUnreadNotifications(userId: string): Promise<Notification[]> {
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', userId),
    where('isRead', '==', false)
  );
  const docs = await getDocs(q);
  return docs.docs.map((d) => ({ id: d.id, ...d.data() }) as Notification);
}

export async function markNotificationAsReadDoc(notificationId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
}

// ===============================================================
// 8. User Profile
// ===============================================================

export async function getUserProfileDoc(userId: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserProfile) : null;
}

export async function updateUserProfileDoc(
  userId: string,
  data: Partial<UserProfile>
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), data);
}

export async function getUserByInviteCode(inviteCode: string): Promise<UserProfile | null> {
  const q = query(collection(db, 'users'), where('inviteCode', '==', inviteCode), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { uid: d.id, ...d.data() } as UserProfile;
}

// ===============================================================
// 9. Explore Public Feed
// ===============================================================

export async function getPublicFolders(limitCount: number = 30): Promise<LocationFolder[]> {
  try {
    const q = query(
      collection(db, 'folders'),
      where('visibility', '==', 'public'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    const folders = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LocationFolder);
    return folders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('Failed to get public folders:', err);
    return [];
  }
}

export async function getPublicPhotos(limitCount: number = 50): Promise<Photo[]> {
  try {
    const q = query(
      collection(db, 'photos'),
      where('visibility', '==', 'public'),
      limit(limitCount)
    );
    const snap = await getDocs(q);
    const photos = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Photo);
    return photos.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  } catch (err) {
    console.error('Failed to get public photos:', err);
    return [];
  }
}
