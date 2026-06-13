import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { connectSocket } from '../lib/socket';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      api.setToken(token);
      connectSocket(token);
      console.log('[AuthCallback] Token stored, redirecting...');
      navigate('/', { replace: true });
    } else {
      console.error('[AuthCallback] No token provided in URL');
      navigate('/login?error=no_token', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#08090a]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-brand shadow-[0_0_30px_rgba(255,107,53,0.5)] animate-pulse" />
        <div className="text-white/60 text-sm">Đang xác thực thông tin...</div>
      </div>
    </div>
  );
}
