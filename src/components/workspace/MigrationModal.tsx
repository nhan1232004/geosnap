import React, { useState, useEffect } from 'react';
import { X, FolderSync, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { getUserFoldersOptimized, getPhotosByFolderOptimized } from '../../lib/firestoreService';
import { migrateFolder, isMigrated } from '../../lib/migrationAdapter';
import type { LocationFolder, Photo } from '../../types';

interface LegacyFolderItem {
  folder: LocationFolder & { id: string };
  status: 'ready' | 'migrated' | 'error';
  errorMessage?: string;
}

interface MigrationModalProps {
  isOpen: boolean;
  workspaceId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const MigrationModal: React.FC<MigrationModalProps> = ({
  isOpen,
  workspaceId,
  onClose,
  onSuccess,
}) => {
  const { user } = useAppStore();
  const [items, setItems] = useState<LegacyFolderItem[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen || !user) return;
    let isMounted = true;

    async function loadUserFolders() {
      try {
        setLoadingFolders(true);
        const folders = await getUserFoldersOptimized(user!.uid, 100);
        
        const folderItems: LegacyFolderItem[] = [];
        for (const f of folders) {
          if (!f.id) continue;
          const migrated = await isMigrated(f.id);
          folderItems.push({
            folder: f as LocationFolder & { id: string },
            status: migrated ? 'migrated' : 'ready',
          });
        }

        if (isMounted) {
          setItems(folderItems);
        }
      } catch (err) {
        console.error('Failed to load folders for migration:', err);
      } finally {
        if (isMounted) setLoadingFolders(false);
      }
    }

    loadUserFolders();
    return () => { isMounted = false; };
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleMigrate = async () => {
    if (!user || items.length === 0) return;
    setIsMigrating(true);
    setProgress(0);

    const pending = items.filter(i => i.status === 'ready');
    const total = pending.length;
    let done = 0;

    for (const item of pending) {
      try {
        const photos = await getPhotosByFolderOptimized(item.folder.id);
        await migrateFolder(item.folder, photos, workspaceId);
        
        setItems(prev => prev.map(i => i.folder.id === item.folder.id ? { ...i, status: 'migrated' } : i));
      } catch (err: any) {
        console.error(`Failed to migrate folder ${item.folder.name}:`, err);
        setItems(prev => prev.map(i => i.folder.id === item.folder.id ? { ...i, status: 'error', errorMessage: err.message } : i));
      }
      done++;
      setProgress(Math.round((done / total) * 100));
    }

    setIsMigrating(false);
    onSuccess();
  };

  const migratedCount = items.filter(f => f.status === 'migrated').length;
  const totalCount = items.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-bg-card border border-border-dim rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-text-main">
        <div className="px-6 py-4 border-b border-border-dim flex items-center justify-between">
          <div className="flex items-center text-lg font-bold text-text-heading">
            <FolderSync className="w-5 h-5 mr-2 text-brand" />
            Chuyển đổi Album cũ sang Workspace
          </div>
          <button onClick={onClose} className="text-text-dim hover:text-text-main hover:bg-surface p-2 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <p className="text-text-dim text-sm mb-6 leading-relaxed">
            Chuyển toàn bộ các Album ảnh trước đây của bạn thành các Trang ghi chú du lịch (Pages) thông minh trong Workspace, giữ nguyên hình ảnh, tọa độ bản đồ GPS và ngày chụp.
          </p>

          {loadingFolders ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-dim">
              <Loader2 className="w-8 h-8 animate-spin text-brand mb-3" />
              <span className="text-xs">Đang tải danh sách album của bạn...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-text-dim">
              <FolderSync className="w-12 h-12 mx-auto mb-3 opacity-40 text-brand" />
              <p className="text-sm font-semibold">Bạn chưa có album ảnh nào để chuyển đổi.</p>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {items.map(({ folder, status, errorMessage }) => (
                <div key={folder.id} className="flex items-center p-3 border border-border-dim bg-surface rounded-xl">
                  {folder.coverPhotoUrl ? (
                    <img src={folder.coverPhotoUrl} alt="" className="w-12 h-12 rounded-lg object-cover mr-4 border border-border-dim" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-brand/10 border border-brand/20 mr-4 flex items-center justify-center text-brand">
                      <FolderSync className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="font-semibold text-sm text-text-heading truncate">{folder.name}</h4>
                    <p className="text-xs text-text-dim">{folder.photoCount} hình ảnh</p>
                    {errorMessage && <p className="text-[10px] text-red-400 mt-0.5 truncate">{errorMessage}</p>}
                  </div>
                  <div>
                    {status === 'migrated' ? (
                      <span className="flex items-center text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Đã chuyển
                      </span>
                    ) : status === 'error' ? (
                      <span className="flex items-center text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5 mr-1" /> Lỗi
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-brand bg-brand/10 border border-brand/20 px-2.5 py-1 rounded-lg">
                        Sẵn sàng
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border-dim bg-bg-surface flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="w-full sm:w-1/2">
            {isMigrating && (
              <div>
                <div className="flex justify-between text-xs text-text-dim mb-1 font-semibold">
                  <span>Đang chuyển đổi...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-2 bg-surface rounded-full overflow-hidden border border-border-dim">
                  <div className="h-full bg-brand transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            {!isMigrating && migratedCount === totalCount && totalCount > 0 && (
              <span className="text-emerald-400 flex items-center text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 mr-1.5" /> Tất cả album đã được chuyển đổi!
              </span>
            )}
          </div>
          
          <div className="flex space-x-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              disabled={isMigrating}
              className="flex-1 sm:flex-none px-4 py-2 border border-border-dim text-text-dim hover:text-text-main rounded-xl hover:bg-surface transition-colors disabled:opacity-50 text-xs font-semibold"
            >
              Đóng
            </button>
            <button
              onClick={handleMigrate}
              disabled={isMigrating || loadingFolders || migratedCount === totalCount || totalCount === 0}
              className="flex-1 sm:flex-none px-4 py-2 bg-brand text-white rounded-xl hover:bg-brand/90 transition-all disabled:opacity-50 flex items-center justify-center font-semibold text-xs shadow-md shadow-brand/25 cursor-pointer"
            >
              {isMigrating ? 'Đang xử lý...' : 'Chuyển đổi ngay (1-Click)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
