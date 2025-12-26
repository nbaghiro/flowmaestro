/**
 * React Error Boundary Component
 * Catches React render errors and logs them with correlation IDs
 */

import { AlertTriangle, RefreshCw, Copy, Check } from "lucide-react";
import React from "react";
import { logger } from "../../lib/logger";
import { Button } from "./Button";

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
    copied: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            copied: false
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        // Log the error with correlation IDs
        logger.error("React error boundary caught error", error, {
            componentStack: errorInfo.componentStack,
            traceId: logger.getLastTraceId() || undefined
        });

        this.setState({ errorInfo });

        // Call optional error callback
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    handleRetry = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
            copied: false
        });
    };

    handleCopyError = async (): Promise<void> => {
        const { error, errorInfo } = this.state;
        const traceId = logger.getLastTraceId();
        const sessionId = logger.getSessionId();

        const errorReport = [
            "=== FlowMaestro Error Report ===",
            "",
            `Trace ID: ${traceId || "N/A"}`,
            `Session ID: ${sessionId}`,
            `Timestamp: ${new Date().toISOString()}`,
            `URL: ${window.location.href}`,
            "",
            "Error:",
            error?.message || "Unknown error",
            "",
            "Stack Trace:",
            error?.stack || "No stack trace available",
            "",
            "Component Stack:",
            errorInfo?.componentStack || "No component stack available"
        ].join("\n");

        try {
            await navigator.clipboard.writeText(errorReport);
            this.setState({ copied: true });
            setTimeout(() => this.setState({ copied: false }), 2000);
        } catch {
            // Fallback for browsers that don't support clipboard API
            const textarea = document.createElement("textarea");
            textarea.value = errorReport;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
            this.setState({ copied: true });
            setTimeout(() => this.setState({ copied: false }), 2000);
        }
    };

    render(): React.ReactNode {
        if (this.state.hasError) {
            // Custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }

            const traceId = logger.getLastTraceId();

            // Default error UI
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8 bg-background">
                    <div className="flex flex-col items-center max-w-md text-center">
                        <div className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-destructive/10">
                            <AlertTriangle className="w-8 h-8 text-destructive" />
                        </div>
                        <h2 className="text-xl font-semibold text-foreground mb-2">
                            Something went wrong
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            An unexpected error occurred. Our team has been notified.
                        </p>
                        {traceId && (
                            <p className="text-xs text-muted-foreground mb-6 font-mono bg-muted px-2 py-1 rounded">
                                Reference: {traceId.substring(0, 8)}
                            </p>
                        )}
                        <div className="flex gap-3">
                            <Button variant="primary" onClick={this.handleRetry}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Try Again
                            </Button>
                            <Button variant="secondary" onClick={this.handleCopyError}>
                                {this.state.copied ? (
                                    <>
                                        <Check className="w-4 h-4 mr-2" />
                                        Copied!
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy Error
                                    </>
                                )}
                            </Button>
                        </div>
                        {import.meta.env.DEV && this.state.error && (
                            <details className="mt-6 w-full text-left">
                                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                                    Show error details (dev only)
                                </summary>
                                <pre className="mt-2 p-4 bg-muted rounded text-xs overflow-auto max-h-48 text-destructive">
                                    {this.state.error.stack}
                                </pre>
                                {this.state.errorInfo?.componentStack && (
                                    <pre className="mt-2 p-4 bg-muted rounded text-xs overflow-auto max-h-48 text-muted-foreground">
                                        {this.state.errorInfo.componentStack}
                                    </pre>
                                )}
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Hook to manually trigger error boundary
 * Useful for async errors that aren't caught by the boundary
 */
export function useErrorBoundary(): (error: Error) => void {
    const [, setError] = React.useState<Error | null>(null);

    return React.useCallback((error: Error) => {
        // Log the error
        logger.error("Manual error boundary trigger", error);

        // This will cause React to trigger the error boundary
        setError(() => {
            throw error;
        });
    }, []);
}
