import React, { useState } from 'react';
import { X, FolderSync, CheckCircle2, AlertCircle } from 'lucide-react';

interface LegacyFolder {
  id: string;
  title: string;
  photoCount: number;
  coverUrl?: string;
  status: 'ready' | 'migrated' | 'error';
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
  const [isMigrating, setIsMigrating] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Dummy data for visual presentation
  const [folders, setFolders] = useState<LegacyFolder[]>([
    { id: '1', title: 'Chuyến đi Đà Lạt', photoCount: 42, status: 'ready', coverUrl: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=200&q=80' },
    { id: '2', title: 'Hội An 2023', photoCount: 128, status: 'ready', coverUrl: 'https://images.unsplash.com/photo-1532296068694-81827b5b5c32?auto=format&fit=crop&w=200&q=80' },
  ]);

  if (!isOpen) return null;

  const handleMigrate = async () => {
    setIsMigrating(true);
    setProgress(0);
    
    // Simulate batch migration
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 200));
      setProgress(i);
    }
    
    setFolders(folders.map(f => ({ ...f, status: 'migrated' })));
    setIsMigrating(false);
    setTimeout(onSuccess, 1000);
  };

  const migratedCount = folders.filter(f => f.status === 'migrated').length;
  const totalCount = folders.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center text-lg font-semibold text-gray-900 dark:text-gray-100">
            <FolderSync className="w-5 h-5 mr-2 text-blue-500" />
            Chuyển đổi Album cũ
          </div>
          <button onClick={onClose} className="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            GeoSnap đã nâng cấp lên hệ thống Workspace mới! Bạn có {totalCount} album cũ cần được chuyển đổi thành các Trang (Pages) để tận hưởng các tính năng mới như viết ghi chú, thêm bản đồ và chia sẻ dễ dàng hơn.
          </p>

          <div className="space-y-3 mb-6">
            {folders.map(folder => (
              <div key={folder.id} className="flex items-center p-3 border border-gray-200 dark:border-gray-800 rounded-lg">
                {folder.coverUrl ? (
                  <img src={folder.coverUrl} alt="" className="w-12 h-12 rounded object-cover mr-4" />
                ) : (
                  <div className="w-12 h-12 rounded bg-gray-200 dark:bg-gray-800 mr-4 flex items-center justify-center">
                    <FolderSync className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">{folder.title}</h4>
                  <p className="text-sm text-gray-500">{folder.photoCount} hình ảnh</p>
                </div>
                <div>
                  {folder.status === 'migrated' ? (
                    <span className="flex items-center text-sm text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Đã chuyển
                    </span>
                  ) : folder.status === 'error' ? (
                    <span className="flex items-center text-sm text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                      <AlertCircle className="w-4 h-4 mr-1" /> Lỗi
                    </span>
                  ) : (
                    <span className="text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                      Sẵn sàng
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="w-full sm:w-1/2">
            {isMigrating && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Đang chuyển đổi...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            )}
            {migratedCount === totalCount && totalCount > 0 && (
              <span className="text-green-600 flex items-center text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Hoàn tất chuyển đổi!
              </span>
            )}
          </div>
          
          <div className="flex space-x-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              disabled={isMigrating}
              className="flex-1 sm:flex-none px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Để sau
            </button>
            <button
              onClick={handleMigrate}
              disabled={isMigrating || migratedCount === totalCount}
              className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center font-medium"
            >
              {isMigrating ? 'Đang xử lý...' : 'Chuyển đổi tất cả (1-Click)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
