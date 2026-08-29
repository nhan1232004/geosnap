import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, MessageCircle, Share2, MoreHorizontal, Trash2, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FeedItem, Comment } from '../../types';
import { timeAgo } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';
import { useToast } from '../ToastContainer';
import { useLightbox } from '../Lightbox';
import {
  getCommentsByFolderOptimized,
  createCommentDoc,
  deleteCommentDoc,
} from '../../lib/firestoreService';

interface PostItemProps {
  item: FeedItem;
  handleReaction: (itemId: string, itemType: 'post' | 'folder', emoji: string) => Promise<void>;
}

const REACTIONS = ['❤️', '🔥', '😍', '👏', '✈️'] as const;
type ReactionEmoji = typeof REACTIONS[number];

function getTopReactions(reactions: Record<string, string>): { emoji: string; count: number }[] {
  const counts: Record<string, number> = {};
  Object.values(reactions).forEach((emoji) => {
    counts[emoji] = (counts[emoji] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([emoji, count]) => ({ emoji, count }));
}

// ─── Emoji Reaction Picker ────────────────────────────────────────────────────
interface ReactionPickerProps {
  myReaction: string | null;
  onReact: (emoji: ReactionEmoji) => void;
}

function ReactionPicker({ myReaction, onReact }: ReactionPickerProps) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);
  };
  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => setOpen(false), 300);
  };

  // Close on outside click (mobile)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClick = () => {
    setOpen((prev) => !prev);
  };

  const handleSelectEmoji = (emoji: ReactionEmoji) => {
    onReact(emoji);
    setOpen(false);
  };

  const isActive = myReaction !== null;

  return (
    <div
      ref={containerRef}
      className="relative flex-1 flex items-center justify-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Popup */}
      {open && (
        <div
          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50
                     bg-bg-card border border-border-dim rounded-2xl shadow-xl shadow-black/20
                     px-2 py-2 flex gap-1 animate-[fadeInUp_0.15s_ease]"
        >
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleSelectEmoji(emoji)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl
                         transition-all hover:scale-125 active:scale-110
                         ${myReaction === emoji ? 'bg-brand/15 ring-2 ring-brand/40' : 'hover:bg-surface'}`}
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={handleClick}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all
                   ${isActive
                     ? 'text-red-500 font-semibold'
                     : 'text-text-dim hover:bg-surface hover:text-text-main'}`}
      >
        <span className="text-[18px] leading-none select-none">
          {myReaction ?? '❤️'}
        </span>
        <span className="text-[13px] font-semibold">Thích</span>
      </button>
    </div>
  );
}

// ─── Main PostItem ────────────────────────────────────────────────────────────
export function PostItem({ item, handleReaction }: PostItemProps) {
  const { user } = useAppStore();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  const data = item.data as any;
  const prof = data.userProfile as { displayName?: string; avatarUrl?: string } | undefined;
  const reactions = (data.reactions as Record<string, string>) ?? {};
  const initial = prof?.displayName?.charAt(0).toUpperCase() ?? '?';
  const myReaction = user ? (reactions[user.uid] ?? null) : null;
  const reactionCount = Object.keys(reactions).length;
  const topReactions = getTopReactions(reactions);
  const commentCount = (data.commentCount as number) ?? 0;

  const images: string[] =
    item.type === 'post'
      ? (data.imageUrls as string[]) ?? []
      : data.coverPhotoUrl
        ? [data.coverPhotoUrl as string]
        : [];

  // Lightbox
  const lightboxPhotos = images.map((url) => ({ url }));
  const { openAt, lightboxElement } = useLightbox(lightboxPhotos);

  const fetchComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const commentsList = await getCommentsByFolderOptimized(item.id, 50);
      setComments(commentsList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingComments(false);
    }
  }, [item.id]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    try {
      const createdComment = await createCommentDoc({
        uid: user.uid,
        folderId: item.id,
        content: newComment.trim(),
        createdAt: new Date().toISOString(),
        userProfile: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Người dùng',
          avatarUrl: user.avatarUrl || undefined,
          role: 'user',
          createdAt: new Date().toISOString(),
        },
      });
      setComments((prev) => [...prev, createdComment]);
      setNewComment('');
    } catch (e: any) {
      console.error(e);
      toast('Không thể đăng bình luận: ' + (e?.message || 'Unknown error'), 'error');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteCommentDoc(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      toast('Bình luận đã được xoá', 'success');
    } catch (e: any) {
      console.error(e);
      toast('Không thể xoá bình luận: ' + (e?.message || 'Unknown error'), 'error');
    }
  };

  // Close share menu on outside click
  useEffect(() => {
    if (!showShareMenu) return;
    const handler = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showShareMenu]);

  const shareUrl =
    item.type === 'folder'
      ? `${window.location.origin}/folder/${item.id}`
      : `${window.location.origin}/profile/${data.uid as string}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast('Đã copy link chia sẻ!', 'success');
    setShowShareMenu(false);
  };

  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const handleSystemShare = () => {
    if (navigator.share) {
      navigator.share({
        title: item.type === 'folder' ? `Địa điểm: ${data.name}` : 'Bài viết mới trên GeoSnap',
        text: (data.content || data.description || 'Xem hành trình của tôi trên GeoSnap!').slice(0, 100),
        url: shareUrl
      }).catch(console.error);
    } else {
      handleCopyLink();
    }
    setShowShareMenu(false);
  };

  const handleReact = async (emoji: ReactionEmoji) => {
    await handleReaction(item.id, item.type, emoji);
  };

  const focusComment = () => {
    setShowComments(true);
    setTimeout(() => commentInputRef.current?.focus(), 80);
  };

  return (
    <>
      {lightboxElement}
      <article className="bg-bg-card border border-border-dim rounded-3xl overflow-hidden shadow-lg shadow-black/5 stagger-item">
        {/* ── Header ── */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to={`/profile/${data.uid as string}`}>
              {prof?.avatarUrl ? (
                <img
                  src={prof.avatarUrl}
                  alt={prof.displayName ?? 'avatar'}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-border-dim"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-brand font-bold text-sm">
                  {initial}
                </div>
              )}
            </Link>
            <div>
              <Link
                to={`/profile/${data.uid as string}`}
                className="text-[14px] font-bold text-text-heading hover:underline"
              >
                {prof?.displayName ?? 'User'}
              </Link>
              <div className="text-[12px] text-text-dim flex items-center gap-1 mt-0.5">
                <span>{timeAgo(item.createdAt)}</span>
                <span>·</span>
                <span>{(data.visibility as string) === 'public' ? '🌍' : '👥'}</span>
              </div>
            </div>
          </div>
          <button className="text-text-dim hover:text-text-main p-2 rounded-xl hover:bg-surface transition-all">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>

        {/* ── Folder title ── */}
        {item.type === 'folder' && (
          <div className="px-4 pb-2">
            <Link to={`/folder/${item.id}`} className="inline-flex group/title">
              <h3 className="text-[16px] font-bold text-text-heading group-hover/title:text-brand transition-colors flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-brand shrink-0" />
                {data.name as string}
              </h3>
            </Link>
          </div>
        )}

        {/* ── Text content ── */}
        {(data.content || data.description) && (
          <div className="px-4 pb-3">
            <p className="text-[14px] text-text-main whitespace-pre-wrap leading-relaxed">
              {(data.content as string) || (data.description as string)}
            </p>
          </div>
        )}

        {/* ── Images ── */}
        {images.length > 0 && (
          <div className="relative bg-black group aspect-[4/5] sm:aspect-[4/3] overflow-hidden">
            <img
              src={images[activeImage]}
              alt="Post content"
              className="w-full h-full object-cover transition-all duration-500 cursor-zoom-in"
              loading="lazy"
              onClick={() => openAt(activeImage)}
            />
            {item.type === 'folder' && (
              <Link to={`/folder/${item.id}`} className="absolute inset-0 z-10 cursor-pointer" />
            )}
            {/* Dot indicators */}
            {images.length > 1 && (
              <>
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-20 pointer-events-none">
                  {images.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all ${
                        i === activeImage ? 'w-5 bg-white shadow-md' : 'w-1.5 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
                {/* Tap zones */}
                <div
                  className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer"
                  onClick={() => setActiveImage((p) => (p > 0 ? p - 1 : images.length - 1))}
                />
                <div
                  className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-pointer"
                  onClick={() => setActiveImage((p) => (p < images.length - 1 ? p + 1 : 0))}
                />
                {/* Click center to open lightbox */}
                <div
                  className="absolute inset-y-0 left-1/3 right-1/3 z-20 cursor-zoom-in"
                  onClick={() => openAt(activeImage)}
                />
              </>
            )}
          </div>
        )}

        {/* ── Stats row ── */}
        {(reactionCount > 0 || commentCount > 0) && (
          <div className="px-4 py-2 flex justify-between items-center text-[12px] text-text-dim border-b border-border-dim/50">
            {reactionCount > 0 ? (
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-0.5">
                  {topReactions.map(({ emoji }) => (
                    <span
                      key={emoji}
                      className="w-5 h-5 bg-bg-card border border-border-dim rounded-full flex items-center justify-center text-[11px] shadow-sm"
                    >
                      {emoji}
                    </span>
                  ))}
                </div>
                <span>{reactionCount}</span>
              </div>
            ) : <span />}
            {commentCount > 0 && (
              <button
                onClick={() => setShowComments((s) => !s)}
                className="hover:underline"
              >
                {commentCount} bình luận
              </button>
            )}
          </div>
        )}

        {/* ── Action bar ── */}
        <div className="px-2 py-1 flex items-center justify-between border-t border-border-dim">
          <ReactionPicker myReaction={myReaction} onReact={handleReact} />

          <button
            onClick={focusComment}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-text-dim hover:bg-surface hover:text-text-main transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-[13px] font-semibold">Bình luận</span>
          </button>

          <div className="flex-1 relative" ref={shareMenuRef}>
            <button
              onClick={() => setShowShareMenu(prev => !prev)}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all
                         ${showShareMenu ? 'bg-surface text-text-main' : 'text-text-dim hover:bg-surface hover:text-text-main'}`}
            >
              <Share2 className="w-5 h-5" />
              <span className="text-[13px] font-semibold">Chia sẻ</span>
            </button>

            {showShareMenu && (
              <div 
                className="absolute bottom-full mb-2 right-1/2 translate-x-1/2 sm:translate-x-0 sm:right-0 z-50 w-52
                           bg-bg-card border border-border-dim rounded-2xl shadow-xl shadow-black/25
                           py-1.5 flex flex-col scale-in origin-bottom"
              >
                <button
                  onClick={handleFacebookShare}
                  className="flex items-center gap-2.5 px-4 py-2 text-[12px] font-semibold text-text-main hover:bg-surface text-left transition-colors"
                >
                  <span className="text-blue-500 text-base">📘</span>
                  Chia sẻ lên Facebook
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-2.5 px-4 py-2 text-[12px] font-semibold text-text-main hover:bg-surface text-left transition-colors"
                >
                  <span className="text-gray-400 text-base">🔗</span>
                  Sao chép liên kết
                </button>
                <button
                  onClick={handleSystemShare}
                  className="flex items-center gap-2.5 px-4 py-2 text-[12px] font-semibold text-text-main hover:bg-surface text-left transition-colors"
                >
                  <span className="text-brand text-base">📲</span>
                  Chia sẻ khác...
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Comments section ── */}
        <div className="border-t border-border-dim/40 bg-surface/20">
          {/* Comment form – always visible */}
          <div className="px-4 pt-3 pb-2">
            <form onSubmit={handlePostComment} className="flex items-center gap-2">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-border-dim" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-brand font-bold shrink-0 text-xs">
                  {(user?.displayName ?? '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 flex items-center gap-2 bg-bg-card border border-border-dim focus-within:border-brand/50 rounded-full px-3 transition-all">
                <input
                  ref={commentInputRef}
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onFocus={() => setShowComments(true)}
                  placeholder="Viết bình luận..."
                  className="flex-1 bg-transparent py-2 text-[13px] outline-none text-text-main placeholder:text-text-dim"
                />
                {newComment.trim() && (
                  <button
                    type="submit"
                    className="text-brand hover:text-brand/80 transition-colors shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Comments list */}
          {showComments && (
            <div className="px-4 pb-3 flex flex-col gap-3">
              {loadingComments ? (
                <div className="flex gap-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-surface animate-pulse shrink-0" />
                      <div className="h-10 w-40 rounded-2xl bg-surface animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <p className="text-[12px] text-text-dim text-center py-1">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-2 group/comment">
                    {/* Avatar */}
                    {c.userProfile?.avatarUrl ? (
                      <img
                        src={c.userProfile.avatarUrl}
                        alt={c.userProfile.displayName ?? ''}
                        className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5 ring-1 ring-border-dim"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-brand font-bold shrink-0 mt-0.5 text-[10px]">
                        {(c.userProfile?.displayName ?? '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="bg-bg-card border border-border-dim/60 rounded-2xl px-3 py-2 inline-block max-w-full">
                        <span className="text-[12px] font-bold text-text-heading block leading-tight">
                          {c.userProfile?.displayName ?? 'User'}
                        </span>
                        <p className="text-[13px] text-text-main leading-snug mt-0.5 break-words">
                          {c.content}
                        </p>
                      </div>
                      <div className="mt-1 ml-1 text-[11px] text-text-dim">
                        {timeAgo(c.createdAt)}
                      </div>
                    </div>
                    {user && user.uid === c.uid && (
                      <button
                        onClick={() => handleDeleteComment(c.id!)}
                        className="opacity-0 group-hover/comment:opacity-100 transition-opacity text-text-dim hover:text-red-500 p-1 self-start mt-1 shrink-0"
                        title="Xoá bình luận"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </article>
    </>
  );
}
