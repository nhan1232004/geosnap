import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAppStore } from '../store/useAppStore';
import { Notification } from '../types';
import { timeAgo } from '../lib/utils';
import { Bell, X, CheckCircle } from 'lucide-react';

export function NotificationCenter() {
  const { user } = useAppStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setNotifications(data);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notificationId), { isRead: true });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id!);
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
            <h3 className="font-semibold text-white">Notifications</h3>
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
                No notifications yet
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
                        {notif.type === 'friend_request' && `${notif.actorProfile?.displayName} sent you a friend request`}
                        {notif.type === 'friend_accepted' && `${notif.actorProfile?.displayName} accepted your friend request`}
                        {notif.type === 'reaction' && `${notif.actorProfile?.displayName} reacted to your location`}
                        {notif.type === 'comment' && `${notif.actorProfile?.displayName} commented on your location`}
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
