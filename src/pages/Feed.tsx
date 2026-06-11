import React, { useEffect, useState, useCallback, useRef } from 'react';
import { collection, query, where, getDocs, limit, getDoc, doc, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppStore } from '../store/useAppStore';
import { LocationFolder, UserProfile, Post, FeedItem } from '../types';
import { Link } from 'react-router-dom';
import { CreatePost } from '../components/feed/CreatePost';
import { StoriesBar } from '../components/Stories/StoriesBar';
import { PostItem } from '../components/feed/PostItem';
import { useToast } from '../components/ToastContainer';
import { Loader2 } from 'lucide-react';

/**
 * Compress & resize an image file into a base64 string small enough
 * to fit inside a Firestore document (< 1 MB limit).
 * maxDim: max width or height in pixels
 * quality: JPEG quality 0–1
 */
function compressImageToBase64(file: File, maxDim: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        const ratio = Math.min(maxDim / w, maxDim / h, 1);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context unavailable'));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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
      console.log('Fetching feed for user:', user.uid);

      const [sentSnap, receivedSnap] = await Promise.all([
        getDocs(query(collection(db, 'friendships'), where('requesterId', '==', user.uid), where('status', '==', 'accepted'))),
        getDocs(query(collection(db, 'friendships'), where('addresseeId', '==', user.uid), where('status', '==', 'accepted')))
      ]);

      const friendIds = [
        ...sentSnap.docs.map(d => d.data().addresseeId),
        ...receivedSnap.docs.map(d => d.data().requesterId),
        user.uid // Include own posts
      ];

      console.log('Feed friend IDs:', friendIds.length);

      let rawFolders: LocationFolder[] = [];
      let rawPosts: Post[] = [];

      for (let i = 0; i < friendIds.length; i += 10) {
        const chunk = friendIds.slice(i, i + 10);

        try {
          // Folders
          const fSnap = await getDocs(query(
            collection(db, 'folders'),
            where('uid', 'in', chunk),
            limit(30)
          ));
          rawFolders = [
            ...rawFolders,
            ...fSnap.docs
              .map(d => {
                try {
                  return { id: d.id, ...d.data() } as LocationFolder;
                } catch (e) {
                  console.error('Error parsing folder:', d.id, e);
                  return null;
                }
              })
              .filter((f): f is LocationFolder => f !== null)
              .filter(f => f.visibility === 'friends' || f.visibility === 'public')
          ];

          // Posts
          const pSnap = await getDocs(query(
            collection(db, 'posts'),
            where('uid', 'in', chunk),
            limit(50)
          ));
          rawPosts = [
            ...rawPosts,
            ...pSnap.docs
              .map(d => {
                try {
                  return { id: d.id, ...d.data() } as Post;
                } catch (e) {
                  console.error('Error parsing post:', d.id, e);
                  return null;
                }
              })
              .filter((p): p is Post => p !== null)
              .filter(p => p.visibility === 'friends' || p.visibility === 'public')
          ];
        } catch (chunkError: any) {
          console.error('Error fetching chunk:', chunkError?.code, chunkError?.message);
        }
      }

      console.log('Feed items - Folders:', rawFolders.length, 'Posts:', rawPosts.length);

      // Process Stories
      const now = new Date().getTime();
      const validStories = rawPosts.filter(p => p.type === 'story' && p.expiresAt && new Date(p.expiresAt).getTime() > now);
      const regularPosts = rawPosts.filter(p => p.type === 'post');

      // Combine and Sort Feed Items
      let combined: FeedItem[] = [
        ...rawFolders.map(f => ({ id: f.id!, type: 'folder' as const, data: f, createdAt: f.createdAt })),
        ...regularPosts.map(p => ({ id: p.id!, type: 'post' as const, data: p, createdAt: p.createdAt }))
      ];

      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Enrich with user profiles
      const profileCache: Record<string, UserProfile> = {};
      const loadProfile = async (uid: string) => {
        if (!profileCache[uid]) {
          try {
            const snap = await getDoc(doc(db, 'users', uid));
            profileCache[uid] = snap.exists() ? { uid: snap.id, ...snap.data() } as UserProfile : { uid, email: '' } as UserProfile;
          } catch (e) {
            console.error('Error loading profile for uid:', uid, e);
            profileCache[uid] = { uid, email: '' } as UserProfile;
          }
        }
        return profileCache[uid];
      };

      const enrichedFeed = await Promise.all(combined.map(async (item) => ({
        ...item,
        data: { ...item.data, userProfile: await loadProfile(item.data.uid) }
      })));

      const enrichedStories = await Promise.all(validStories.map(async (story) => ({
        ...story,
        userProfile: await loadProfile(story.uid)
      })));

      setFeed(enrichedFeed);
      setStories(enrichedStories);

    } catch (e: any) {
      console.error('Error fetching feed:', e?.code, e?.message, e);
      toast('Bảng tin lỗi: ' + (e?.message ?? e?.code ?? 'lỗi không xác định'), 'error');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Infinite scroll observer for in-memory pagination
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayLimit < feed.length && !loadingMore) {
          setLoadingMore(true);
          // Small delay for smooth scroll animation effect
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
      const urls = await Promise.all(
        files.map((file) => compressImageToBase64(file, 450, 0.5))
      );

      await addDoc(collection(db, 'posts'), {
        uid: user.uid,
        type: 'post',
        content: content.trim(),
        imageUrls: urls,
        reactions: {},
        commentCount: 0,
        shareCount: 0,
        visibility: 'friends',
        createdAt: new Date().toISOString()
      });

      toast('Bài viết đã được đăng thành công!', 'success');
      fetchFeed();
    } catch (e: any) {
      console.error('handleCreatePost error:', e?.code, e?.message, e);
      toast('Lỗi khi đăng bài: ' + (e?.message || 'Vui lòng thử lại.'), 'error');
      throw e;
    }
  };

  const handleCreateStory = async (file: File) => {
    if (!user) return;
    try {
      const url = await compressImageToBase64(file, 720, 0.65);

      const expires = new Date();
      expires.setHours(expires.getHours() + 24);

      await addDoc(collection(db, 'posts'), {
        uid: user.uid,
        type: 'story',
        content: '',
        imageUrls: [url],
        reactions: {},
        commentCount: 0,
        shareCount: 0,
        visibility: 'friends',
        expiresAt: expires.toISOString(),
        createdAt: new Date().toISOString()
      });
      toast('Tin đã được tạo thành công!', 'success');
      fetchFeed();
    } catch (e: any) {
      console.error('handleCreateStory error:', e?.code, e?.message, e);
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
    
    if (newReactions[user.uid] === emoji) {
        delete newReactions[user.uid];
    } else {
        newReactions[user.uid] = emoji;
    }

    try {
      const col = itemType === 'post' ? 'posts' : 'folders';
      await updateDoc(doc(db, col, itemId), { reactions: newReactions });
      
      const newFeed = [...feed];
      newFeed[itemIdx] = { ...item, data: { ...data, reactions: newReactions } };
      setFeed(newFeed);
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
