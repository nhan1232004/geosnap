import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Trash2, Volume2, VolumeX } from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAppStore } from '../store/useAppStore';
import { Post, UserProfile } from '../types';
import { useToast } from '../components/ToastContainer';

// ─── Types ───────────────────────────────────────────────────────

type StoryWithProfile = Post & { userProfile?: UserProfile };

interface LocationState {
  storyIndex?: number;
  stories?: StoryWithProfile[];
}

// ─── Helpers ──────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${Math.floor(hrs / 24)} ngày trước`;
}

// ─── Progress Bar ─────────────────────────────────────────────────

interface ProgressBarProps {
  count: number;
  current: number;
  duration: number; // ms
  playing: boolean;
  onComplete: () => void;
}

function ProgressBars({ count, current, duration, playing, onComplete }: ProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    setProgress(0);
    startTimeRef.current = null;

    if (!playing) return;

    const tick = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const pct = Math.min((elapsed / duration) * 100, 100);
      setProgress(pct);

      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onComplete();
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [current, playing, duration, onComplete]);

  return (
    <div className="flex gap-1.5 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex-1 h-[3px] rounded-full overflow-hidden bg-white/30 shadow-sm"
        >
          <div
            className="h-full bg-white rounded-full transition-none"
            style={{
              width:
                i < current
                  ? '100%'
                  : i === current
                  ? `${progress}%`
                  : '0%',
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ─── StoryViewer ──────────────────────────────────────────────────

const STORY_DURATION = 5_000; // 5 seconds

export default function StoryViewer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAppStore();
  const { toast } = useToast();

  const state = location.state as LocationState | null;

  // ── State ──
  const [stories, setStories] = useState<StoryWithProfile[]>(
    state?.stories ?? [],
  );
  const [currentIndex, setCurrentIndex] = useState<number>(
    state?.storyIndex ?? 0,
  );
  const [loadingStories, setLoadingStories] = useState(!state?.stories?.length);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(true); // placeholder for future video
  const [deleting, setDeleting] = useState(false);

  const currentStory = stories[currentIndex];
  const isOwn = user?.uid === currentStory?.uid;

  // ── Fetch stories from Firestore if not passed via state ──
  useEffect(() => {
    if (state?.stories?.length) return;

    const fetchStories = async () => {
      setLoadingStories(true);
      try {
        const now = new Date().toISOString();
        const snap = await getDocs(
          query(
            collection(db, 'posts'),
            where('type', '==', 'story'),
          ),
        );

        const raw: Post[] = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Post))
          .filter(
            (p) =>
              p.expiresAt &&
              p.expiresAt > now &&
              (p.visibility === 'public' || p.visibility === 'friends'),
          );

        // Enrich with user profiles
        const profileCache: Record<string, UserProfile> = {};
        const enriched: StoryWithProfile[] = await Promise.all(
          raw.map(async (story) => {
            if (!profileCache[story.uid]) {
              try {
                const snap2 = await getDoc(doc(db, 'users', story.uid));
                profileCache[story.uid] = snap2.exists()
                  ? ({ uid: snap2.id, ...snap2.data() } as UserProfile)
                  : ({ uid: story.uid, email: '' } as UserProfile);
              } catch {
                profileCache[story.uid] = { uid: story.uid, email: '' } as UserProfile;
              }
            }
            return { ...story, userProfile: profileCache[story.uid] };
          }),
        );

        setStories(enriched);
      } catch (e: unknown) {
        const err = e as { message?: string };
        toast('Không thể tải tin: ' + (err.message ?? 'Lỗi không xác định'), 'error');
      } finally {
        setLoadingStories(false);
      }
    };

    fetchStories();
  }, [state?.stories, toast]);

  // ── Navigation ──
  const goNext = useCallback(() => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      navigate(-1);
    }
  }, [currentIndex, stories.length, navigate]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex]);

  // ── Keyboard navigation ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
      else if (e.key === 'Escape') navigate(-1);
      else if (e.key === ' ') setPaused((p) => !p);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev, navigate]);

  // ── Tap handler ──
  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Ignore taps on interactive children (buttons)
      if ((e.target as HTMLElement).closest('button')) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      if (relX < rect.width / 3) {
        goPrev();
      } else {
        goNext();
      }
    },
    [goPrev, goNext],
  );

  // ── Delete story ──
  const handleDelete = async () => {
    if (!currentStory?.id) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'posts', currentStory.id));
      toast('Đã xóa tin', 'success');
      const updated = stories.filter((_, i) => i !== currentIndex);
      if (updated.length === 0) {
        navigate(-1);
      } else {
        setStories(updated);
        setCurrentIndex(Math.min(currentIndex, updated.length - 1));
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast('Lỗi khi xóa: ' + (err.message ?? ''), 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ── Loading state ──
  if (loadingStories) {
    return (
      <div className="fixed inset-0 z-[1000] bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentStory) {
    return (
      <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center gap-4">
        <p className="text-white/60 text-lg">Không có tin nào</p>
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-2.5 rounded-xl bg-brand text-white font-semibold"
        >
          Quay lại
        </button>
      </div>
    );
  }

  const prof = currentStory.userProfile;
  const initial =
    prof?.displayName?.charAt(0).toUpperCase() ?? '?';

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black flex items-center justify-center select-none"
      onClick={handleTap}
    >
      {/* ── Story Image Container ── */}
      <div className="relative w-full h-full md:w-[390px] md:h-[calc(100vh-40px)] md:my-5 md:rounded-3xl overflow-hidden bg-black shadow-2xl">

        {/* Background blurred image */}
        <div
          className="absolute inset-0 scale-110 blur-xl opacity-40 pointer-events-none"
          style={{
            backgroundImage: `url(${currentStory.imageUrls[0]})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Main story image */}
        <img
          key={currentStory.id}
          src={currentStory.imageUrls[0]}
          alt="Story"
          className="absolute inset-0 w-full h-full object-contain image-reveal z-[1]"
          draggable={false}
        />

        {/* ── Gradient overlays ── */}
        {/* Top */}
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-black/70 via-black/30 to-transparent z-[2] pointer-events-none" />
        {/* Bottom */}
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-[2] pointer-events-none" />

        {/* ── Top UI ── */}
        <div className="absolute top-0 inset-x-0 z-[10] px-3 pt-3 pb-2 space-y-3">
          {/* Progress bars */}
          <ProgressBars
            count={stories.length}
            current={currentIndex}
            duration={STORY_DURATION}
            playing={!paused}
            onComplete={goNext}
          />

          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/50 shadow-md shrink-0">
                {prof?.avatarUrl ? (
                  <img
                    src={prof.avatarUrl}
                    alt={initial}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-brand/70 flex items-center justify-center text-white font-bold text-sm">
                    {initial}
                  </div>
                )}
              </div>
              {/* Name & time */}
              <div className="flex flex-col min-w-0">
                <span className="text-white font-semibold text-[13px] leading-tight truncate max-w-[160px]">
                  {prof?.displayName ?? 'Người dùng'}
                </span>
                <span className="text-white/60 text-[11px] leading-tight">
                  {formatRelativeTime(currentStory.createdAt)}
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1">
              {/* Mute toggle (decorative – useful for future video stories) */}
              <button
                onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
                className="p-2 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-all"
                aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Delete button (own stories) */}
              {isOwn && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                  disabled={deleting}
                  className="p-2 rounded-full bg-black/30 hover:bg-red-500/70 text-white backdrop-blur-sm transition-all disabled:opacity-50"
                  aria-label="Xóa tin"
                >
                  {deleting ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin block" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              )}

              {/* Close */}
              <button
                onClick={(e) => { e.stopPropagation(); navigate(-1); }}
                className="p-2 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-all"
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── Story Caption ── */}
        {currentStory.content && (
          <div className="absolute bottom-6 inset-x-4 z-[10] flex justify-center">
            <p className="bg-black/60 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl text-sm font-medium text-center max-w-xs shadow-lg">
              {currentStory.content}
            </p>
          </div>
        )}

        {/* ── Tap pause indicator ── */}
        {paused && (
          <div className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <div className="flex gap-1.5">
                <div className="w-2 h-6 bg-white rounded-full" />
                <div className="w-2 h-6 bg-white rounded-full" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Desktop side navigation ── */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="hidden md:flex absolute left-[calc(50%-230px)] top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md transition-all shadow-xl z-20"
          aria-label="Story trước"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {currentIndex < stories.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="hidden md:flex absolute right-[calc(50%-230px)] top-1/2 -translate-y-1/2 w-11 h-11 items-center justify-center rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md transition-all shadow-xl z-20"
          aria-label="Story tiếp theo"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* ── Mobile: hold to pause ── */}
      <div
        className="absolute inset-0 z-[8] pointer-events-auto md:hidden"
        onPointerDown={(e) => { e.stopPropagation(); setPaused(true); }}
        onPointerUp={(e) => { e.stopPropagation(); setPaused(false); }}
        onPointerLeave={(e) => { e.stopPropagation(); setPaused(false); }}
        onClick={handleTap}
      />
    </div>
  );
}
