import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "./button";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center space-y-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/50">
                    <AlertCircle className="w-12 h-12 text-red-500" />
                    <h2 className="text-xl font-semibold text-red-700 dark:text-red-400">Something went wrong</h2>
                    <p className="text-red-600 dark:text-red-300 max-w-md">
                        {this.state.error?.message || "An unexpected error occurred while loading this component."}
                    </p>
                    <Button
                        variant="outline"
                        onClick={() => this.setState({ hasError: false })}
                    >
                        Try Again
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
