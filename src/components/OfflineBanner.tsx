import React, { useEffect, useState } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';
import { subscribeOnlineStatus } from '../lib/offlineManager';
import { useToast } from './ToastContainer';

export const OfflineBanner: React.FC = () => {
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [justReconnected, setJustReconnected] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = subscribeOnlineStatus((isNowOnline) => {
      setOnline(isNowOnline);

      if (isNowOnline) {
        setJustReconnected(true);
        toast('Đã kết nối lại Internet!', 'success');
        setTimeout(() => setJustReconnected(false), 4000);
      } else {
        toast('Bạn đang ở chế độ ngoại tuyến — các thao tác sẽ không được lưu', 'warning');
      }
    });

    return () => unsubscribe();
  }, [toast]);

  if (online && !justReconnected) {
    return null;
  }

  return (
    <aside
      aria-label="Network status notification"
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 max-w-md w-[92%] sm:w-auto shadow-2xl rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3 text-xs font-semibold backdrop-blur-xl border ${
        !online
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
          : 'bg-green-500/20 text-green-300 border-green-500/30'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {!online ? (
          <WifiOff className="w-4 h-4 shrink-0 text-amber-400 animate-pulse" />
        ) : (
          <CheckCircle2 className="w-4 h-4 shrink-0 text-green-400" />
        )}

        <span className="truncate">
          {!online
            ? 'Bạn đang offline — các thao tác sẽ không được lưu'
            : 'Đã khôi phục kết nối'}
        </span>
      </div>
    </aside>
  );
};
