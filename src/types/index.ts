export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  role: 'admin' | 'user';
  inviteCode?: string;
  bio?: string;
  createdAt: string;
}

export interface Photo {
  id?: string;
  uid: string;
  url: string;
  latitude?: number;
  longitude?: number;
  takenAt?: string;
  uploadedAt: string;
  hasGps: boolean;
  folderId?: string;
}

export interface LocationFolder {
  id?: string;
  uid: string;
  name: string;
  country?: string;
  city?: string;
  district?: string;
  street?: string;
  centerLat: number;
  centerLng: number;
  coverPhotoUrl?: string;
  photoCount: number;
  firstVisitedAt?: string;
  lastVisitedAt?: string;
  createdAt: string;
  visibility?: 'private' | 'friends' | 'public';
  description?: string;
  reactions?: Record<string, string>; // userId -> emoji
}

export interface Friendship {
  id?: string;
  requesterId: string;
  addresseeId: string;
  status: 'pending' | 'accepted' | 'blocked';
  requesterProfile?: UserProfile;
  addresseeProfile?: UserProfile;
  createdAt: string;
  updatedAt?: string;
}

export interface Notification {
  id?: string;
  recipientId: string;
  actorId: string;
  actorProfile?: UserProfile;
  type: 'friend_request' | 'friend_accepted' | 'reaction' | 'comment' | 'new_location' | 'new_post';
  entityId?: string;
  entityName?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Comment {
  id?: string;
  uid: string;
  folderId?: string;
  postId?: string;
  content: string;
  userProfile?: UserProfile;
  createdAt: string;
}

export interface Message {
  id?: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  recipientId: string;
  content: string;
  createdAt: string;
}

// ========== NEW: Posts & Stories ==========

export interface Post {
  id?: string;
  uid: string;
  type: 'post' | 'story';
  content: string;
  imageUrls: string[];
  folderId?: string;
  location?: {
    lat: number;
    lng: number;
    name: string;
  };
  reactions: Record<string, string>; // userId -> emoji
  commentCount: number;
  shareCount: number;
  visibility: 'friends' | 'public';
  expiresAt?: string; // For stories (24h from creation)
  createdAt: string;
  // Enriched client-side
  userProfile?: UserProfile;
}

export type FeedItemType = 'post' | 'folder';

export interface FeedItem {
  id: string;
  type: FeedItemType;
  data: Post | (LocationFolder & { userProfile?: UserProfile });
  createdAt: string;
}

// ========== Workspace Domain Types ==========
export type {
  Workspace,
  Page,
  Block,
  BlockType,
  Asset,
  ShareGrant,
  SharePermission,
  PageTreeNode,
} from './workspace';
export { SCHEMA_VERSION } from './workspace';

export type {
  ParagraphData,
  HeadingData,
  TodoData,
  ListItemData,
  QuoteData,
  CalloutData,
  DividerData,
  ImageData,
  GalleryData,
  MapData,
  ChildPageData,
  BlockDataMap,
} from './blocks';
