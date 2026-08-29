import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { LocationFolder, UserProfile, Post, FeedItem } from '../types';
import { Link } from 'react-router-dom';
import { CreatePost } from '../components/feed/CreatePost';
import { StoriesBar } from '../components/Stories/StoriesBar';
import { PostItem } from '../components/feed/PostItem';
import { useToast } from '../components/ToastContainer';
import { ErrorFallback } from '../components/ErrorFallback';
import { Loader2 } from 'lucide-react';
import {
  getUserFeedOptimized,
  getActiveStories,
  createPostDoc,
  togglePostReactionDoc,
  uploadImageFile,
  updateFolderDoc,
  getUserPublicFolders,
  getFriendsList,
} from '../lib/firestoreService';

export default function Feed() {
  const { user } = useAppStore();
  const { toast } = useToast();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [stories, setStories] = useState<(Post & { userProfile?: UserProfile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [displayLimit, setDisplayLimit] = useState(10);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef<HTMLDivElement>(null);

  const fetchFeed = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setDisplayLimit(10);

    try {
      // Parallel fetch posts feed, friends' folders and active stories from Firestore
      const [postsList, storiesList, friends] = await Promise.all([
        getUserFeedOptimized(user.uid, 50),
        getActiveStories(user.uid),
        getFriendsList(user.uid),
      ]);

      const mappedPosts: FeedItem[] = postsList.map((p) => ({
        id: p.id || '',
        type: 'post' as const,
        data: p,
        createdAt: p.createdAt,
      }));

      const friendFolders: FeedItem[] = [];
      for (const friend of friends) {
        try {
          const folders = await getUserPublicFolders(friend.uid, 10);
          folders.forEach((f) => {
            friendFolders.push({
              id: f.id || '',
              type: 'folder' as const,
              data: { ...f, userProfile: friend },
              createdAt: f.createdAt,
            });
          });
        } catch (folderErr) {
          console.warn(`Could not load folders for friend ${friend.uid}:`, folderErr);
        }
      }

      const combined = [...mappedPosts, ...friendFolders];
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setFeed(combined);
      setStories(storiesList);
    } catch (e: any) {
      console.error('Error fetching feed:', e);
      setError(e instanceof Error ? e : new Error(e?.message || 'Không thể tải bảng tin'));
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
      // Upload images to Firebase Storage
      const urls = await Promise.all(
        files.map(async (file) => {
          const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          return await uploadImageFile(file, `posts/${user.uid}/${filename}`);
        })
      );

      // Create post in Firestore
      await createPostDoc({
        uid: user.uid,
        type: 'post',
        content: content.trim(),
        imageUrls: urls,
        visibility: 'friends',
        reactions: {},
        commentCount: 0,
        shareCount: 0,
        createdAt: new Date().toISOString(),
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
      const filename = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const url = await uploadImageFile(file, `stories/${user.uid}/${filename}`);

      const expires = new Date();
      expires.setHours(expires.getHours() + 24);

      await createPostDoc({
        uid: user.uid,
        type: 'story',
        content: '',
        imageUrls: [url],
        expiresAt: expires.toISOString(),
        visibility: 'friends',
        reactions: {},
        commentCount: 0,
        shareCount: 0,
        createdAt: new Date().toISOString(),
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
        await togglePostReactionDoc(itemId, user.uid, emoji);
        if (hasReacted) {
          delete newReactions[user.uid];
        } else {
          newReactions[user.uid] = emoji;
        }
        const newFeed = [...feed];
        newFeed[itemIdx] = { ...item, data: { ...data, reactions: newReactions } };
        setFeed(newFeed);
      } else {
        if (hasReacted) {
          delete newReactions[user.uid];
        } else {
          newReactions[user.uid] = emoji;
        }
        await updateFolderDoc(itemId, { reactions: newReactions });
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
      ) : error && feed.length === 0 ? (
        <ErrorFallback
          error={error}
          title="Không thể tải bảng tin"
          message={error.message || 'Đã có lỗi xảy ra khi kết nối máy chủ.'}
          onRetry={fetchFeed}
          className="mt-6"
        />
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
