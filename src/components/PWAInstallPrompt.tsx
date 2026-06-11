import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed it recently
    const isDismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (isDismissed) return;

    const handler = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      
      // Delay showing the banner by 10 seconds to improve user experience
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 10000);

      return () => clearTimeout(timer);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // For testing/debugging or browsers that already have it installed,
    // we can also listen to appinstalled event to hide prompt
    const installedHandler = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA install prompt outcome: ${outcome}`);
    // We've used the prompt, and can't use it again
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Remember dismiss decision for 7 days
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-2rem)] max-w-md animate-[fadeInUp_0.4s_ease-out]">
      <div className="glass-card border border-border-dim rounded-2xl p-4 shadow-2xl shadow-black/30 flex items-start gap-4 bg-bg-card/90 backdrop-blur-md">
        {/* App Icon Circle */}
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-brand/20">
          <Smartphone className="w-6 h-6" />
        </div>

        {/* Text Details */}
        <div className="flex-1 min-w-0">
          <h4 className="text-[14px] font-bold text-text-heading">Cài đặt ứng dụng GeoSnap</h4>
          <p className="text-[12px] text-text-dim mt-0.5 leading-snug">
            Thêm GeoSnap vào màn hình chính để truy cập nhanh, sử dụng mượt mà và hỗ trợ ngoại tuyến.
          </p>
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={handleInstallClick}
              className="px-4 py-2 rounded-xl bg-brand hover:bg-brand/90 text-white text-[12px] font-bold transition-all shadow-md shadow-brand/10 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Cài đặt ngay
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 rounded-xl hover:bg-surface text-text-dim hover:text-text-main text-[12px] font-semibold transition-colors"
            >
              Để sau
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg hover:bg-surface text-text-dim hover:text-text-main transition-colors shrink-0"
          aria-label="Đóng"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
