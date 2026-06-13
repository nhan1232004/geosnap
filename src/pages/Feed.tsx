import React, { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import { LocationFolder, UserProfile, Post, FeedItem } from '../types';
import { Link } from 'react-router-dom';
import { CreatePost } from '../components/feed/CreatePost';
import { StoriesBar } from '../components/Stories/StoriesBar';
import { PostItem } from '../components/feed/PostItem';
import { useToast } from '../components/ToastContainer';
import { Loader2 } from 'lucide-react';

export default function Feed() {
  const { user } = useAppStore();
  const { toast } = useToast();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [stories, setStories] = useState<(Post & { userProfile?: UserProfile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [displayLimit, setDisplayLimit] = useState(10);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const fetchFeed = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setDisplayLimit(10);

    try {
      // Parallel fetch posts feed, friends' folders and active stories
      const [feedRes, foldersRes, storiesRes] = await Promise.all([
        api.get<{ posts: any[] }>('/api/v1/posts/feed?limit=100'),
        api.get<{ folders: any[] }>('/api/v1/folders/friends'),
        api.get<{ stories: any[] }>('/api/v1/posts/stories')
      ]);

      // Map posts to FeedItems and enrich userProfile
      const mappedPosts: FeedItem[] = feedRes.posts.map(p => {
        const userProfile: UserProfile = p.user ? {
          uid: p.user.uid,
          displayName: p.user.displayName,
          avatarUrl: p.user.avatarUrl,
          email: '',
          role: 'user',
          createdAt: ''
        } : { uid: p.uid, email: '', role: 'user', createdAt: '' };

        return {
          id: p.id,
          type: 'post' as const,
          data: { ...p, userProfile } as Post,
          createdAt: p.createdAt
        };
      });

      // Map folders to FeedItems and enrich userProfile
      const mappedFolders: FeedItem[] = foldersRes.folders.map(f => {
        const userProfile: UserProfile = f.user ? {
          uid: f.user.id,
          displayName: f.user.displayName,
          avatarUrl: f.user.avatarUrl,
          email: '',
          role: 'user',
          createdAt: ''
        } : { uid: f.uid, email: '', role: 'user', createdAt: '' };

        return {
          id: f.id,
          type: 'folder' as const,
          data: { ...f, userProfile } as LocationFolder & { userProfile: UserProfile },
          createdAt: f.createdAt
        };
      });

      // Combine and sort
      const combined = [...mappedPosts, ...mappedFolders];
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Enrich stories
      const enrichedStories = storiesRes.stories.map(s => {
        const userProfile: UserProfile = s.user ? {
          uid: s.user.uid,
          displayName: s.user.displayName,
          avatarUrl: s.user.avatarUrl,
          email: '',
          role: 'user',
          createdAt: ''
        } : { uid: s.uid, email: '', role: 'user', createdAt: '' };

        return { ...s, userProfile } as Post & { userProfile: UserProfile };
      });

      setFeed(combined);
      setStories(enrichedStories);
    } catch (e: any) {
      console.error('Error fetching feed:', e);
      toast('Không thể tải bảng tin: ' + (e?.message || 'Lỗi kết nối'), 'error');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Infinite scroll observer for pagination
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayLimit < feed.length && !loadingMore) {
          setLoadingMore(true);
          setTimeout(() => {
            setDisplayLimit(prev => Math.min(prev + 10, feed.length));
            setLoadingMore(false);
          }, 500);
        }
      },
      { threshold: 0.1 }
    );
    if (observerRef.current) {
      observer.observe(observerRef.current);
    }
    return () => observer.disconnect();
  }, [displayLimit, feed.length, loadingMore]);

  const handleCreatePost = async (content: string, files: File[]) => {
    if (!user) return;
    try {
      // Upload images to R2 storage
      const urls = await Promise.all(
        files.map(async (file) => {
          const res = await api.uploadPhoto(file);
          return res.url;
        })
      );

      // Create post record
      await api.post('/api/v1/posts', {
        type: 'post',
        content: content.trim(),
        imageUrls: urls,
        visibility: 'friends'
      });

      toast('Bài viết đã được đăng thành công!', 'success');
      fetchFeed();
    } catch (e: any) {
      console.error('handleCreatePost error:', e);
      toast('Lỗi khi đăng bài: ' + (e?.message || 'Vui lòng thử lại.'), 'error');
      throw e;
    }
  };

  const handleCreateStory = async (file: File) => {
    if (!user) return;
    try {
      const res = await api.uploadPhoto(file);

      const expires = new Date();
      expires.setHours(expires.getHours() + 24);

      await api.post('/api/v1/posts', {
        type: 'story',
        imageUrls: [res.url],
        expiresAt: expires.toISOString(),
        visibility: 'friends'
      });
      toast('Tin đã được tạo thành công!', 'success');
      fetchFeed();
    } catch (e: any) {
      console.error('handleCreateStory error:', e);
      toast('Không thể tạo tin: ' + (e?.message || 'Vui lòng thử lại.'), 'error');
    }
  };

  const handleReaction = async (itemId: string, itemType: 'post' | 'folder', emoji: string) => {
    if (!user) return;
    const itemIdx = feed.findIndex(i => i.id === itemId);
    if (itemIdx === -1) return;
    
    const item = feed[itemIdx];
    const data = item.data as any;
    const currentReactions = data.reactions || {};
    const newReactions = { ...currentReactions };
    
    const hasReacted = currentReactions[user.uid] === emoji;
    
    try {
      if (itemType === 'post') {
        // Post reaction API
        const reactionEmoji = hasReacted ? null : emoji;
        const res = await api.put<{ reactions: any }>(`/api/v1/posts/${itemId}/react`, { emoji: reactionEmoji });
        
        const newFeed = [...feed];
        newFeed[itemIdx] = { ...item, data: { ...data, reactions: res.reactions } };
        setFeed(newFeed);
      } else {
        // Folder reaction API
        if (hasReacted) {
          delete newReactions[user.uid];
        } else {
          newReactions[user.uid] = emoji;
        }
        await api.put(`/api/v1/folders/${itemId}`, { reactions: newReactions });
        
        const newFeed = [...feed];
        newFeed[itemIdx] = { ...item, data: { ...data, reactions: newReactions } };
        setFeed(newFeed);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-10 pb-24 md:pb-10">
      <div className="mb-6 md:mb-8">
        <h1 className="text-[24px] md:text-[30px] font-bold tracking-tight text-text-heading">Social Feed</h1>
        <p className="text-text-dim text-sm mt-1">Khám phá hành trình mới nhất của bạn bè</p>
      </div>

      <StoriesBar stories={stories} createStory={handleCreateStory} />
      
      <CreatePost onPostCreated={fetchFeed} createPost={handleCreatePost} />

      {loading ? (
        <div className="space-y-8 mt-6">
          {[1,2,3].map(i => (
            <div key={i} className="bg-bg-card border border-border-dim rounded-3xl h-[400px] animate-pulse"></div>
          ))}
        </div>
      ) : feed.length === 0 ? (
        <div className="text-center py-20 bg-bg-card rounded-3xl border border-border-dim mt-6">
          <div className="text-6xl mb-4">🌍</div>
          <h2 className="text-xl font-bold text-text-heading mb-2">Chưa có bài viết mới</h2>
          <p className="text-text-dim text-sm max-w-sm mx-auto mb-6">Hãy kết bạn hoặc tạo bài viết đầu tiên của bạn.</p>
          <Link to="/friends" className="px-6 py-3 rounded-xl bg-brand text-white font-semibold hover:bg-brand/90 transition-all shadow-lg shadow-brand/20">
            Tìm bạn bè
          </Link>
        </div>
      ) : (
        <div className="space-y-6 mt-6">
          {feed.slice(0, displayLimit).map(item => (
            <div key={item.id}>
              <PostItem item={item} handleReaction={handleReaction} />
            </div>
          ))}

          {/* Sentinel for infinite scroll */}
          {displayLimit < feed.length && (
            <div ref={observerRef} className="py-6 flex items-center justify-center gap-2 text-text-dim text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-brand" />
              <span>Đang tải thêm...</span>
            </div>
          )}

          {displayLimit >= feed.length && feed.length > 0 && (
            <div className="py-8 text-center text-text-dim text-xs">
              ✨ Bạn đã xem hết tất cả {feed.length} bài viết mới nhất
            </div>
          )}
        </div>
      )}
    </div>
  );
}
