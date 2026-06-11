import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAppStore } from '../store/useAppStore';
import { UserProfile, LocationFolder, Friendship } from '../types';
import {
  ArrowLeft,
  Camera,
  Edit2,
  Globe,
  Heart,
  Image as ImageIcon,
  Map,
  MapPin,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useToast } from '../components/ToastContainer';

/* ===== Types ===== */
type TabKey = 'photos' | 'map' | 'liked';

/* ===== Skeleton ===== */
function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse">
      {/* Cover skeleton */}
      <div className="skeleton w-full h-52 rounded-none" />
      {/* Card skeleton */}
      <div className="mx-4 -mt-16 bg-bg-card border border-border-dim rounded-3xl p-8 mb-8">
        <div className="flex gap-6">
          <div className="skeleton w-28 h-28 rounded-full shrink-0" />
          <div className="flex-1 space-y-3 pt-2">
            <div className="skeleton h-6 w-48 rounded-lg" />
            <div className="skeleton h-4 w-72 rounded-lg" />
            <div className="flex gap-8 mt-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="skeleton h-5 w-8 rounded" />
                  <div className="skeleton h-3 w-12 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Grid skeleton */}
      <div className="mx-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton rounded-2xl" style={{ height: i % 3 === 1 ? '200px' : '160px' }} />
        ))}
      </div>
    </div>
  );
}

/* ===== Main component ===== */
export default function Profile() {
  const { uid } = useParams<{ uid: string }>();
  const { user, setUserProfile } = useAppStore();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [folders, setFolders] = useState<LocationFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('photos');

  const [friendship, setFriendship] = useState<Friendship | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({ displayName: '', bio: '', avatarUrl: '' });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!uid) return;

    const fetchProfileData = async () => {
      try {
        setLoading(true);
        // Fetch Profile
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          setProfile({ uid: userDoc.id, ...userDoc.data() } as UserProfile);
        }

        // Fetch Friendship Status (if not self)
        let isFriend = false;
        if (user && user.uid !== uid) {
          const [sent, received] = await Promise.all([
            getDocs(query(collection(db, 'friendships'), where('requesterId', '==', user.uid), where('addresseeId', '==', uid))),
            getDocs(query(collection(db, 'friendships'), where('requesterId', '==', uid), where('addresseeId', '==', user.uid))),
          ]);
          const existing = [...sent.docs, ...received.docs];
          if (existing.length > 0) {
            const f = { id: existing[0].id, ...existing[0].data() } as Friendship;
            setFriendship(f);
            isFriend = f.status === 'accepted';
          }
        } else if (user && user.uid === uid) {
          isFriend = true;
        }

        // Fetch Folders based on Friendship status
        const q = query(collection(db, 'folders'), where('uid', '==', uid));
        const folderSnaps = await getDocs(q);
        const allFolders = folderSnaps.docs.map(d => ({ id: d.id, ...d.data() } as LocationFolder));

        const visibleFolders = allFolders.filter(f => {
          if (user?.uid === uid) return true;
          if (f.visibility === 'public') return true;
          if (f.visibility === 'friends' && isFriend) return true;
          return false;
        });

        visibleFolders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setFolders(visibleFolders);
      } catch (err) {
        console.error('Failed to fetch profile', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [uid, user]);

  /* ---- Edit handlers ---- */
  const handleEditClick = () => {
    if (profile) {
      setEditForm({
        displayName: profile.displayName || '',
        bio: profile.bio || '',
        avatarUrl: profile.avatarUrl || '',
      });
      setIsEditing(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: editForm.displayName,
        bio: editForm.bio,
        avatarUrl: editForm.avatarUrl,
      });
      const updated = { ...profile, ...editForm };
      setProfile(updated);
      setUserProfile(updated as Parameters<typeof setUserProfile>[0]);
      setIsEditing(false);
      toast('Hồ sơ đã được cập nhật thành công!', 'success');
    } catch (err) {
      console.error(err);
      toast('Không thể cập nhật hồ sơ. Vui lòng thử lại.', 'error');
    } finally {
      setSaving(false);
    }
  };

  /* ---- Avatar upload (Firebase Storage with base64 fallback) ---- */
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    try {
      const storageRef = ref(storage, `avatars/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setEditForm(prev => ({ ...prev, avatarUrl: url }));
    } catch {
      // Fallback to base64
      const reader = new FileReader();
      reader.onload = ev => {
        setEditForm(prev => ({ ...prev, avatarUrl: ev.target?.result as string }));
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingAvatar(false);
    }
  };

  /* ---- Cover photo upload ---- */
  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !profile) return;
    setUploadingCover(true);
    try {
      const storageRef = ref(storage, `covers/${user.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', user.uid), { coverUrl: url });
      setProfile(prev => prev ? { ...prev, coverUrl: url } : prev);
      toast('Ảnh bìa đã được cập nhật!', 'success');
    } catch (err) {
      console.error(err);
      toast('Không thể tải ảnh bìa.', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  /* ---- Friend request ---- */
  const handleSendRequest = async () => {
    if (!profile || !user) return;
    setSendingRequest(true);
    try {
      const friendshipData: Friendship = {
        requesterId: user.uid,
        addresseeId: profile.uid,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, 'friendships'), friendshipData);
      setFriendship({ id: docRef.id, ...friendshipData });
      await addDoc(collection(db, 'notifications'), {
        recipientId: profile.uid,
        actorId: user.uid,
        type: 'friend_request',
        isRead: false,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setSendingRequest(false);
    }
  };

  /* ---- Render states ---- */
  if (loading) return <ProfileSkeleton />;
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-5xl">😕</div>
        <p className="text-text-dim text-lg">Không tìm thấy người dùng.</p>
      </div>
    );
  }

  const isSelf = user?.uid === profile.uid;

  // Derive stats
  const uniqueCountries = new Set(folders.filter(f => f.country).map(f => f.country)).size;
  const uniqueCities = new Set(folders.filter(f => f.city).map(f => f.city)).size;
  const totalPhotos = folders.reduce((sum, f) => sum + f.photoCount, 0);

  // coverUrl may not exist in type yet — cast through unknown
  const coverUrl = (profile as unknown as Record<string, string>)['coverUrl'] as string | undefined;

  /* ===== TABS CONFIG ===== */
  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'photos', label: 'Ảnh', icon: '📷' },
    { key: 'map', label: 'Bản đồ', icon: '🗺️' },
    { key: 'liked', label: 'Đã thích', icon: '❤️' },
  ];

  return (
    <div className="page-enter pb-20">
      {/* Hidden file inputs */}
      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCoverFileChange}
      />
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarFileChange}
      />

      {/* ===== COVER PHOTO HERO ===== */}
      <div className="relative w-full h-48 md:h-56 overflow-hidden group">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt="Cover"
            className="w-full h-full object-cover image-reveal"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand/30 via-purple-900/20 to-bg-deep" />
        )}
        {/* Overlay gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-deep/60 to-transparent pointer-events-none" />

        {/* Upload cover button */}
        {isSelf && (
          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={uploadingCover}
            className="absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2 rounded-xl
              bg-black/50 backdrop-blur-md border border-white/20 text-white/90 text-sm font-medium
              hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100 active:scale-95"
          >
            {uploadingCover ? (
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                Đang tải...
              </span>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                Đổi ảnh bìa
              </>
            )}
          </button>
        )}

        {/* Back button */}
        <button
          onClick={() => window.history.back()}
          className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-lg
            bg-black/40 backdrop-blur-md border border-white/15 text-white/80 text-[13px] font-medium
            hover:bg-black/60 transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </button>
      </div>

      {/* ===== PROFILE CARD ===== */}
      <div className="mx-4 md:mx-auto md:max-w-4xl -mt-16 relative z-10">
        {isEditing && isSelf ? (
          /* ---- Edit Form ---- */
          <div className="glass-card rounded-3xl p-8 mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-brand/8 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative z-10 max-w-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-text-heading">Chỉnh sửa hồ sơ</h2>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-2 rounded-lg hover:bg-surface text-text-dim hover:text-text-heading transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Avatar upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-main mb-3">Ảnh đại diện</label>
                <div className="flex items-center gap-4">
                  <div className="relative group/avatar cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                    {editForm.avatarUrl ? (
                      <img
                        src={editForm.avatarUrl}
                        alt=""
                        className="w-20 h-20 rounded-full object-cover ring-2 ring-brand/30"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-brand font-bold text-2xl">
                        {(editForm.displayName || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                      {uploadingAvatar ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Upload className="w-5 h-5 text-white" />
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-text-main font-medium">Click để thay đổi</p>
                    <p className="text-xs text-text-dim mt-1">JPG, PNG, WEBP · Tối đa 5MB</p>
                  </div>
                </div>
              </div>

              {/* Display name */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-main mb-2">Tên hiển thị</label>
                <input
                  type="text"
                  value={editForm.displayName}
                  onChange={e => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border-dim text-text-main
                    placeholder-text-dim focus:outline-none focus:border-brand/50 input-glow transition-colors"
                  placeholder="Nhập tên hiển thị"
                />
              </div>

              {/* Bio */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-text-main mb-2">Tiểu sử</label>
                <textarea
                  value={editForm.bio}
                  onChange={e => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border-dim text-text-main
                    placeholder-text-dim focus:outline-none focus:border-brand/50 input-glow transition-colors resize-none"
                  placeholder="Viết gì đó về bạn..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 px-6 py-2.5 rounded-xl bg-brand text-white font-semibold
                    hover:bg-brand/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-2.5 rounded-xl bg-surface text-text-main hover:bg-glass border border-border-dim font-medium transition-all"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ---- Profile View ---- */
          <div className="glass-card rounded-3xl p-6 md:p-8 mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-72 h-72 bg-brand/8 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
              {/* Avatar */}
              <div className="shrink-0">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="w-28 h-28 rounded-full object-cover ring-4 ring-bg-deep shadow-2xl image-reveal"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-4xl font-bold text-brand ring-4 ring-bg-deep">
                    {(profile.displayName || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 text-center md:text-left flex flex-col items-center md:items-start">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl md:text-3xl font-extrabold text-text-heading">
                    {profile.displayName || 'GeoSnap User'}
                  </h1>
                  {isSelf && (
                    <button
                      onClick={handleEditClick}
                      className="p-2 rounded-lg hover:bg-card-hover text-text-dim hover:text-brand transition-colors"
                      title="Chỉnh sửa hồ sơ"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                {profile.bio && (
                  <p className="text-text-dim text-[14px] max-w-xl mb-4 leading-relaxed">{profile.bio}</p>
                )}

                {/* Stats bar */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6 text-[13px] text-text-main font-medium mb-6">
                  <StatItem value={folders.length} label="Hành trình" />
                  <div className="w-px h-8 bg-border-dim" />
                  <StatItem value={totalPhotos} label="Bức ảnh" />
                  <div className="w-px h-8 bg-border-dim" />
                  <StatItem value={uniqueCountries} label="Quốc gia" />
                  <div className="w-px h-8 bg-border-dim" />
                  <StatItem value={uniqueCities} label="Thành phố" />
                </div>

                {/* Friend actions */}
                {!isSelf && user && (
                  <div>
                    {friendship ? (
                      friendship.status === 'accepted' ? (
                        <div className="px-5 py-2.5 rounded-xl bg-surface border border-border-dim text-text-heading font-medium flex items-center gap-2 text-sm shadow">
                          <Users className="w-4 h-4 text-green-400" /> Bạn bè
                        </div>
                      ) : friendship.status === 'pending' ? (
                        <button
                          disabled
                          className="px-5 py-2.5 rounded-xl bg-surface border border-border-dim text-text-dim font-medium text-sm"
                        >
                          Đã gửi lời mời
                        </button>
                      ) : (
                        <button
                          disabled
                          className="px-5 py-2.5 rounded-xl bg-surface border border-border-dim text-text-dim font-medium text-sm"
                        >
                          Đã chặn
                        </button>
                      )
                    ) : (
                      <button
                        onClick={handleSendRequest}
                        disabled={sendingRequest}
                        className="px-6 py-2.5 rounded-xl bg-brand text-white font-semibold hover:bg-brand/90 transition-all text-sm shadow-lg shadow-brand/20 active:scale-95 disabled:opacity-60"
                      >
                        {sendingRequest ? 'Đang gửi...' : 'Kết bạn'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===== TAB NAVIGATION ===== */}
        <div className="flex gap-1 p-1.5 bg-surface/60 backdrop-blur-sm border border-border-dim rounded-2xl mb-6">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold
                transition-all duration-200
                ${activeTab === tab.key
                  ? 'bg-bg-card text-text-heading shadow-sm border border-border-dim'
                  : 'text-text-dim hover:text-text-main'
                }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ===== TAB CONTENT ===== */}
        {activeTab === 'photos' && (
          <PhotosTab folders={folders} />
        )}

        {activeTab === 'map' && (
          <MapTab folders={folders} />
        )}

        {activeTab === 'liked' && (
          <LikedTab />
        )}
      </div>
    </div>
  );
}

/* ===== Sub-components ===== */

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center md:items-start">
      <span className="text-brand font-bold text-lg leading-none">{value}</span>
      <span className="text-text-dim uppercase tracking-wider text-[10px] mt-1">{label}</span>
    </div>
  );
}

function PhotosTab({ folders }: { folders: LocationFolder[] }) {
  if (folders.length === 0) {
    return (
      <div className="text-center py-16 bg-surface/50 border border-border-dim rounded-2xl stagger-item">
        <div className="text-5xl mb-4">📍</div>
        <p className="text-text-dim">Chưa có hành trình nào được chia sẻ.</p>
      </div>
    );
  }

  return (
    <div
      className="columns-2 md:columns-3 gap-3 space-y-3"
      style={{ columnFill: 'balance' }}
    >
      {folders.map((folder, idx) => (
        <Link
          key={folder.id}
          to={`/folder/${folder.id}`}
          className={`group relative block break-inside-avoid mb-3 rounded-2xl overflow-hidden
            border border-border-dim hover:border-brand/50 transition-all duration-300
            card-hover-lift stagger-item bg-bg-card`}
          style={{
            animationDelay: `${idx * 50}ms`,
            height: idx % 3 === 1 ? '220px' : '170px',
          }}
        >
          {folder.coverPhotoUrl ? (
            <img
              src={folder.coverPhotoUrl}
              alt={folder.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-surface to-bg-card flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-text-dim/40" />
            </div>
          )}

          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent
            opacity-60 group-hover:opacity-90 transition-opacity duration-300" />

          {/* Visibility badge */}
          <div className="absolute top-3 left-3 z-20">
            {folder.visibility === 'public' && (
              <span className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md text-[9px] font-bold text-white/90 border border-white/10 uppercase tracking-wider">
                <Globe className="w-2.5 h-2.5 text-blue-400" /> Public
              </span>
            )}
            {folder.visibility === 'friends' && (
              <span className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md text-[9px] font-bold text-white/90 border border-white/10 uppercase tracking-wider">
                <Users className="w-2.5 h-2.5 text-green-400" /> Friends
              </span>
            )}
          </div>

          {/* Folder info */}
          <div className="absolute bottom-0 left-0 right-0 p-3 z-20
            translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
            <h3 className="text-[13px] font-bold text-white leading-tight mb-0.5 line-clamp-1">
              {folder.name}
            </h3>
            <p className="text-white/60 text-[11px] flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5 inline" />
              {folder.photoCount} ảnh
              {folder.city && ` · ${folder.city}`}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function MapTab({ folders }: { folders: LocationFolder[] }) {
  const hasLocations = folders.some(f => f.centerLat && f.centerLng);

  if (!hasLocations) {
    return (
      <div className="text-center py-16 bg-surface/50 border border-border-dim rounded-2xl">
        <div className="text-5xl mb-4">🗺️</div>
        <p className="text-text-dim">Chưa có địa điểm nào trên bản đồ.</p>
      </div>
    );
  }

  // Simple static map preview with pins
  return (
    <div className="glass-card rounded-2xl overflow-hidden border border-border-dim">
      <div className="p-4 border-b border-border-dim flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-heading">
          <Map className="w-4 h-4 text-brand" />
          Bản đồ hành trình
        </div>
        <span className="text-xs text-text-dim">{folders.length} địa điểm</span>
      </div>

      {/* Map pins summary */}
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
        {folders.map(folder => (
          <Link
            key={folder.id}
            to={`/folder/${folder.id}`}
            className="flex items-start gap-3 p-3 rounded-xl hover:bg-card-hover transition-colors group"
          >
            <div className="mt-0.5 w-6 h-6 rounded-full bg-brand/15 flex items-center justify-center shrink-0">
              <MapPin className="w-3 h-3 text-brand" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-heading group-hover:text-brand transition-colors truncate">
                {folder.name}
              </p>
              <p className="text-xs text-text-dim mt-0.5">
                {[folder.city, folder.country].filter(Boolean).join(', ') || 'Không rõ vị trí'}
              </p>
              <p className="text-[11px] text-text-dim/70 mt-0.5">{folder.photoCount} ảnh</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function LikedTab() {
  return (
    <div className="text-center py-20 bg-surface/50 border border-border-dim rounded-2xl">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
        <Heart className="w-8 h-8 text-red-400" />
      </div>
      <h3 className="text-text-heading font-bold text-lg mb-2">Tính năng sắp ra mắt</h3>
      <p className="text-text-dim text-sm max-w-xs mx-auto">
        Tính năng xem ảnh đã thích đang được phát triển. Hãy chờ đón nhé!
      </p>
      <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand/10 border border-brand/20 text-brand text-sm font-medium">
        <span className="inline-block w-2 h-2 rounded-full bg-brand brand-pulse" />
        Đang phát triển
      </div>
    </div>
  );
}
