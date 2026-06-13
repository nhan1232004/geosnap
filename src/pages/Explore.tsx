import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Search, TrendingUp, MapPin, Globe, Camera, Compass } from 'lucide-react';
import { LazyImagePlaceholder } from '../components/LazyImage';
import type { LocationFolder, UserProfile, Photo } from '../types';

type FilterTab = 'all' | 'popular' | 'recent';

interface FolderWithOwner extends LocationFolder {
  id: string;
  ownerProfile?: Pick<UserProfile, 'displayName' | 'avatarUrl'>;
}

interface PublicPhoto extends Photo {
  id: string;
  folderName?: string;
}

// ─── Skeleton Components ──────────────────────────────────────────────────────

function FolderCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-bg-card border border-border-dim stagger-item animate-pulse">
      <div className="h-48 bg-surface" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-surface rounded-lg w-3/4" />
        <div className="h-3 bg-surface rounded-lg w-1/2" />
      </div>
    </div>
  );
}

function PhotoGridSkeleton() {
  return (
    <div className="aspect-square rounded-xl bg-surface animate-pulse" />
  );
}

// ─── Folder Card ──────────────────────────────────────────────────────────────

function FolderCard({ folder }: { folder: FolderWithOwner }) {
  const initials = (folder.ownerProfile?.displayName ?? 'U').charAt(0).toUpperCase();
  const location = [folder.city, folder.country].filter(Boolean).join(', ');

  return (
    <Link
      to={`/folder/${folder.id}`}
      className="group block rounded-2xl overflow-hidden bg-bg-card border border-border-dim card-hover-lift stagger-item"
    >
      <div className="relative h-48 overflow-hidden bg-surface">
        {folder.coverPhotoUrl ? (
          <LazyImagePlaceholder
            src={folder.coverPhotoUrl}
            alt={folder.name}
            className="w-full h-full image-reveal"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand/10 to-brand/5">
            <MapPin className="w-10 h-10 text-brand/30" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">
          <Camera className="w-3 h-3" />
          {folder.photoCount}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-white font-bold text-[15px] leading-tight line-clamp-1 group-hover:text-brand transition-colors">
            {folder.name}
          </h3>
          {location && (
            <p className="text-white/70 text-xs mt-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" />
              {location}
            </p>
          )}
        </div>
      </div>

      <div className="p-3 flex items-center gap-2.5">
        {folder.ownerProfile?.avatarUrl ? (
          <img
            src={folder.ownerProfile.avatarUrl}
            alt={folder.ownerProfile.displayName ?? ''}
            className="w-7 h-7 rounded-full object-cover ring-2 ring-border-dim shrink-0"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-brand font-bold text-xs shrink-0">
            {initials}
          </div>
        )}
        <span className="text-text-dim text-[12px] truncate">
          {folder.ownerProfile?.displayName ?? 'Người dùng ẩn danh'}
        </span>
        <span className="ml-auto text-text-dim/60 text-[11px] flex items-center gap-1">
          <Globe className="w-3 h-3" />
          Công khai
        </span>
      </div>
    </Link>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center stagger-item">
      <div className="w-20 h-20 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center mb-5">
        <Compass className="w-9 h-9 text-brand/50" />
      </div>
      <h3 className="text-text-heading font-semibold text-lg mb-2">Chưa có gì để khám phá</h3>
      <p className="text-text-dim text-sm max-w-xs">{message}</p>
    </div>
  );
}

// ─── Main Explore Page ────────────────────────────────────────────────────────

export default function Explore() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [folders, setFolders] = useState<FolderWithOwner[]>([]);
  const [photos, setPhotos] = useState<PublicPhoto[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(true);

  // Fetch public folders
  const fetchFolders = useCallback(async (tab: FilterTab) => {
    setLoadingFolders(true);
    try {
      const order = tab === 'recent' ? 'createdAt' : 'photoCount';
      const res = await api.get<{ folders: any[] }>(`/api/v1/explore/folders?limit=12&orderBy=${order}`);
      
      const enriched = res.folders.map(f => ({
        ...f,
        ownerProfile: f.user ? {
          displayName: f.user.displayName,
          avatarUrl: f.user.avatarUrl
        } : undefined
      }));
      setFolders(enriched);
    } catch (err) {
      console.error('Failed to fetch public folders:', err);
      setFolders([]);
    } finally {
      setLoadingFolders(false);
    }
  }, []);

  // Fetch public photos
  const fetchPhotos = useCallback(async () => {
    setLoadingPhotos(true);
    try {
      const res = await api.get<{ photos: any[] }>('/api/v1/explore/photos?limit=24');
      setPhotos(res.photos);
    } catch (err) {
      console.error('Failed to fetch public photos:', err);
      setPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  }, []);

  // Debounced search query lookup
  useEffect(() => {
    if (!searchQuery.trim()) {
      fetchFolders(activeTab);
      return;
    }
    
    const fetchSearched = async () => {
      setLoadingFolders(true);
      try {
        const res = await api.get<{ folders: any[] }>(`/api/v1/explore/folders?limit=20&search=${encodeURIComponent(searchQuery)}`);
        const enriched = res.folders.map(f => ({
          ...f,
          ownerProfile: f.user ? {
            displayName: f.user.displayName,
            avatarUrl: f.user.avatarUrl
          } : undefined
        }));
        setFolders(enriched);
      } catch (err) {
        console.error('Failed to search public folders:', err);
      } finally {
        setLoadingFolders(false);
      }
    };

    const timer = setTimeout(fetchSearched, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, activeTab, fetchFolders]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'Tất cả' },
    { key: 'popular', label: 'Phổ biến' },
    { key: 'recent', label: 'Gần đây' },
  ];

  return (
    <div className="min-h-full bg-bg-deep page-enter">
      <div className="relative overflow-hidden px-4 pt-8 pb-6 md:px-8 md:pt-12 md:pb-8">
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand/8 rounded-full blur-3xl" />
        </div>

        <div className="max-w-3xl mx-auto text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-brand text-sm font-semibold mb-1">
            <Globe className="w-4 h-4" />
            Khám phá công khai
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight gradient-text">
            Khám Phá Thế Giới
          </h1>
          <p className="text-text-dim text-sm md:text-base">
            Tìm kiếm những địa điểm tuyệt vời được chia sẻ bởi cộng đồng GeoSnap
          </p>

          <div className="relative mt-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-dim pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm địa điểm, thành phố, quốc gia..."
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-bg-card/60 backdrop-blur-xl border border-border-dim text-text-main placeholder:text-text-dim/60 focus:outline-none focus:border-brand/50 focus:ring-2 focus:ring-brand/20 transition-all text-[15px]"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 pb-20 space-y-10">
        <section>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl bg-brand/15 border border-brand/25 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4 text-brand" />
            </div>
            <div>
              <h2 className="text-text-heading font-bold text-lg leading-tight">Địa điểm nổi bật</h2>
              <p className="text-text-dim text-xs">Được cộng đồng chia sẻ nhiều nhất</p>
            </div>

            <div className="ml-auto flex gap-1 bg-bg-card/60 backdrop-blur-sm border border-border-dim rounded-xl p-1">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === tab.key
                      ? 'bg-brand text-white shadow-[0_2px_8px_rgba(255,107,53,0.35)]'
                      : 'text-text-dim hover:text-text-main'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {loadingFolders ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <FolderCardSkeleton key={i} />
              ))}
            </div>
          ) : folders.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {folders.map((folder, idx) => (
                <div key={folder.id ?? idx}>
                  <FolderCard folder={folder} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              message={
                searchQuery
                  ? `Không tìm thấy địa điểm nào phù hợp với "${searchQuery}"`
                  : 'Chưa có địa điểm công khai nào. Hãy là người đầu tiên chia sẻ!'
              }
            />
          )}
        </section>

        {!searchQuery && (
          <section>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-8 h-8 rounded-xl bg-brand/15 border border-brand/25 flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4 text-brand" />
              </div>
              <div>
                <h2 className="text-text-heading font-bold text-lg leading-tight">Ảnh mới nhất</h2>
                <p className="text-text-dim text-xs">Cập nhật từ cộng đồng</p>
              </div>
            </div>

            {loadingPhotos ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <PhotoGridSkeleton key={i} />
                ))}
              </div>
            ) : photos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {photos.map(photo => (
                  <div
                    key={photo.id}
                    className="aspect-square rounded-xl overflow-hidden bg-surface group cursor-pointer card-hover-lift stagger-item"
                  >
                    <LazyImagePlaceholder
                      src={photo.url}
                      alt="Public photo"
                      className="w-full h-full"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-text-dim text-sm">
                Chưa có ảnh công khai nào.
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
