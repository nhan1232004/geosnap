export interface User {
  uid: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  role: 'admin' | 'user';
  createdAt: string; // ISO string
}

export interface Photo {
  id?: string; 
  uid: string;
  url: string;
  latitude?: number;
  longitude?: number;
  takenAt?: string; // ISO string
  uploadedAt: string; // ISO string
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
}
