import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '../firebase';

export default function Login() {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-bg-deep">
      <div className="atmosphere"></div>
      <div className="w-full max-w-sm space-y-8 rounded-3xl bg-bg-card/40 border border-border-dim backdrop-blur-xl p-10 text-center relative z-10">
        <div>
          <div className="w-16 h-16 bg-brand rounded-2xl mx-auto mb-6 shadow-[0_0_40px_rgba(255,107,53,0.4)]"></div>
          <h1 className="text-[32px] font-bold tracking-tight text-white leading-none">GeoSnap</h1>
          <p className="mt-4 text-[14px] text-text-dim px-4">Travel memories organized automatically via EXIF GPS</p>
        </div>
        <button 
          onClick={handleLogin}
          className="w-full rounded-xl bg-white px-4 py-3.5 text-black font-semibold hover:bg-gray-100 transition-colors shadow-lg"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}
