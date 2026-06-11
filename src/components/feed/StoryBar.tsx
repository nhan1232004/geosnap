import React, { useState, useRef } from 'react';
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Post, UserProfile } from '../../types';
import { useAppStore } from '../../store/useAppStore';

interface StoryBarProps {
  stories: (Post & { userProfile?: UserProfile })[];
  createStory: (file: File) => Promise<void>;
}

export function StoryBar({ stories, createStory }: StoryBarProps) {
  const { userProfile, user } = useAppStore();
  const [viewingStory, setViewingStory] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Group stories by user
  const userStories = new Map<string, (Post & { userProfile?: UserProfile })[]>();
  stories.forEach(story => {
    const arr = userStories.get(story.uid) || [];
    arr.push(story);
    userStories.set(story.uid, arr);
  });

  const uniqueUsers = Array.from(userStories.keys());
  const myInitial = userProfile?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || '?';

  const handleCreateClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      try {
        await createStory(e.target.files[0]);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const openStory = (uid: string) => {
    const idx = stories.findIndex(s => s.uid === uid);
    if (idx !== -1) setViewingStory(idx);
  };

  const nextStory = () => {
    if (viewingStory !== null && viewingStory < stories.length - 1) {
      setViewingStory(viewingStory + 1);
    } else {
      setViewingStory(null);
    }
  };

  const prevStory = () => {
    if (viewingStory !== null && viewingStory > 0) {
      setViewingStory(viewingStory - 1);
    }
  };

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 pt-2 mb-4 custom-scrollbar items-start">
        {/* Create Story */}
        <div className="flex flex-col items-center gap-2 cursor-pointer shrink-0" onClick={handleCreateClick}>
          <div className="relative w-16 h-16 rounded-full ring-2 ring-border-dim p-0.5 bg-bg-card">
            {userProfile?.avatarUrl ? (
              <img src={userProfile.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" />
            ) : (
              <div className="w-full h-full rounded-full bg-brand/20 flex items-center justify-center text-brand font-bold text-xl">
                {myInitial}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-brand text-white rounded-full flex items-center justify-center ring-2 ring-bg-deep shadow-md">
              <Plus className="w-3 h-3" />
            </div>
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <span className="text-[12px] font-medium text-text-main">Tạo tin</span>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
        </div>

        {/* Story Items */}
        {uniqueUsers.map(uid => {
          const userArr = userStories.get(uid)!;
          const firstStory = userArr[0];
          const prof = firstStory.userProfile;
          const initial = prof?.displayName?.charAt(0).toUpperCase() || '?';
          
          return (
            <div key={uid} className="flex flex-col items-center gap-2 cursor-pointer shrink-0" onClick={() => openStory(uid)}>
              <div className="w-16 h-16 rounded-full story-ring p-0.5">
                <div className="w-full h-full rounded-full bg-bg-deep overflow-hidden border-2 border-bg-deep">
                  {prof?.avatarUrl ? (
                    <img src={prof.avatarUrl} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full bg-blue-500/20 flex items-center justify-center text-blue-500 font-bold text-xl">
                      {initial}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-[12px] font-medium text-text-main truncate w-16 text-center">
                {prof?.displayName || 'User'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Fullscreen Story Viewer */}
      {viewingStory !== null && stories[viewingStory] && (
        <div className="fixed inset-0 z-[1000] bg-black flex items-center justify-center">
          <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/80 to-transparent z-10 p-4">
            {/* Progress bar dummy */}
            <div className="flex gap-1 mb-4">
              <div className="h-1 bg-white/30 rounded-full flex-1 overflow-hidden">
                <div className="h-full bg-white w-full"></div>
              </div>
            </div>
            
            <div className="flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                {stories[viewingStory].userProfile?.avatarUrl ? (
                  <img src={stories[viewingStory].userProfile!.avatarUrl!} className="w-10 h-10 rounded-full border border-white/20 object-cover" alt="" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-brand/50 flex items-center justify-center font-bold">
                    {stories[viewingStory].userProfile?.displayName?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <div>
                  <div className="font-semibold">{stories[viewingStory].userProfile?.displayName}</div>
                  <div className="text-[11px] text-white/70">
                    {new Date(stories[viewingStory].createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                </div>
              </div>
              <button onClick={() => setViewingStory(null)} className="p-2 bg-black/20 rounded-full hover:bg-black/40">
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="w-full h-full md:w-[400px] md:h-[80vh] relative bg-black md:rounded-2xl overflow-hidden mt-0 md:mt-10">
            <img 
              src={stories[viewingStory].imageUrls[0]} 
              className="w-full h-full object-contain" 
              alt="Story" 
            />
            {stories[viewingStory].content && (
              <div className="absolute bottom-20 left-4 right-4 text-center">
                <span className="bg-black/60 text-white px-4 py-2 rounded-xl backdrop-blur-md text-lg font-medium inline-block max-w-full break-words">
                  {stories[viewingStory].content}
                </span>
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="absolute inset-0 flex" onClick={(e) => {
            // Split screen for tap to advance/reverse
            const rect = e.currentTarget.getBoundingClientRect();
            if (e.clientX < rect.width / 3) prevStory();
            else nextStory();
          }}>
             {/* Invisible tap areas overlay the image */}
          </div>
          
          <button onClick={(e) => { e.stopPropagation(); prevStory(); }} className="hidden md:flex absolute left-4 md:left-[calc(50%-260px)] top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md z-20">
            <ChevronLeft className="w-8 h-8" />
          </button>
          
          <button onClick={(e) => { e.stopPropagation(); nextStory(); }} className="hidden md:flex absolute right-4 md:right-[calc(50%-260px)] top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md z-20">
            <ChevronRight className="w-8 h-8" />
          </button>

        </div>
      )}
    </>
  );
}
