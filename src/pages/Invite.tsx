import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAppStore } from '../store/useAppStore';
import { UserProfile } from '../types';

type PageState = 'loading' | 'found' | 'not-found' | 'already-friends' | 'pending' | 'self' | 'sent';

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<PageState>('loading');
  const [inviter, setInviter] = useState<UserProfile | null>(null);
  const { user } = useAppStore();
  const [sending, setSending] = useState(false);

  // Fetch inviter by invite code and check friendship
  useEffect(() => {
    if (!code) { setState('not-found'); return; }
    
    const fetchInviterAndStatus = async () => {
      try {
        const inviterData = await api.get<UserProfile>(`/api/v1/users?inviteCode=${code}`);
        setInviter(inviterData);

        if (user) {
          if (user.uid === inviterData.uid) { setState('self'); return; }
          
          // Check existing friendship
          const res = await api.get<{ friendship: any }>(`/api/v1/friendships/status?userId=${inviterData.uid}`);
          if (res.friendship) {
            const status = res.friendship.status;
            setState(status === 'accepted' ? 'already-friends' : 'pending');
            return;
          }
        }
        setState('found');
      } catch (e) {
        console.error('Failed to lookup invite details:', e);
        setState('not-found');
      }
    };

    fetchInviterAndStatus();
  }, [code, user]);

  const handleSendRequest = async () => {
    if (!inviter) return;
    if (!user) {
      // Save intent and redirect to login
      sessionStorage.setItem('pendingInviteCode', code || '');
      navigate('/login');
      return;
    }
    setSending(true);
    try {
      await api.post('/api/v1/friendships', { addresseeId: inviter.uid });
      setState('sent');
    } catch (e) {
      console.error('Failed to send friend request:', e);
    } finally {
      setSending(false);
    }
  };

  const inviterName = inviter?.displayName || 'GeoSnapper';
  const inviterInitial = inviterName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-bg-deep flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-brand/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand rounded-lg shadow-[0_0_20px_rgba(255,107,53,0.4)] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <span className="text-white font-bold text-lg">GeoSnap</span>
          </div>
        </div>

        <div className="bg-bg-card/70 border border-border-dim backdrop-blur-xl rounded-3xl p-8 shadow-2xl text-center">

          {state === 'loading' && (
            <div className="py-10 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-brand/20 animate-pulse" />
              <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-48 bg-white/5 rounded animate-pulse" />
            </div>
          )}

          {state === 'not-found' && (
            <div className="py-10">
              <div className="text-5xl mb-4">🔍</div>
              <h2 className="text-white font-bold text-xl mb-2">Link không hợp lệ</h2>
              <p className="text-text-dim text-sm">Link mời này không tồn tại hoặc đã hết hạn.</p>
              <button onClick={() => navigate('/')} className="mt-6 px-6 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-all">
                Về trang chủ
              </button>
            </div>
          )}

          {(state === 'found' || state === 'sent' || state === 'already-friends' || state === 'pending' || state === 'self') && inviter && (
            <>
              {/* Avatar */}
              <div className="flex justify-center mb-5">
                {inviter.avatarUrl ? (
                  <img
                    src={inviter.avatarUrl}
                    alt={inviterName}
                    className="w-24 h-24 rounded-full object-cover ring-4 ring-brand/30 shadow-[0_0_40px_rgba(255,107,53,0.3)]"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand to-orange-600 flex items-center justify-center text-white text-3xl font-bold shadow-[0_0_40px_rgba(255,107,53,0.3)]">
                    {inviterInitial}
                  </div>
                )}
              </div>

              <h2 className="text-[22px] font-bold text-white mb-1">{inviterName}</h2>
              {inviter.bio && <p className="text-text-dim text-sm mb-4">{inviter.bio}</p>}

              {/* GeoSnap tag */}
              <div className="inline-flex items-center gap-1.5 bg-brand/10 border border-brand/20 rounded-full px-3 py-1 mb-6">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span className="text-brand text-[12px] font-semibold">GeoSnap</span>
              </div>

              <div className="border-t border-border-dim my-5" />

              {state === 'found' && (
                <>
                  <p className="text-text-dim text-[14px] mb-5">
                    <span className="text-white font-semibold">{inviterName}</span> muốn chia sẻ hành trình với bạn trên GeoSnap ✈️
                  </p>
                  <button
                    onClick={handleSendRequest}
                    disabled={sending}
                    className="w-full py-3.5 rounded-2xl bg-brand text-white font-bold text-[15px] hover:bg-brand/90 transition-all disabled:opacity-60 active:scale-[0.98] shadow-lg shadow-brand/30"
                  >
                    {sending ? 'Đang gửi...' : `Kết bạn với ${inviterName}`}
                  </button>
                  {!user && (
                    <p className="text-text-dim text-[12px] mt-3">Bạn sẽ được yêu cầu đăng nhập hoặc đăng ký</p>
                  )}
                </>
              )}

              {state === 'sent' && (
                <div className="py-4">
                  <div className="text-4xl mb-3">🎉</div>
                  <p className="text-white font-semibold text-[15px] mb-1">Đã gửi lời mời!</p>
                  <p className="text-text-dim text-sm mb-5">{inviterName} sẽ nhận được thông báo sớm thôi.</p>
                  <button onClick={() => navigate('/')} className="px-6 py-2.5 rounded-xl bg-white/10 border border-border-dim text-white text-sm font-semibold hover:bg-white/15 transition-all">
                    Về GeoSnap của tôi
                  </button>
                </div>
              )}

              {state === 'already-friends' && (
                <div className="py-4">
                  <div className="text-4xl mb-3">👥</div>
                  <p className="text-white font-semibold text-[15px] mb-1">Hai bạn đã là bạn bè rồi!</p>
                  <button onClick={() => navigate('/')} className="mt-4 px-6 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-all">
                    Xem hành trình
                  </button>
                </div>
              )}

              {state === 'pending' && (
                <div className="py-4">
                  <div className="text-4xl mb-3">⏳</div>
                  <p className="text-white font-semibold text-[15px] mb-1">Lời mời đang chờ xác nhận</p>
                  <p className="text-text-dim text-sm">Bạn đã gửi lời mời cho {inviterName} rồi.</p>
                </div>
              )}

              {state === 'self' && (
                <div className="py-4">
                  <div className="text-4xl mb-3">😄</div>
                  <p className="text-white font-semibold text-[15px] mb-1">Đây là link của bạn!</p>
                  <p className="text-text-dim text-sm mb-4">Chia sẻ link này cho bạn bè để kết nối.</p>
                  <button onClick={() => navigate('/friends')} className="px-6 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-all">
                    Quản lý bạn bè
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <p className="text-center text-text-dim text-[12px] mt-6">
          GeoSnap — Ghi lại hành trình bằng hình ảnh 📍
        </p>
      </div>
    </div>
  );
}
