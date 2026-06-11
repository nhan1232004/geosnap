import React, { useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Camera } from 'lucide-react';
import { Post, UserProfile } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface StoriesBarProps {
  stories: (Post & { userProfile?: UserProfile })[];
  createStory: (file: File) => Promise<void>;
}

interface UserStoryGroup {
  uid: string;
  profile: UserProfile | undefined;
  stories: (Post & { userProfile?: UserProfile })[];
  firstStoryIndex: number; // index in flat stories array
}

function buildUserGroups(
  stories: (Post & { userProfile?: UserProfile })[],
): UserStoryGroup[] {
  const orderMap = new Map<string, number>(); // uid -> position
  const groupMap = new Map<string, UserStoryGroup>();

  stories.forEach((story, idx) => {
    if (!groupMap.has(story.uid)) {
      orderMap.set(story.uid, orderMap.size);
      groupMap.set(story.uid, {
        uid: story.uid,
        profile: story.userProfile,
        stories: [],
        firstStoryIndex: idx,
      });
    }
    groupMap.get(story.uid)!.stories.push(story);
  });

  return Array.from(orderMap.keys())
    .sort((a, b) => (orderMap.get(a) ?? 0) - (orderMap.get(b) ?? 0))
    .map((uid) => groupMap.get(uid)!);
}

// ─── Sub-components ───────────────────────────────────────────────

interface AvatarCircleProps {
  avatarUrl?: string;
  initial: string;
  seen?: boolean;
  size?: 'sm' | 'md';
}

function AvatarCircle({ avatarUrl, initial, seen = false, size = 'md' }: AvatarCircleProps) {
  const dim = size === 'md' ? 'w-16 h-16' : 'w-14 h-14';
  const ring = seen ? 'story-ring-seen' : 'story-ring';

  return (
    <div className={`${ring} ${dim} rounded-full shrink-0`}>
      <div className="w-full h-full rounded-full bg-bg-deep overflow-hidden border-2 border-bg-deep flex items-center justify-center">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={initial}
            className="w-full h-full object-cover image-reveal"
            loading="lazy"
          />
        ) : (
          <span className="text-xl font-bold text-brand">{initial}</span>
        )}
      </div>
    </div>
  );
}

// ─── Upload Dialog ────────────────────────────────────────────────

interface UploadDialogProps {
  onClose: () => void;
  onFile: (file: File) => Promise<void>;
}

function UploadDialog({ onClose, onFile }: UploadDialogProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      await onFile(selectedFile);
      onClose();
    } finally {
      setUploading(false);
      if (preview) URL.revokeObjectURL(preview);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center bg-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="glass-card w-full max-w-sm mx-auto rounded-t-3xl sm:rounded-3xl p-6 space-y-5 scale-in">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-text-heading">Tạo tin mới</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface text-text-dim transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Preview area */}
        <div
          className="relative w-full aspect-[9/16] max-h-72 rounded-2xl overflow-hidden bg-surface flex items-center justify-center cursor-pointer border-2 border-dashed border-border-dim hover:border-brand/50 transition-all"
          onClick={() => inputRef.current?.click()}
        >
          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-3 text-text-dim">
              <div className="w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center">
                <Camera className="w-6 h-6 text-brand" />
              </div>
              <span className="text-sm font-medium">Chọn ảnh từ thư viện</span>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-border-dim text-text-dim font-semibold hover:bg-surface transition-colors text-sm"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedFile || uploading}
            className="flex-1 py-3 rounded-2xl bg-brand text-white font-semibold hover:bg-brand/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg shadow-brand/25 flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Đang đăng...
              </>
            ) : (
              'Đăng tin'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── StoriesBar ───────────────────────────────────────────────────

export function StoriesBar({ stories, createStory }: StoriesBarProps) {
  const { userProfile, user } = useAppStore();
  const navigate = useNavigate();
  const [showUpload, setShowUpload] = useState(false);

  const myInitial =
    userProfile?.displayName?.charAt(0).toUpperCase() ??
    user?.email?.charAt(0).toUpperCase() ??
    '?';

  const groups = buildUserGroups(stories);

  const handleStoryClick = useCallback(
    (group: UserStoryGroup) => {
      navigate('/story-viewer', {
        state: {
          storyIndex: group.firstStoryIndex,
          stories,
        },
      });
    },
    [navigate, stories],
  );

  if (stories.length === 0 && !user) return null;

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 mb-4 items-start" style={{ scrollbarWidth: 'none' }}>
        {/* ── My Story / Create Button ── */}
        <button
          onClick={() => setShowUpload(true)}
          className="flex flex-col items-center gap-2 shrink-0 group"
          aria-label="Tạo tin mới"
        >
          <div className="relative w-16 h-16 rounded-full bg-bg-card border-2 border-dashed border-brand/40 flex items-center justify-center group-hover:border-brand transition-all duration-200 group-hover:shadow-lg group-hover:shadow-brand/20">
            {userProfile?.avatarUrl ? (
              <img
                src={userProfile.avatarUrl}
                alt="Ảnh của tôi"
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-xl font-bold text-brand">{myInitial}</span>
            )}
            {/* Plus badge */}
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-brand flex items-center justify-center ring-2 ring-bg-deep shadow">
              <Plus className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          </div>
          <span className="text-[11px] font-semibold text-text-dim group-hover:text-brand transition-colors w-16 text-center truncate">
            Tạo tin
          </span>
        </button>

        {/* ── Story Items ── */}
        {groups.map((group, i) => {
          const profile = group.profile;
          const initial =
            profile?.displayName?.charAt(0).toUpperCase() ?? '?';
          const name =
            profile?.displayName?.split(' ').pop() ?? 'User';

          return (
            <button
              key={group.uid}
              onClick={() => handleStoryClick(group)}
              className={`flex flex-col items-center gap-2 shrink-0 group stagger-item`}
              style={{ animationDelay: `${i * 40}ms` }}
              aria-label={`Xem tin của ${profile?.displayName ?? 'User'}`}
            >
              <AvatarCircle
                avatarUrl={profile?.avatarUrl}
                initial={initial}
              />
              <span className="text-[11px] font-semibold text-text-main group-hover:text-brand transition-colors w-16 text-center truncate">
                {name}
              </span>
            </button>
          );
        })}
      </div>

      {showUpload && (
        <UploadDialog
          onClose={() => setShowUpload(false)}
          onFile={createStory}
        />
      )}
    </>
  );
}
