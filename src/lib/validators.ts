// Schema validation and runtime type safety helpers
import { ValidationError } from './errorHandler';
import { UserProfile, LocationFolder, Photo, Post, Comment, Message } from '../types';

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export function validateOrThrow<T>(
  data: any,
  validator: (d: any) => ValidationResult<T>,
  contextName = 'Dữ liệu'
): T {
  const res = validator(data);
  if (!res.valid || !res.data) {
    throw new ValidationError(
      `${contextName} không hợp lệ: ${res.error || 'Lỗi kiểm tra định dạng dữ liệu'}`
    );
  }
  return res.data;
}

export const Validators = {
  email: (email: string): boolean => {
    if (!email || typeof email !== 'string') return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email.trim());
  },

  password: (password: string): boolean => {
    return typeof password === 'string' && password.length >= 6;
  },

  userProfile: (data: any): ValidationResult<UserProfile> => {
    const errors: string[] = [];
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Dữ liệu người dùng trống' };
    }

    if (!data.uid || typeof data.uid !== 'string') {
      errors.push('UID không hợp lệ');
    }
    if (data.email && !Validators.email(data.email)) {
      errors.push('Email không đúng định dạng');
    }
    if (data.displayName && typeof data.displayName !== 'string') {
      errors.push('Tên hiển thị phải là chuỗi ký tự');
    }
    if (data.role && !['admin', 'user'].includes(data.role)) {
      errors.push('Vai trò không hợp lệ');
    }

    const validated: UserProfile = {
      uid: String(data.uid || ''),
      email: String(data.email || ''),
      displayName: data.displayName ? String(data.displayName) : undefined,
      avatarUrl: data.avatarUrl ? String(data.avatarUrl) : undefined,
      role: data.role === 'admin' ? 'admin' : 'user',
      inviteCode: data.inviteCode ? String(data.inviteCode) : undefined,
      bio: data.bio ? String(data.bio) : undefined,
      createdAt: data.createdAt ? String(data.createdAt) : new Date().toISOString(),
    };

    return {
      valid: errors.length === 0,
      data: errors.length === 0 ? validated : undefined,
      error: errors.length > 0 ? errors.join(', ') : undefined,
      errors,
    };
  },

  locationFolder: (data: any): ValidationResult<LocationFolder> => {
    const errors: string[] = [];
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Dữ liệu địa điểm trống' };
    }

    if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
      errors.push('Tên địa điểm không được để trống');
    }

    const centerLat = typeof data.centerLat === 'number' ? data.centerLat : Number(data.centerLat);
    const centerLng = typeof data.centerLng === 'number' ? data.centerLng : Number(data.centerLng);

    if (isNaN(centerLat) || isNaN(centerLng)) {
      errors.push('Tọa độ địa lý không hợp lệ');
    }

    const validated: LocationFolder = {
      id: data.id ? String(data.id) : undefined,
      uid: String(data.uid || ''),
      name: String(data.name || '').trim(),
      country: data.country ? String(data.country) : undefined,
      city: data.city ? String(data.city) : undefined,
      district: data.district ? String(data.district) : undefined,
      street: data.street ? String(data.street) : undefined,
      centerLat: isNaN(centerLat) ? 0 : centerLat,
      centerLng: isNaN(centerLng) ? 0 : centerLng,
      coverPhotoUrl: data.coverPhotoUrl ? String(data.coverPhotoUrl) : undefined,
      photoCount: typeof data.photoCount === 'number' ? data.photoCount : Number(data.photoCount || 0),
      firstVisitedAt: data.firstVisitedAt ? String(data.firstVisitedAt) : undefined,
      lastVisitedAt: data.lastVisitedAt ? String(data.lastVisitedAt) : undefined,
      createdAt: data.createdAt ? String(data.createdAt) : new Date().toISOString(),
      visibility: ['private', 'friends', 'public'].includes(data.visibility) ? data.visibility : 'private',
      description: data.description ? String(data.description) : undefined,
      reactions: typeof data.reactions === 'object' && data.reactions ? data.reactions : {},
    };

    return {
      valid: errors.length === 0,
      data: errors.length === 0 ? validated : undefined,
      error: errors.length > 0 ? errors.join(', ') : undefined,
      errors,
    };
  },

  post: (data: any): ValidationResult<Post> => {
    const errors: string[] = [];
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'Dữ liệu bài viết trống' };
    }

    if (!data.uid || typeof data.uid !== 'string') {
      errors.push('Thiếu UID tác giả');
    }

    const validated: Post = {
      id: data.id ? String(data.id) : undefined,
      uid: String(data.uid || ''),
      type: data.type === 'story' ? 'story' : 'post',
      content: typeof data.content === 'string' ? data.content : '',
      imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls.map(String) : [],
      folderId: data.folderId ? String(data.folderId) : undefined,
      location: data.location && typeof data.location === 'object' ? data.location : undefined,
      reactions: typeof data.reactions === 'object' && data.reactions ? data.reactions : {},
      commentCount: typeof data.commentCount === 'number' ? data.commentCount : 0,
      shareCount: typeof data.shareCount === 'number' ? data.shareCount : 0,
      visibility: data.visibility === 'public' ? 'public' : 'friends',
      expiresAt: data.expiresAt ? String(data.expiresAt) : undefined,
      createdAt: data.createdAt ? String(data.createdAt) : new Date().toISOString(),
      userProfile: data.userProfile ? (Validators.userProfile(data.userProfile).data || undefined) : undefined,
    };

    return {
      valid: errors.length === 0,
      data: errors.length === 0 ? validated : undefined,
      error: errors.length > 0 ? errors.join(', ') : undefined,
      errors,
    };
  },

  loginData: (email: string, password: string): ValidationResult<{ email: string; password: string }> => {
    const errors: string[] = [];

    if (!Validators.email(email)) {
      errors.push('Định dạng email không hợp lệ');
    }
    if (!Validators.password(password)) {
      errors.push('Mật khẩu phải có ít nhất 6 ký tự');
    }

    return {
      valid: errors.length === 0,
      data: errors.length === 0 ? { email: email.trim(), password } : undefined,
      error: errors.length > 0 ? errors.join(', ') : undefined,
      errors,
    };
  },

  registerData: (email: string, password: string, displayName: string): ValidationResult<{ email: string; password: string; displayName: string }> => {
    const errors: string[] = [];

    if (!Validators.email(email)) {
      errors.push('Định dạng email không hợp lệ');
    }
    if (!Validators.password(password)) {
      errors.push('Mật khẩu phải có ít nhất 6 ký tự');
    }
    if (!displayName || displayName.trim().length === 0) {
      errors.push('Tên hiển thị không được để trống');
    }
    if (displayName && displayName.trim().length > 100) {
      errors.push('Tên hiển thị quá dài (tối đa 100 ký tự)');
    }

    return {
      valid: errors.length === 0,
      data: errors.length === 0 ? { email: email.trim(), password, displayName: displayName.trim() } : undefined,
      error: errors.length > 0 ? errors.join(', ') : undefined,
      errors,
    };
  },
};
