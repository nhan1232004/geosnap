import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Notification } from '../types';
import { timeAgo } from '../lib/utils';
import { api } from '../lib/api';
import { Bell, X } from 'lucide-react';

export function NotificationCenter() {
  const { user } = useAppStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get<{ notifications: any[] }>('/api/v1/notifications');
      const mapped = res.notifications.map(n => ({
        id: n.id,
        recipientId: n.recipientId,
        actorId: n.actorId,
        type: n.type,
        entityId: n.entityId,
        entityName: n.entityName,
        isRead: n.isRead,
        createdAt: n.createdAt,
        actorProfile: n.actor ? {
          uid: n.actor.id,
          displayName: n.actor.displayName || undefined,
          avatarUrl: n.actor.avatarUrl || undefined,
          email: '',
          role: 'user' as const,
          createdAt: '',
        } : undefined,
      }));
      setNotifications(mapped);
    } catch (e) {
      console.error('Failed to fetch notifications:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  // Fetch when panel is opened
  useEffect(() => {
    if (showPanel) {
      fetchNotifications();
    }
  }, [showPanel]);

  const markAsRead = async (notificationId: string) => {
    try {
      await api.put(`/api/v1/notifications/${notificationId}`, {});
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead && notification.id) {
      markAsRead(notification.id);
    }
    setShowPanel(false);
  };

  return (
    <>
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 rounded-lg hover:bg-surface transition-colors"
      >
        <Bell className="w-5 h-5 text-text-dim" />
        {unreadCount > 0 && (
          <div className="absolute top-0 right-0 w-5 h-5 rounded-full bg-brand flex items-center justify-center text-white text-[10px] font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {showPanel && (
        <div className="absolute top-14 right-0 w-80 bg-bg-card border border-border-dim rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="p-4 border-b border-border-dim flex justify-between items-center">
            <h3 className="font-semibold text-white">Thông báo</h3>
            <button
              onClick={() => setShowPanel(false)}
              className="text-text-dim hover:text-text-main transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-text-dim">
                Chưa có thông báo nào
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 border-b border-border-dim cursor-pointer transition-colors ${
                    notif.isRead ? 'bg-bg-card hover:bg-surface' : 'bg-brand/10 hover:bg-brand/20'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-text-main">
                        {notif.type === 'friend_request' && `${notif.actorProfile?.displayName || 'Ai đó'} đã gửi cho bạn yêu cầu kết bạn`}
                        {notif.type === 'friend_accepted' && `${notif.actorProfile?.displayName || 'Ai đó'} đã đồng ý yêu cầu kết bạn`}
                        {notif.type === 'reaction' && `${notif.actorProfile?.displayName || 'Ai đó'} đã thích vị trí của bạn`}
                        {notif.type === 'comment' && `${notif.actorProfile?.displayName || 'Ai đó'} đã bình luận về vị trí của bạn`}
                      </p>
                      <p className="text-[11px] text-text-dim mt-1">{timeAgo(notif.createdAt)}</p>
                    </div>
                    {!notif.isRead && (
                      <div className="w-2 h-2 rounded-full bg-brand mt-1.5" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
