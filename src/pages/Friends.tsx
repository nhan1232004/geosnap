import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import { Friendship, UserProfile } from '../types';
import { timeAgo } from '../lib/utils';
import { ErrorFallback } from '../components/ErrorFallback';

const EMOJIS = ['✈️', '🗺️', '📸', '🌏', '🏔️', '🏖️'];
function randomEmoji() { return EMOJIS[Math.floor(Math.random() * EMOJIS.length)]; }

type Tab = 'friends' | 'pending';

export default function Friends() {
  const { user, userProfile, setUnreadNotifications } = useAppStore();
  const [tab, setTab] = useState<Tab>('friends');
  const [friends, setFriends] = useState<(Friendship & { otherUser: UserProfile })[]>([]);
  const [pending, setPending] = useState<(Friendship & { otherUser: UserProfile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteLink = userProfile?.inviteCode
    ? `${window.location.origin}/invite/${userProfile.inviteCode}`
    : '';

  const copyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const fetchFriendships = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ friendships: any[] }>('/api/v1/friendships');
      const enriched = res.friendships.map(f => {
        const isRequester = f.requesterId === user.uid;
        const other = isRequester ? f.addressee : f.requester;
        const otherUser: UserProfile = {
          uid: other.id,
          email: other.email,
          displayName: other.displayName || undefined,
          avatarUrl: other.avatarUrl || undefined,
          role: 'user',
          createdAt: '',
        };
        return {
          id: f.id,
          requesterId: f.requesterId,
          addresseeId: f.addresseeId,
          status: f.status,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
          otherUser,
        };
      });

      setFriends(enriched.filter(f => f.status === 'accepted'));
      const incomingPending = enriched.filter(f => f.status === 'pending' && f.addresseeId === user.uid);
      setPending(incomingPending);
      setUnreadNotifications(incomingPending.length);
    } catch (e: any) {
      console.error('Failed to fetch friendships:', e);
      setError(e instanceof Error ? e : new Error(e?.message || 'Không thể tải danh sách bạn bè'));
    } finally {
      setLoading(false);
    }
  }, [user, setUnreadNotifications]);

  useEffect(() => { fetchFriendships(); }, [fetchFriendships]);

  const handleAccept = async (friendship: Friendship) => {
    if (!friendship.id) return;
    try {
      await api.put(`/api/v1/friendships/${friendship.id}`, { status: 'accepted' });
      fetchFriendships();
    } catch (e) {
      console.error('Failed to accept friendship:', e);
    }
  };

  const handleDecline = async (friendship: Friendship) => {
    if (!friendship.id) return;
    try {
      await api.put(`/api/v1/friendships/${friendship.id}`, { status: 'blocked' });
      fetchFriendships();
    } catch (e) {
      console.error('Failed to decline friendship:', e);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[30px] font-bold tracking-tight text-text-heading">Bạn bè</h1>
        <p className="text-text-dim text-sm mt-1">Kết nối và xem hành trình của nhau</p>
      </div>

      {/* Invite Link Card */}
      <div className="mb-8 rounded-2xl border border-brand/20 bg-brand/5 p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">🔗</span>
            <h2 className="text-text-heading font-bold text-[16px]">Link mời kết bạn của bạn</h2>
          </div>
          <p className="text-text-dim text-[13px] mb-4">
            Gửi link này cho bạn bè. Họ click vào → tự động gửi lời mời kết bạn cho bạn.
          </p>
          <div className="flex gap-2">
            <div className="flex-1 bg-black/40 border border-border-dim rounded-xl px-4 py-2.5 text-[13px] text-brand font-mono truncate">
              {inviteLink || 'Đang tạo link...'}
            </div>
            <button
              onClick={copyLink}
              disabled={!inviteLink}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                copied
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-brand text-white hover:bg-brand/90 active:scale-95'
              }`}
            >
              {copied ? '✓ Đã copy!' : 'Copy link'}
            </button>
          </div>

          {inviteLink && (
            <div className="flex flex-col sm:flex-row gap-6 items-center border-t border-brand/10 pt-6 mt-6 animate-[fadeIn_0.3s_ease]">
              <div className="flex-1 text-center sm:text-left">
                <h3 className="text-text-heading font-bold text-[14px] mb-1 flex items-center gap-1.5 justify-center sm:justify-start">
                  📱 Mã QR kết bạn của bạn
                </h3>
                <p className="text-text-dim text-[12px] mb-4">
                  Bạn bè có thể quét mã này bằng camera hoặc ứng dụng QR trên điện thoại để kết nối trực tiếp.
                </p>
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&color=255-107-53&data=${encodeURIComponent(inviteLink)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand/20 text-brand hover:bg-brand hover:text-white text-[12px] font-bold transition-all"
                >
                  📥 Xem & tải mã QR
                </a>
              </div>
              <div className="w-32 h-32 bg-white p-2 rounded-2xl flex items-center justify-center shadow-lg shadow-black/10 shrink-0 border border-brand/20">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=255-107-53&data=${encodeURIComponent(inviteLink)}`}
                  alt="Mã QR kết bạn"
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6 w-fit">
        {(['friends', 'pending'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              tab === t
                ? 'bg-brand text-white shadow'
                : 'text-text-dim hover:text-white'
            }`}
          >
            {t === 'friends' ? `Bạn bè (${friends.length})` : (
              <span className="flex items-center gap-1.5">
                Lời mời
                {pending.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-white text-brand text-[10px] font-bold flex items-center justify-center">{pending.length}</span>
                )}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-20 bg-bg-card rounded-2xl border border-border-dim animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <ErrorFallback
          error={error}
          title="Không thể tải danh sách bạn bè"
          message={error.message}
          onRetry={fetchFriendships}
        />
      ) : tab === 'friends' ? (
        friends.length === 0 ? (
          <div className="text-center py-16 bg-bg-card rounded-2xl border border-border-dim">
            <div className="text-5xl mb-4">🌍</div>
            <p className="text-text-main font-semibold mb-2">Chưa có bạn bè nào</p>
            <p className="text-text-dim text-sm">Copy link mời phía trên và gửi cho bạn bè nhé!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map(f => (
              <div key={f.id}>
                <FriendCard user={f.otherUser} meta={`Bạn bè từ ${timeAgo(f.updatedAt || f.createdAt)}`} />
              </div>
            ))}
          </div>
        )
      ) : (
        pending.length === 0 ? (
          <div className="text-center py-16 bg-bg-card rounded-2xl border border-border-dim">
            <div className="text-5xl mb-4">📬</div>
            <p className="text-text-main font-semibold">Không có lời mời nào</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(f => (
              <div key={f.id}>
                <PendingCard friendship={f} otherUser={f.otherUser} onAccept={handleAccept} onDecline={handleDecline} />
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

function FriendCard({ user, meta }: { user: UserProfile; meta: string }) {
  const initial = (user.displayName || user.email || '?').charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-bg-card border border-border-dim hover:border-brand/20 transition-all group">
      {user.avatarUrl ? (
        <img src={user.avatarUrl} className="w-11 h-11 rounded-full object-cover ring-2 ring-border-dim" alt="" />
      ) : (
        <div className="w-11 h-11 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-brand font-bold">
          {initial}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-text-heading font-semibold text-[14px] truncate">{user.displayName || 'GeoSnap User'}</div>
        <div className="text-text-dim text-[12px] truncate">{meta}</div>
      </div>
      <div className="text-2xl opacity-60">{randomEmoji()}</div>
    </div>
  );
}

function PendingCard({ friendship, otherUser, onAccept, onDecline }: {
  friendship: Friendship;
  otherUser: UserProfile;
  onAccept: (f: Friendship) => void;
  onDecline: (f: Friendship) => void;
}) {
  const initial = (otherUser.displayName || otherUser.email || '?').charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-bg-card border border-brand/20 transition-all">
      {otherUser.avatarUrl ? (
        <img src={otherUser.avatarUrl} className="w-11 h-11 rounded-full object-cover ring-2 ring-brand/30" alt="" />
      ) : (
        <div className="w-11 h-11 rounded-full bg-brand/20 border border-brand/30 flex items-center justify-center text-brand font-bold">
          {initial}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-text-heading font-semibold text-[14px] truncate">{otherUser.displayName || 'GeoSnap User'}</div>
        <div className="text-text-dim text-[12px]">Muốn kết bạn với bạn • {timeAgo(friendship.createdAt)}</div>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => onAccept(friendship)}
          className="px-4 py-1.5 rounded-lg bg-brand text-white text-[13px] font-semibold hover:bg-brand/90 transition-all active:scale-95"
        >
          Chấp nhận
        </button>
        <button
          onClick={() => onDecline(friendship)}
          className="px-4 py-1.5 rounded-lg border border-border-dim text-text-dim text-[13px] font-medium hover:text-white hover:border-white/20 transition-all"
        >
          Từ chối
        </button>
      </div>
    </div>
  );
}
