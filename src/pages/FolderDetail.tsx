import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { LocationFolder, Photo, Comment } from '../types';
import {
  getFolderById,
  getPhotosByFolderOptimized,
  getCommentsByFolderOptimized,
  updateFolderDoc,
  createCommentDoc,
} from '../lib/firestoreService';
import {
  ArrowLeft,
  MapPin,
  Globe,
  Users,
  Lock,
  Edit2,
  Check,
  Send,
  PlusCircle,
  X,
  Camera,
  Calendar,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';
import { Lightbox, useLightbox } from '../components/Lightbox';
import { ErrorFallback } from '../components/ErrorFallback';

// ─── Skeleton ────────────────────────────────────────────────────────────────

function HeroSkeleton() {
  return (
    <div className="w-full h-[420px] md:h-[520px] bg-surface animate-pulse rounded-none" />
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-0.5 md:gap-1">
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="aspect-square bg-surface animate-[skeleton_1.5s_ease-in-out_infinite]"
          style={{ animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function FolderDetail() {
  const { id } = useParams<{ id: string }>();
  const [folder, setFolder] = useState<LocationFolder | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // States for editing
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descInput, setDescInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const { user } = useAppStore();

  const EMOJIS = ['❤️', '🔥', '😍', '👏', '✈️', '📸', '🗺️'];

  // Lightbox integration
  const lightboxPhotos = photos.map((p) => ({
    url: p.url,
    takenAt: p.takenAt,
    location:
      p.latitude && p.longitude
        ? `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`
        : undefined,
  }));
  const { openAt, lightboxElement } = useLightbox(lightboxPhotos);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const folderData = await getFolderById(id);
      if (!folderData) {
        throw new Error('Không tìm thấy địa điểm');
      }
      setFolder(folderData);
      setDescInput(folderData.description || '');

      const fetchedPhotos = await getPhotosByFolderOptimized(id, 200);
      fetchedPhotos.sort((a, b) => {
        if (!a.takenAt || !b.takenAt) return 0;
        return new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime();
      });
      setPhotos(fetchedPhotos);

      const commentsList = await getCommentsByFolderOptimized(id, 100);
      setComments(commentsList);
    } catch (err: any) {
      console.error('Failed to fetch folder details:', err);
      setError(err instanceof Error ? err : new Error(err?.message || 'Không thể tải chi tiết địa điểm'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const isOwner = user && folder?.uid === user.uid;

  const updateVisibility = async (vis: 'private' | 'friends' | 'public') => {
    if (!folder?.id) return;
    try {
      await updateFolderDoc(folder.id, { visibility: vis });
      setFolder({ ...folder, visibility: vis });
    } catch (e) {
      console.error('Failed to update visibility', e);
    }
  };

  const saveDescription = async () => {
    if (!folder?.id) return;
    try {
      await updateFolderDoc(folder.id, { description: descInput.trim() });
      setFolder({ ...folder, description: descInput.trim() });
      setIsEditingDesc(false);
    } catch (e) {
      console.error('Failed to update description', e);
    }
  };

  const handleReaction = async (emoji: string) => {
    if (!folder?.id || !user) return;
    const currentReactions = folder.reactions || {};
    const newReactions = { ...currentReactions };
    if (newReactions[user.uid] === emoji) {
      delete newReactions[user.uid];
    } else {
      newReactions[user.uid] = emoji;
    }
    try {
      await updateFolderDoc(folder.id, { reactions: newReactions });
      setFolder({ ...folder, reactions: newReactions });
      setShowEmojiPicker(false);
    } catch (e) {
      console.error('Failed to update reaction', e);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !folder || !user) return;
    try {
      const createdComment = await createCommentDoc({
        uid: user.uid,
        folderId: folder.id,
        content: newComment.trim(),
        createdAt: new Date().toISOString(),
        userProfile: user
          ? {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || 'Người dùng',
              avatarUrl: user.avatarUrl || undefined,
              role: 'user',
              createdAt: new Date().toISOString(),
            }
          : undefined,
      });
      setComments((prev) => [...prev, createdComment]);
      setNewComment('');
    } catch (err) {
      console.error('Failed to post comment', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen animate-[page-enter_0.4s_ease-out]">
        <HeroSkeleton />
        <div className="max-w-5xl mx-auto px-4 mt-8">
          <div className="space-y-3 mb-8">
            <div className="h-8 w-64 bg-surface rounded-xl animate-pulse" />
            <div className="h-4 w-40 bg-surface rounded-xl animate-pulse" />
          </div>
          <GridSkeleton />
        </div>
      </div>
    );
  }

  if (error || !folder) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <ErrorFallback
          error={error}
          title="Không tìm thấy địa điểm"
          message={error?.message || 'Địa điểm này có thể đã bị xóa hoặc bạn không có quyền truy cập.'}
          onRetry={fetchData}
          fullScreen
        />
      </div>
    );
  }

  const vis = folder.visibility || 'private';
  const totalReactions = Object.keys(folder.reactions || {}).length;

  const firstDate = folder.firstVisitedAt
    ? new Date(folder.firstVisitedAt).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className="min-h-screen pb-20 animate-[page-enter_0.4s_ease-out]">
      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <div className="relative w-full h-[400px] md:h-[520px] overflow-hidden">
        {folder.coverPhotoUrl ? (
          <img
            src={folder.coverPhotoUrl}
            alt="Cover"
            className="absolute inset-0 w-full h-full object-cover scale-105 animate-[image-reveal_0.6s_ease-out_forwards]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-bg-deep via-surface to-bg-card" />
        )}

        {/* Multi-layer gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-bg-deep via-bg-deep/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg-deep/40 to-transparent" />

        {/* Back link */}
        <div className="absolute top-6 left-6 z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md text-white/80 hover:text-white border border-white/10 text-[13px] font-medium transition-all hover:bg-black/60"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>

        {/* Hero content */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-10 md:px-12 md:pb-12">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand/20 border border-brand/30 backdrop-blur-sm">
              <MapPin className="w-3.5 h-3.5 text-brand" />
              <span className="text-[12px] font-semibold text-brand tracking-wide uppercase">
                {folder.city || folder.country || 'Location'}
              </span>
            </div>
            {firstDate && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm border border-white/10">
                <Calendar className="w-3.5 h-3.5 text-white/50" />
                <span className="text-[12px] font-medium text-white/60">{firstDate}</span>
              </div>
            )}
          </div>

          <h1 className="text-[36px] md:text-[56px] font-extrabold tracking-tight text-white leading-tight mb-3 drop-shadow-2xl">
            {folder.name}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-[13px]">
            <span className="flex items-center gap-1.5 text-white/50 font-mono">
              <MapPin className="w-3.5 h-3.5" />
              {folder.centerLat.toFixed(4)}, {folder.centerLng.toFixed(4)}
            </span>
            <span className="w-px h-4 bg-white/20" />
            <span className="flex items-center gap-1.5 text-white/70 font-semibold">
              <Camera className="w-3.5 h-3.5 text-brand" />
              {photos.length} photos
            </span>
            {totalReactions > 0 && (
              <>
                <span className="w-px h-4 bg-white/20" />
                <span className="text-white/50">{totalReactions} reactions</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        <div className="flex flex-col lg:flex-row gap-6 py-8 border-b border-border-dim">
          <div className="flex-1 space-y-5">
            {isOwner && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[12px] font-medium text-text-dim uppercase tracking-wider">
                  Visibility
                </span>
                <div className="flex bg-surface border border-border-dim rounded-lg p-1">
                  <button
                    onClick={() => updateVisibility('private')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium transition-all',
                      vis === 'private'
                        ? 'bg-bg-card border border-border-dim text-white shadow'
                        : 'text-text-dim hover:text-white',
                    )}
                  >
                    <Lock className="w-3.5 h-3.5" /> Private
                  </button>
                  <button
                    onClick={() => updateVisibility('friends')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium transition-all',
                      vis === 'friends'
                        ? 'bg-bg-card border border-border-dim text-green-400 shadow'
                        : 'text-text-dim hover:text-white',
                    )}
                  >
                    <Users className="w-3.5 h-3.5" /> Friends
                  </button>
                  <button
                    onClick={() => updateVisibility('public')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1 rounded-md text-[12px] font-medium transition-all',
                      vis === 'public'
                        ? 'bg-bg-card border border-border-dim text-blue-400 shadow'
                        : 'text-text-dim hover:text-white',
                    )}
                  >
                    <Globe className="w-3.5 h-3.5" /> Public
                  </button>
                </div>
              </div>
            )}

            <div>
              {isEditingDesc ? (
                <div className="flex items-start gap-3">
                  <textarea
                    autoFocus
                    className="w-full bg-surface border border-brand/50 rounded-xl p-3 text-[14px] text-white outline-none resize-none min-h-[80px] focus:border-brand transition-colors"
                    value={descInput}
                    onChange={(e) => setDescInput(e.target.value)}
                    placeholder="Thêm mô tả cho hành trình này..."
                  />
                  <button
                    onClick={saveDescription}
                    className="p-3 bg-brand text-white rounded-xl hover:bg-brand/90 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsEditingDesc(false)}
                    className="p-3 border border-border-dim text-text-dim rounded-xl hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="group relative">
                  <p className="text-[14px] text-text-dim leading-relaxed whitespace-pre-wrap pr-10">
                    {folder.description ||
                      (isOwner
                        ? 'Chưa có mô tả cho địa điểm này. Click để thêm mô tả chia sẻ với bạn bè.'
                        : 'Chưa có mô tả.')}
                  </p>
                  {isOwner && (
                    <button
                      onClick={() => setIsEditingDesc(true)}
                      className="absolute top-0 right-0 p-2 text-text-dim opacity-0 group-hover:opacity-100 transition-opacity hover:text-brand"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {EMOJIS.map((emoji) => {
                const count = Object.values(folder.reactions || {}).filter(
                  (e) => e === emoji,
                ).length;
                const hasReacted = user && folder.reactions?.[user.uid] === emoji;
                if (count === 0 && !showEmojiPicker) return null;
                return (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all shadow-sm border',
                      hasReacted
                        ? 'bg-brand/20 border-brand/40 text-white scale-105'
                        : 'bg-surface border-border-dim text-text-dim hover:border-white/20 hover:text-white',
                    )}
                  >
                    <span>{emoji}</span>
                    {count > 0 && (
                      <span className={hasReacted ? 'text-brand' : ''}>{count}</span>
                    )}
                  </button>
                );
              })}

              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-surface border border-border-dim text-text-dim hover:text-white hover:border-brand/40 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="py-8">
          <h2 className="text-[13px] font-semibold text-text-dim uppercase tracking-widest mb-4">
            Photos · {photos.length}
          </h2>

          {photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-text-dim">
              <Camera className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">No photos in this folder yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 md:gap-1">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  onClick={() => openAt(index)}
                  className="aspect-square bg-surface overflow-hidden relative group cursor-zoom-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <img
                    src={photo.url}
                    alt="Memory"
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                    <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 drop-shadow-lg scale-75 group-hover:scale-100" />
                  </div>
                  {photo.hasGps && (
                    <div className="absolute bottom-1.5 left-1.5 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <MapPin className="w-2.5 h-2.5 text-brand" />
                      GPS
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 max-w-2xl border-t border-border-dim pt-10 pb-8">
          <h3 className="text-xl font-bold text-white mb-6">
            Bình luận
            {comments.length > 0 && (
              <span className="ml-2 text-sm font-normal text-text-dim">({comments.length})</span>
            )}
          </h3>

          <div className="space-y-6 mb-8">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-4 stagger-item">
                {c.userProfile?.avatarUrl ? (
                  <img
                    src={c.userProfile.avatarUrl}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-border-dim"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-brand font-bold shrink-0">
                    {(c.userProfile?.displayName || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="bg-surface border border-border-dim rounded-2xl p-4 text-[14px]">
                    <div className="font-semibold text-white mb-1">
                      {c.userProfile?.displayName || 'User'}
                    </div>
                    <p className="text-text-main leading-relaxed">{c.content}</p>
                  </div>
                  <div className="text-[11px] text-text-dim mt-1 ml-2">
                    {new Date(c.createdAt).toLocaleDateString('vi-VN')} lúc{' '}
                    {new Date(c.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))}

            {comments.length === 0 && (
              <p className="text-text-dim text-sm py-4">
                Chưa có bình luận nào. Hãy là người đầu tiên!
              </p>
            )}
          </div>

          {user && (
            <form onSubmit={handlePostComment} className="flex gap-3">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Viết bình luận..."
                className="flex-1 bg-surface border border-border-dim rounded-xl px-4 py-3 text-[14px] text-text-main outline-none focus:border-brand/60 transition-colors"
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="px-5 py-3 bg-brand text-white rounded-xl font-semibold hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>

      {lightboxElement}
    </div>
  );
}
