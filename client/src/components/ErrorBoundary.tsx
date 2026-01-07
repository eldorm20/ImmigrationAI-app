// Global Error Boundary Component
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Error Boundary caught error:', error, errorInfo);
        this.setState({
            error,
            errorInfo,
        });

        // Log to error reporting service (e.g., Sentry)
        // logErrorToService(error, errorInfo);
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
                    <div className="max-w-md w-full">
                        <div className="glass-card p-8 text-center">
                            {/* Error Icon */}
                            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-6">
                                <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                            </div>

                            {/* Error Message */}
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-3">
                                Oops! Something went wrong
                            </h1>
                            <p className="text-slate-600 dark:text-slate-400 mb-6">
                                We're sorry for the inconvenience. An unexpected error occurred.
                            </p>

                            {/* Error Details (Development) */}
                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <details className="text-left mb-6">
                                    <summary className="cursor-pointer text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                        Error Details
                                    </summary>
                                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-xs font-mono overflow-auto max-h-40">
                                        <p className="text-red-600 dark:text-red-400 font-bold mb-2">
                                            {this.state.error.toString()}
                                        </p>
                                        {this.state.errorInfo && (
                                            <pre className="text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        )}
                                    </div>
                                </details>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={this.handleReset}
                                    className="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    <RefreshCw className="w-5 h-5" />
                                    Try Again
                                </button>
                                <button
                                    onClick={this.handleGoHome}
                                    className="flex-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                                >
                                    <Home className="w-5 h-5" />
                                    Go Home
                                </button>
                            </div>
                        </div>

                        {/* Help Text */}
                        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
                            If this problem persists, please contact support
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Hook version for functional components
export function useErrorBoundary() {
    const [error, setError] = React.useState<Error | null>(null);

    React.useEffect(() => {
        if (error) {
            throw error;
        }
    }, [error]);

    const resetError = () => setError(null);

    return { setError, resetError };
}
