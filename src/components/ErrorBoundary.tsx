import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-app-darker text-app-text p-6">
                    <div className="bg-app-card border border-red-500/30 rounded-xl p-8 max-w-lg w-full shadow-2xl animate-fade-in relative overflow-hidden">
                        {/* Background glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>

                            <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
                            <p className="text-app-text-muted mb-6">
                                The application encountered an unexpected error.
                            </p>

                            {this.state.error && (
                                <div className="w-full bg-black/30 rounded-lg p-4 mb-6 text-left overflow-auto max-h-40 border border-app-border">
                                    <p className="text-red-400 font-mono text-sm break-words">
                                        {this.state.error.toString()}
                                    </p>
                                </div>
                            )}

                            <div className="flex gap-4">
                                <button
                                    onClick={this.handleReload}
                                    className="flex items-center gap-2 px-6 py-2 bg-app-accent hover:bg-app-accent-hover text-white rounded-lg transition-colors font-medium"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Reload Page
                                </button>
                                <button
                                    onClick={() => this.setState({ hasError: false, error: null })}
                                    className="px-6 py-2 bg-app-surface border border-app-border hover:bg-app-surface-hover text-app-text rounded-lg transition-colors font-medium"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
