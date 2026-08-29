import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Eye, EyeOff, MapPin, Camera, Globe, Users, ArrowLeft, Mail } from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  signInWithPopup,
  browserPopupRedirectResolver,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { UserProfile } from '../types';

type AuthMode = 'choose' | 'email-login' | 'email-register' | 'forgot-password';

function getFirebaseAuthErrorMessage(code: string, fallback: string): string {
  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'Cửa sổ đăng nhập Google đã bị đóng trước khi hoàn tất.';
    case 'auth/unauthorized-domain':
      return 'Tên miền chưa được cấp quyền trong Firebase Console (Authentication > Settings > Authorized domains).';
    case 'auth/operation-not-allowed':
      return 'Đăng nhập bằng Google chưa được bật trong Firebase Authentication.';
    case 'auth/account-exists-with-different-credential':
      return 'Email này đã được sử dụng với một phương thức đăng nhập khác.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email hoặc mật khẩu không chính xác.';
    case 'auth/email-already-in-use':
      return 'Email này đã được đăng ký trước đó. Vui lòng chọn Đăng nhập.';
    case 'auth/weak-password':
      return 'Mật khẩu quá yếu (tối thiểu 6 ký tự).';
    case 'auth/invalid-email':
      return 'Địa chỉ email không đúng định dạng.';
    case 'auth/network-request-failed':
      return 'Lỗi kết nối mạng. Vui lòng kiểm tra lại kết nối Wifi/4G.';
    case 'auth/missing-initial-state':
    case 'auth/popup-blocked':
    case 'auth/cancelled-popup-request':
      return 'Trình duyệt đã chặn cửa sổ đăng nhập Popup. Vui lòng cho phép popup hoặc đăng nhập bằng Email.';
    case 'auth/too-many-requests':
      return 'Quá nhiều lần thử thất bại. Vui lòng đợi 1 phút và thử lại.';
    case 'permission-denied':
      return 'Lỗi phân quyền Firestore khi tải thông tin tài khoản.';
    default:
      return code ? `${fallback} (${code})` : fallback;
  }
}

// Animated floating blob
function Blob({ className }: { className: string }) {
  return <div className={`absolute rounded-full blur-[80px] pointer-events-none animate-pulse ${className}`} />;
}

// Floating stat card for the left panel
function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3">
      <div className="w-9 h-9 rounded-xl bg-brand/30 flex items-center justify-center text-white shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-white font-bold text-lg leading-none">{value}</div>
        <div className="text-white/60 text-xs mt-0.5">{label}</div>
      </div>
    </div>
  );
}

export default function Login() {
  const { setUser, setUserProfile } = useAppStore();
  const [mode, setMode] = useState<AuthMode>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleGoogle = async () => {
    setError(''); setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);

      let profile: UserProfile;
      try {
        const userDocRef = doc(db, 'users', cred.user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          profile = userDoc.data() as UserProfile;
        } else {
          profile = {
            uid: cred.user.uid,
            email: cred.user.email || '',
            displayName: cred.user.displayName || 'User',
            avatarUrl: cred.user.photoURL || undefined,
            role: 'user',
            createdAt: new Date().toISOString(),
          };
          const docData: Record<string, any> = {
            uid: profile.uid,
            email: profile.email,
            displayName: profile.displayName,
            role: profile.role,
            createdAt: profile.createdAt,
          };
          if (profile.avatarUrl) {
            docData.avatarUrl = profile.avatarUrl;
          }
          await setDoc(userDocRef, docData, { merge: true });
        }
      } catch (firestoreErr) {
        console.warn('Could not read/write user profile to Firestore:', firestoreErr);
        profile = {
          uid: cred.user.uid,
          email: cred.user.email || '',
          displayName: cred.user.displayName || 'User',
          avatarUrl: cred.user.photoURL || undefined,
          role: 'user',
          createdAt: new Date().toISOString(),
        };
      }

      setUser({
        uid: profile.uid,
        email: profile.email,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      });
      setUserProfile(profile);
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setError(getFirebaseAuthErrorMessage(err.code, err.message || 'Đăng nhập Google không thành công.'));
    } finally { setLoading(false); }
  };

  const handleFacebook = () => {
    setError('Đăng nhập Facebook hiện đang bảo trì.');
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);

      let profile: UserProfile;
      try {
        const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
        profile = userDoc.exists()
          ? (userDoc.data() as UserProfile)
          : {
              uid: cred.user.uid,
              email: cred.user.email || email.trim(),
              displayName: cred.user.displayName || 'User',
              avatarUrl: cred.user.photoURL || undefined,
              role: 'user',
              createdAt: new Date().toISOString(),
            };
      } catch {
        profile = {
          uid: cred.user.uid,
          email: cred.user.email || email.trim(),
          displayName: cred.user.displayName || 'User',
          avatarUrl: cred.user.photoURL || undefined,
          role: 'user',
          createdAt: new Date().toISOString(),
        };
      }

      setUser({
        uid: cred.user.uid,
        email: profile.email,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      });
      setUserProfile(profile);
    } catch (err: any) {
      console.error('Email Login Error:', err);
      setError(getFirebaseAuthErrorMessage(err.code, err.message || 'Email hoặc mật khẩu không đúng.'));
    } finally { setLoading(false); }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name.trim()) {
        try {
          await updateProfile(cred.user, { displayName: name.trim() });
        } catch (e) {
          console.warn('Could not update display name:', e);
        }
      }

      const profile: UserProfile = {
        uid: cred.user.uid,
        email: cred.user.email || email.trim(),
        displayName: name.trim() || cred.user.displayName || 'User',
        avatarUrl: cred.user.photoURL || undefined,
        role: 'user',
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, 'users', cred.user.uid), profile, { merge: true });
      } catch (e) {
        console.warn('Could not save user profile to Firestore:', e);
      }

      setUser({
        uid: profile.uid,
        email: profile.email,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      });
      setUserProfile(profile);
    } catch (err: any) {
      console.error('Email Register Error:', err);
      setError(getFirebaseAuthErrorMessage(err.code, err.message || 'Không thể tạo tài khoản. Vui lòng thử lại.'));
    } finally { setLoading(false); }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMsg('Đã gửi email đặt lại mật khẩu. Kiểm tra hộp thư của bạn!');
    } catch (err: any) {
      console.error('Reset Password Error:', err);
      setError(getFirebaseAuthErrorMessage(err.code, 'Email không tồn tại hoặc không hợp lệ.'));
    } finally { setLoading(false); }
  };

  const inputClass = "w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder:text-white/40 outline-none focus:border-brand/70 focus:bg-white/15 transition-all text-[14px]";

  return (
    <div className={`flex min-h-screen bg-[#08090a] overflow-hidden transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>

      {/* ===== LEFT PANEL — Branding ===== */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] relative overflow-hidden p-12">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a00] via-[#0d0d0d] to-[#08090a]" />

        {/* Animated blobs */}
        <Blob className="w-[500px] h-[500px] bg-brand/25 top-[-100px] left-[-100px]" />
        <Blob className="w-[400px] h-[400px] bg-orange-600/15 bottom-[50px] right-[-50px]" />
        <Blob className="w-[300px] h-[300px] bg-yellow-600/10 top-[40%] left-[30%]" />

        {/* Grid overlay for texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-[0_0_30px_rgba(255,107,53,0.5)]">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="text-white text-xl font-extrabold tracking-tight">GeoSnap</span>
          </div>
        </div>

        {/* Main hero text */}
        <div className="relative z-10">
          <h2 className="text-[48px] font-extrabold text-white leading-[1.1] tracking-tight">
            Lưu giữ<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-yellow-400">
              mọi hành trình
            </span><br />
            của bạn
          </h2>
          <p className="mt-5 text-white/50 text-lg leading-relaxed max-w-[380px]">
            Gắn ảnh vào bản đồ, tổ chức theo địa điểm, chia sẻ với bạn bè — tất cả trong một app.
          </p>

          {/* Feature stat cards */}
          <div className="mt-8 grid grid-cols-2 gap-3 max-w-[380px]">
            <StatCard icon={<Camera className="w-4 h-4" />} value="10K+" label="Bức ảnh được lưu" />
            <StatCard icon={<Globe className="w-4 h-4" />} value="50+" label="Quốc gia được ghé thăm" />
            <StatCard icon={<MapPin className="w-4 h-4" />} value="2K+" label="Địa điểm được đánh dấu" />
            <StatCard icon={<Users className="w-4 h-4" />} value="500+" label="Người dùng hàng ngày" />
          </div>
        </div>

        {/* Bottom quote */}
        <div className="relative z-10">
          <p className="text-white/30 text-sm italic">
            "Một bức ảnh đáng giá ngàn từ — nhất là khi bạn biết nó được chụp ở đâu."
          </p>
        </div>
      </div>

      {/* ===== RIGHT PANEL — Auth Form ===== */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {/* Mobile background blobs */}
        <Blob className="w-[400px] h-[400px] bg-brand/15 top-[-100px] right-[-100px] lg:hidden" />
        <Blob className="w-[300px] h-[300px] bg-orange-600/10 bottom-[-50px] left-[-50px] lg:hidden" />

        <div className="relative z-10 w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-9 h-9 bg-brand rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,107,53,0.4)]">
              <MapPin className="w-4 h-4 text-white" />
            </div>
            <span className="text-white text-lg font-extrabold">GeoSnap</span>
          </div>

          {/* ===== CHOOSE MODE ===== */}
          {mode === 'choose' && (
            <div className="space-y-4 page-enter">
              <div className="mb-7">
                <h1 className="text-[28px] font-extrabold text-white tracking-tight">Chào mừng trở lại</h1>
                <p className="text-white/40 text-sm mt-1">Đăng nhập để tiếp tục hành trình của bạn</p>
              </div>

              {/* Google — primary CTA */}
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-white hover:bg-gray-100 transition-all duration-200 text-gray-800 font-semibold text-[15px] shadow-lg active:scale-[0.98] disabled:opacity-50"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Tiếp tục với Google
              </button>

              {/* Facebook */}
              <button
                onClick={handleFacebook}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-[#1877F2] hover:bg-[#1561d0] transition-all duration-200 text-white font-semibold text-[15px] shadow-lg shadow-blue-900/20 active:scale-[0.98] disabled:opacity-50"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Tiếp tục với Facebook
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-white/30 text-xs">hoặc dùng email</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Email options */}
              <div className="flex gap-3">
                <button
                  onClick={() => setMode('email-login')}
                  className="flex-1 py-3 rounded-2xl border border-white/15 text-white/70 text-[14px] font-medium hover:bg-white/10 hover:border-white/25 hover:text-white transition-all"
                >
                  Đăng nhập
                </button>
                <button
                  onClick={() => setMode('email-register')}
                  className="flex-1 py-3 rounded-2xl border border-brand/40 bg-brand/10 text-brand text-[14px] font-medium hover:bg-brand/20 transition-all"
                >
                  Đăng ký mới
                </button>
              </div>

              {error && <p className="text-red-400 text-[13px] text-center">{error}</p>}
            </div>
          )}

          {/* ===== EMAIL LOGIN ===== */}
          {mode === 'email-login' && (
            <form onSubmit={handleEmailLogin} className="space-y-4 page-enter">
              <button onClick={() => { setMode('choose'); setError(''); }} type="button"
                className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors mb-2">
                <ArrowLeft className="w-4 h-4" /> Quay lại
              </button>
              <div className="mb-6">
                <h1 className="text-[26px] font-extrabold text-white">Đăng nhập</h1>
                <p className="text-white/40 text-sm mt-1">Nhập thông tin tài khoản của bạn</p>
              </div>

              <div className="space-y-3">
                <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                  placeholder="Địa chỉ email" required className={inputClass} />
                <div className="relative">
                  <input value={password} onChange={e => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mật khẩu" required className={`${inputClass} pr-12`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="button" onClick={() => { setMode('forgot-password'); setError(''); }}
                className="text-brand/70 hover:text-brand text-[13px] transition-colors">
                Quên mật khẩu?
              </button>

              {error && <p className="text-red-400 text-[13px]">{error}</p>}

              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-brand text-white font-semibold text-[15px] hover:bg-brand-light transition-all disabled:opacity-50 active:scale-[0.98] mt-1">
                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>

              <p className="text-center text-[13px] text-white/40">
                Chưa có tài khoản?{' '}
                <button type="button" onClick={() => { setMode('email-register'); setError(''); }}
                  className="text-brand hover:text-brand-light transition-colors font-medium">
                  Đăng ký ngay
                </button>
              </p>
            </form>
          )}

          {/* ===== EMAIL REGISTER ===== */}
          {mode === 'email-register' && (
            <form onSubmit={handleEmailRegister} className="space-y-4 page-enter">
              <button onClick={() => { setMode('choose'); setError(''); }} type="button"
                className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors mb-2">
                <ArrowLeft className="w-4 h-4" /> Quay lại
              </button>
              <div className="mb-6">
                <h1 className="text-[26px] font-extrabold text-white">Tạo tài khoản</h1>
                <p className="text-white/40 text-sm mt-1">Bắt đầu lưu giữ hành trình của bạn</p>
              </div>

              <div className="space-y-3">
                <input value={name} onChange={e => setName(e.target.value)} type="text"
                  placeholder="Tên của bạn" required className={inputClass} />
                <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                  placeholder="Địa chỉ email" required className={inputClass} />
                <div className="relative">
                  <input value={password} onChange={e => setPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mật khẩu (tối thiểu 6 ký tự)" required minLength={6}
                    className={`${inputClass} pr-12`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password strength indicator */}
              {password.length > 0 && (
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-all ${
                      password.length >= i * 3
                        ? i <= 1 ? 'bg-red-500' : i <= 2 ? 'bg-yellow-500' : i <= 3 ? 'bg-blue-400' : 'bg-green-400'
                        : 'bg-white/10'
                    }`} />
                  ))}
                </div>
              )}

              {error && <p className="text-red-400 text-[13px]">{error}</p>}

              <button type="submit" disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-brand text-white font-semibold text-[15px] hover:bg-brand-light transition-all disabled:opacity-50 active:scale-[0.98]">
                {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
              </button>

              <p className="text-center text-[13px] text-white/40">
                Đã có tài khoản?{' '}
                <button type="button" onClick={() => { setMode('email-login'); setError(''); }}
                  className="text-brand hover:text-brand-light transition-colors font-medium">
                  Đăng nhập
                </button>
              </p>
            </form>
          )}

          {/* ===== FORGOT PASSWORD ===== */}
          {mode === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} className="space-y-4 page-enter">
              <button onClick={() => { setMode('email-login'); setError(''); setSuccessMsg(''); }} type="button"
                className="flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors mb-2">
                <ArrowLeft className="w-4 h-4" /> Quay lại
              </button>
              <div className="mb-6">
                <div className="w-12 h-12 bg-brand/20 rounded-2xl flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6 text-brand" />
                </div>
                <h1 className="text-[26px] font-extrabold text-white">Quên mật khẩu?</h1>
                <p className="text-white/40 text-sm mt-1">Nhập email để nhận link đặt lại mật khẩu</p>
              </div>

              <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                placeholder="Địa chỉ email của bạn" required className={inputClass} />

              {error && <p className="text-red-400 text-[13px]">{error}</p>}
              {successMsg && (
                <div className="bg-green-500/15 border border-green-500/30 rounded-xl p-3 text-green-400 text-[13px]">
                  {successMsg}
                </div>
              )}

              <button type="submit" disabled={loading || !!successMsg}
                className="w-full py-3.5 rounded-2xl bg-brand text-white font-semibold text-[15px] hover:bg-brand-light transition-all disabled:opacity-50 active:scale-[0.98]">
                {loading ? 'Đang gửi...' : 'Gửi link đặt lại'}
              </button>
            </form>
          )}

          {/* Footer */}
          <p className="text-center text-[12px] text-white/20 mt-8">
            Bằng cách đăng nhập, bạn đồng ý với{' '}
            <span className="text-white/40 cursor-pointer hover:text-white/60 transition-colors">Điều khoản dịch vụ</span>
            {' '}và{' '}
            <span className="text-white/40 cursor-pointer hover:text-white/60 transition-colors">Chính sách bảo mật</span>
          </p>
        </div>
      </div>
    </div>
  );
}
