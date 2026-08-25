import React, { ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: { react: errorInfo },
      });
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
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center gap-6 bg-bg-deep p-6">
          <div className="flex flex-col items-center gap-4 max-w-md">
            <div className="rounded-full bg-red-500/15 p-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-text-heading">Có lỗi xảy ra</h1>
              <p className="mt-2 text-text-dim text-sm">
                Chúng tôi xin lỗi vì sự bất tiện. Vui lòng thử lại hoặc tải lại trang.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-red-400 text-xs font-mono overflow-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <div className="flex gap-3 w-full">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-card-hover text-text-main rounded-lg hover:bg-card-hover/80 transition-all font-medium"
              >
                <RotateCcw className="w-4 h-4" />
                Quay lại
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-brand text-white rounded-lg hover:bg-brand/80 transition-all font-medium"
              >
                Tải lại trang
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
