import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { LocationFolder } from '../types';
import {
  getUserFoldersOptimized,
  createFolderDoc,
  updateFolderDoc,
  deleteFolderDoc,
} from '../lib/firestoreService';
import { useToast } from '../components/ToastContainer';
import { ErrorFallback } from '../components/ErrorFallback';
import { TimelineSkeleton } from '../components/LoadingSkeleton';
import { LazyImagePlaceholder } from '../components/LazyImage';
import { SearchBox, FolderSearchFilter } from '../components/SearchBox';
import { UserStatsGrid } from '../components/StatsCard';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { MoreVertical, Edit2, Trash2, Globe, Users, Lock, Loader2, Plus } from 'lucide-react';

const PAGE_SIZE = 12;

export default function Timeline() {
  const { user } = useAppStore();
  const { toast } = useToast();
  const [folders, setFolders] = useState<LocationFolder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const observerRef = useRef<HTMLDivElement>(null);

  const filteredFolders = FolderSearchFilter(folders, searchQuery);

  const fetchInitial = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const items = await getUserFoldersOptimized(user.uid, 100);
      setFolders(items);
      setHasMore(false);
    } catch (err: any) {
      console.error('Failed to load initial folders:', err);
      setError(err instanceof Error ? err : new Error(err?.message || 'Không thể tải danh sách hành trình'));
      toast('Không thể tải danh sách hành trình', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  const handleDelete = async (e: React.MouseEvent, folder: LocationFolder) => {
    e.preventDefault();
    e.stopPropagation();
    if (!folder.id || !window.confirm('Bạn có chắc chắn muốn xóa địa điểm này cùng tất cả ảnh bên trong?')) return;

    try {
      await deleteFolderDoc(folder.id);
      setFolders(prev => prev.filter(f => f.id !== folder.id));
      setActionMenuId(null);
      toast('Đã xóa địa điểm thành công', 'success');
    } catch (err) {
      console.error('Failed to delete folder:', err);
      toast('Không thể xóa địa điểm', 'error');
    }
  };

  const handleEdit = (e: React.MouseEvent, folder: LocationFolder) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(folder.id || null);
    setEditName(folder.name);
    setActionMenuId(null);
  };

  const saveEdit = async (e: React.MouseEvent | React.FormEvent, folder: LocationFolder) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editName.trim() || !folder.id) return;

    try {
      await updateFolderDoc(folder.id, { name: editName.trim() });
      setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, name: editName.trim() } : f));
      setEditingId(null);
      toast('Đã đổi tên địa điểm thành công', 'success');
    } catch (err) {
      console.error('Failed to rename folder:', err);
      toast('Không thể đổi tên địa điểm', 'error');
    }
  };

  const handleAddFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !user) return;

    try {
      const created = await createFolderDoc({
        uid: user.uid,
        name: newName.trim(),
        centerLat: 10.8231, // Default lat
        centerLng: 106.6297, // Default lng
        photoCount: 0,
        createdAt: new Date().toISOString(),
        visibility: 'private',
      });
      setFolders(prev => [created, ...prev]);
      setIsAdding(false);
      setNewName('');
      toast('Đã tạo địa điểm mới thành công', 'success');
    } catch (err) {
      console.error('Failed to create folder:', err);
      toast('Không thể tạo địa điểm mới', 'error');
    }
  };

  if (loading) return <TimelineSkeleton />;

  return (
    <div className="p-4 sm:p-10 max-w-7xl mx-auto flex flex-col gap-6 sm:gap-8 page-enter">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end">
        <div className="w-full">
          <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight text-text-heading">Explore Journey</h1>
          <div className="w-full mt-4">
            <UserStatsGrid userId={user?.uid} />
          </div>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="bg-brand text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-brand/90 transition-colors flex items-center justify-center w-full sm:w-auto shrink-0"
        >
          <Plus className="w-4 h-4 mr-1" /> New Folder
        </button>
      </div>

      {folders.length > 0 && (
        <SearchBox onSearch={setSearchQuery} placeholder="Search locations..." />
      )}

      {isAdding && (
        <div className="mb-6 p-6 bg-bg-card rounded-[20px] border border-border-dim">
          <h3 className="text-lg font-medium text-text-heading mb-4">Create New Folder</h3>
          <form onSubmit={handleAddFolder} className="flex gap-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Vacation in Kyoto"
              autoFocus
              className="flex-1 bg-surface border border-border-dim rounded-xl px-4 py-3 outline-none focus:border-brand text-text-main"
            />
            <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-3 rounded-xl border border-border-dim text-text-dim hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={!newName.trim()} className="px-6 py-3 rounded-xl bg-brand text-white disabled:opacity-50 hover:bg-brand/90 transition-colors">Create</button>
          </form>
        </div>
      )}

      {error && folders.length === 0 ? (
        <ErrorFallback
          error={error}
          title="Không thể tải danh sách địa điểm"
          message={error.message || 'Đã có lỗi xảy ra khi lấy danh sách hành trình của bạn.'}
          onRetry={fetchInitial}
        />
      ) : folders.length === 0 && !isAdding ? (
        <div className="text-center py-20 bg-bg-card rounded-[20px] border border-border-dim">
          <p className="text-text-dim mb-4">No locations yet.</p>
          <Link to="/upload" className="text-brand hover:text-white transition-colors">Upload some photos</Link>
        </div>
      ) : (
        <div className="space-y-12">
          {filteredFolders.length === 0 && searchQuery ? (
            <div className="text-center py-12 text-text-dim">
              No locations found matching "{searchQuery}"
            </div>
          ) : (
            Object.entries(
              filteredFolders.reduce((acc, folder) => {
                const d = folder.createdAt ? new Date(folder.createdAt) : new Date();
                const month = format(d, 'MMMM yyyy');
                if (!acc[month]) acc[month] = [];
                acc[month].push(folder);
                return acc;
              }, {} as Record<string, LocationFolder[]>)
            ).map(([month, monthFoldersArray]: [string, any]) => (
              <div key={month}>
                <h2 className="mb-6 text-sm font-semibold tracking-wider text-text-dim uppercase border-b border-border-dim pb-3">{month}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {(monthFoldersArray as LocationFolder[]).map(folder => (
                  <Link key={folder.id} to={`/folder/${folder.id}`} className="group relative h-[240px] bg-bg-card rounded-[20px] border border-border-dim overflow-hidden hover:border-brand/50 transition-colors card-hover-lift stagger-item">

                    <div className="absolute inset-0 bg-gradient-to-tr from-brand/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity z-0"></div>
                    {folder.coverPhotoUrl ? (
                      <LazyImagePlaceholder src={folder.coverPhotoUrl} alt={folder.name} className="w-full h-full opacity-60 grayscale-[0.2] group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full bg-surface"></div>
                    )}
                    
                    <div className="absolute top-4 left-4 z-20">
                      {folder.visibility === 'public' && (
                          <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-bold text-white tracking-wider flex items-center border border-white/10 uppercase drop-shadow-md">
                              <Globe className="w-3 h-3 mr-1 text-blue-400" /> Public
                          </div>
                      )}
                      {folder.visibility === 'friends' && (
                          <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-bold text-white tracking-wider flex items-center border border-white/10 uppercase drop-shadow-md">
                              <Users className="w-3 h-3 mr-1 text-green-400" /> Friends
                          </div>
                      )}
                      {(!folder.visibility || folder.visibility === 'private') && (
                          <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-bold text-white tracking-wider flex items-center border border-white/10 uppercase drop-shadow-md">
                              <Lock className="w-3 h-3 mr-1 text-text-dim" /> Private
                          </div>
                      )}
                    </div>

                    <div className="absolute top-4 right-4 z-20">
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActionMenuId(actionMenuId === folder.id ? null : folder.id);
                        }}
                        className="bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm transition-colors"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      
                      {actionMenuId === folder.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-bg-main border border-border-dim rounded-xl shadow-xl overflow-hidden py-1">
                          <button 
                            onClick={(e) => handleEdit(e, folder)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface text-text-main flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" /> Rename Folder
                          </button>
                          <button 
                            onClick={(e) => handleDelete(e, folder)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface text-red-500 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" /> Delete Folder
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent z-10 font-sans">
                      {editingId === folder.id ? (
                        <form onSubmit={(e) => saveEdit(e, folder)} className="mb-2" onClick={e => e.stopPropagation()}>
                          <input
                            autoFocus
                            type="text"
                            className="w-full bg-black/60 border border-brand/50 text-text-heading px-3 py-1 text-lg font-semibold rounded outline-none backdrop-blur-sm"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            onBlur={(e) => saveEdit(e, folder)}
                          />
                        </form>
                      ) : (
                        <div className="text-lg font-semibold mb-1 text-text-heading truncate">{folder.name}</div>
                      )}
                      
                      <div className="text-[12px] text-text-dim flex gap-3">
                        <span>{folder.photoCount} {folder.photoCount === 1 ? 'photo' : 'photos'}</span>
                        <span>•</span>
                        <span>{folder.createdAt ? format(new Date(folder.createdAt), 'MMM dd, yyyy') : 'Unknown'}</span>
                      </div>
                    </div>
                  </Link>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {!searchQuery && (
        <div ref={observerRef} className="py-6 flex justify-center">
          {loadingMore && (
            <div className="flex items-center gap-2 text-text-dim text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang tải thêm...</span>
            </div>
          )}
          {!hasMore && folders.length > 0 && (
            <p className="text-text-dim text-sm">Đã xem tất cả {folders.length} địa điểm</p>
          )}
        </div>
      )}
    </div>
  );
}
