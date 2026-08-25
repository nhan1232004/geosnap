import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { subscribeOnlineStatus, syncOfflineQueue, getOfflineQueue } from '../lib/offlineManager';
import { api } from '../lib/api';
import { useToast } from './ToastContainer';

export const OfflineBanner: React.FC = () => {
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [justSynced, setJustSynced] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    // Initial queue check
    setPendingCount(getOfflineQueue().length);

    const unsubscribe = subscribeOnlineStatus(async (isNowOnline) => {
      setOnline(isNowOnline);

      if (isNowOnline) {
        const queue = getOfflineQueue();
        if (queue.length > 0) {
          setIsSyncing(true);
          try {
            const { synced, failed } = await syncOfflineQueue(api);
            if (synced > 0) {
              setJustSynced(true);
              toast(`Đã đồng bộ ${synced} thay đổi khi kết nối mạng trở lại!`, 'success');
              setTimeout(() => setJustSynced(false), 4000);
            }
            if (failed > 0) {
              toast(`${failed} thay đổi chưa thể đồng bộ. Sẽ thử lại sau.`, 'warning');
            }
          } finally {
            setIsSyncing(false);
            setPendingCount(getOfflineQueue().length);
          }
        }
      } else {
        toast('Bạn đang ở chế độ ngoại tuyến (Offline)', 'warning');
      }
    });

    return () => unsubscribe();
  }, [toast]);

  if (online && !justSynced && pendingCount === 0) {
    return null;
  }

  return (
    <aside
      aria-label="Network status notification"
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 max-w-md w-[92%] sm:w-auto shadow-2xl rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs font-semibold backdrop-blur-xl border ${
        !online
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
          : isSyncing
          ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
          : 'bg-green-500/20 text-green-300 border-green-500/30'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {!online ? (
          <WifiOff className="w-4 h-4 shrink-0 text-amber-400 animate-pulse" />
        ) : isSyncing ? (
          <RefreshCw className="w-4 h-4 shrink-0 text-blue-400 animate-spin" />
        ) : (
          <CheckCircle2 className="w-4 h-4 shrink-0 text-green-400" />
        )}

        <span className="truncate">
          {!online
            ? `Ngoại tuyến: Dữ liệu sẽ lưu cục bộ${pendingCount > 0 ? ` (${pendingCount} chờ gửi)` : ''}`
            : isSyncing
            ? 'Đang đồng bộ dữ liệu ngoại tuyến...'
            : 'Đã khôi phục kết nối & đồng bộ dữ liệu'}
        </span>
      </div>

      {!online && pendingCount > 0 && (
        <span className="px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-200 text-[10px] shrink-0">
          {pendingCount}
        </span>
      )}
    </aside>
  );
};
