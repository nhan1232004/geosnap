import React, { useState } from 'react';
import { AlertTriangle, RotateCcw, Home, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getErrorMessage, isNetworkError } from '../lib/errorHandler';

export interface ErrorFallbackProps {
  error?: Error | string | null;
  message?: string;
  title?: string;
  onRetry?: () => Promise<void> | void;
  fullScreen?: boolean;
  compact?: boolean;
  showHomeLink?: boolean;
  className?: string;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  message,
  title,
  onRetry,
  fullScreen = false,
  compact = false,
  showHomeLink = true,
  className = '',
}) => {
  const [retrying, setRetrying] = useState(false);

  const isNetwork = isNetworkError(error);
  const displayTitle = title || (isNetwork ? 'Mất kết nối' : 'Không thể tải dữ liệu');
  const displayMessage = message || getErrorMessage(error);

  const handleRetry = async () => {
    if (!onRetry || retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  if (compact) {
    return (
      <div className={`p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-red-400 text-sm ${className}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
          <span className="truncate">{displayMessage}</span>
        </div>
        {onRetry && (
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 shrink-0"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
            <span>{retrying ? 'Đang thử...' : 'Thử lại'}</span>
          </button>
        )}
      </div>
    );
  }

  const containerClasses = fullScreen
    ? 'flex min-h-[60vh] h-full w-full items-center justify-center p-6'
    : 'py-12 px-6 my-4 rounded-3xl bg-bg-card/70 backdrop-blur-xl border border-border-dim flex flex-col items-center justify-center text-center';

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="flex flex-col items-center max-w-md mx-auto text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/25 flex items-center justify-center mb-4 text-red-400 shadow-lg shadow-red-500/10">
          {isNetwork ? <WifiOff className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
        </div>

        <h3 className="text-lg md:text-xl font-bold text-text-heading mb-2">
          {displayTitle}
        </h3>

        <p className="text-text-dim text-xs md:text-sm mb-6 leading-relaxed">
          {displayMessage}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 w-full">
          {onRetry && (
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-xl hover:bg-brand/90 active:scale-95 transition-all shadow-lg shadow-brand/20 disabled:opacity-60"
            >
              <RotateCcw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
              <span>{retrying ? 'Đang tải lại...' : 'Thử lại'}</span>
            </button>
          )}

          {showHomeLink && (
            <Link
              to="/"
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-surface border border-border-dim text-text-dim hover:text-text-main rounded-xl text-sm font-medium transition-all hover:bg-card-hover"
            >
              <Home className="w-4 h-4" />
              <span>Về trang chủ</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
