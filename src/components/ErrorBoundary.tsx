import React, { ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import { logError } from '../lib/errorHandler';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  title?: string;
  description?: string;
  compact?: boolean;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: any[];
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  prevResetKeys?: any[];
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, State> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      prevResetKeys: props.resetKeys,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  static getDerivedStateFromProps(nextProps: ErrorBoundaryProps, prevState: State): Partial<State> | null {
    if (nextProps.resetKeys && prevState.hasError) {
      const hasChanged = nextProps.resetKeys.some(
        (key, index) => key !== (prevState.prevResetKeys || [])[index]
      );
      if (hasChanged) {
        return {
          hasError: false,
          error: null,
          errorInfo: null,
          prevResetKeys: nextProps.resetKeys,
        };
      }
    }
    return { prevResetKeys: nextProps.resetKeys };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError(error, 'ErrorBoundary');

    this.setState({
      error,
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // 1. Custom fallback
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error, this.handleReset);
        }
        return this.props.fallback;
      }

      // 2. Compact mode for widget/component level
      if (this.props.compact) {
        return (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center flex flex-col items-center justify-center gap-2 text-sm text-red-400">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>{this.props.title || 'Lỗi hiển thị thành phần'}</span>
            </div>
            <p className="text-xs text-text-dim max-w-xs truncate">
              {this.state.error.message || 'Không thể render mục này'}
            </p>
            <button
              onClick={this.handleReset}
              className="mt-1 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold rounded-lg transition-all"
            >
              Thử lại
            </button>
          </div>
        );
      }

      // 3. Full / Page level fallback
      return (
        <div className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-6 p-6 bg-bg-deep/50 text-center">
          <div className="flex flex-col items-center gap-4 max-w-md w-full bg-bg-card/80 backdrop-blur-xl border border-border-dim rounded-3xl p-8 shadow-2xl">
            <div className="rounded-2xl bg-red-500/15 border border-red-500/25 p-4 text-red-400 shadow-lg shadow-red-500/10">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-text-heading">
                {this.props.title || 'Đã xảy ra lỗi giao diện'}
              </h1>
              <p className="mt-2 text-text-dim text-sm leading-relaxed">
                {this.props.description || 'Chúng tôi xin lỗi vì sự bất tiện. Ứng dụng đã bắt được lỗi và bạn có thể thử lại hoặc quay về trang chủ.'}
              </p>
            </div>

            {this.state.error && (
              <div className="w-full text-left rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-red-400 text-xs font-mono overflow-auto max-h-32">
                <div className="font-bold mb-1 opacity-75">Error detail:</div>
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-wrap gap-3 w-full mt-2">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-surface border border-border-dim text-text-main rounded-xl hover:bg-card-hover transition-all font-semibold text-sm"
              >
                <RotateCcw className="w-4 h-4 text-text-dim" />
                Thử lại
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand text-white rounded-xl hover:bg-brand/90 transition-all font-semibold text-sm shadow-lg shadow-brand/20"
              >
                Tải lại trang
              </button>
            </div>

            <button
              onClick={() => { window.location.href = '/'; }}
              className="text-xs text-text-dim hover:text-text-main flex items-center gap-1.5 mt-2 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Về màn hình chính</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
