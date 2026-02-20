import { useQuery } from "@tanstack/react-query";
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, Loader2, Sun, Moon } from "lucide-react";
import React from "react";
import type { OverallStatus, ComponentHealth, ComponentStatus } from "@flowmaestro/shared";
import { fetchStatus } from "./lib/api";
import { useTheme } from "./lib/useTheme";

// Status configuration
const overallStatusConfig: Record<OverallStatus, { icon: React.ElementType; label: string }> = {
    operational: { icon: CheckCircle, label: "All systems operational" },
    degraded: { icon: AlertTriangle, label: "Degraded performance" },
    partial_outage: { icon: AlertTriangle, label: "Partial outage" },
    major_outage: { icon: XCircle, label: "Major outage" }
};

// Uptime bar component
const UptimeBar: React.FC<{ status: ComponentStatus }> = ({ status }) => {
    const barColor =
        status === "operational"
            ? "bg-emerald-500"
            : status === "degraded"
              ? "bg-amber-500"
              : "bg-red-500";

    return (
        <div className="flex gap-[2px] h-8">
            {Array.from({ length: 90 }, (_, i) => (
                <div key={i} className={`flex-1 min-w-[3px] rounded-sm ${barColor}`} />
            ))}
        </div>
    );
};

// Component status row
const ComponentRow: React.FC<{ component: ComponentHealth }> = ({ component }) => {
    const textColor =
        component.status === "operational"
            ? "text-emerald-500"
            : component.status === "degraded"
              ? "text-amber-500"
              : "text-red-500";

    return (
        <div className="py-5">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <CheckCircle className={`w-4 h-4 ${textColor}`} />
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {component.displayName}
                    </span>
                </div>
                <span className={`text-sm font-medium ${textColor}`}>100.0% uptime</span>
            </div>
            <UptimeBar status={component.status} />
            <div className="flex justify-between mt-1.5">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                    <span className="opacity-60">&lt;</span> 90 DAYS AGO
                </span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">TODAY</span>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    const {
        data: status,
        isLoading,
        isError,
        error,
        refetch,
        isFetching
    } = useQuery({
        queryKey: ["status"],
        queryFn: fetchStatus
    });

    const config = status ? overallStatusConfig[status.status] : null;
    const StatusIcon = config?.icon;

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 transition-colors">
            {/* Header */}
            <header className="py-8">
                <div className="max-w-xl mx-auto px-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-zinc-900 dark:bg-zinc-100 rounded-lg flex items-center justify-center">
                                <span className="text-zinc-100 dark:text-zinc-900 text-sm font-bold">
                                    FM
                                </span>
                            </div>
                            <span className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                                FlowMaestro
                            </span>
                        </div>
                        <button
                            onClick={toggleTheme}
                            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-zinc-700 dark:text-zinc-300"
                            title={
                                theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
                            }
                        >
                            {theme === "dark" ? (
                                <Sun className="w-5 h-5" />
                            ) : (
                                <Moon className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 py-4">
                <div className="max-w-xl mx-auto px-4">
                    {/* Loading State */}
                    {isLoading && (
                        <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-16">
                            <div className="flex flex-col items-center justify-center">
                                <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
                                <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                                    Loading status...
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {isError && (
                        <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 p-12 text-center">
                            <XCircle className="w-10 h-10 text-red-500 mx-auto" />
                            <p className="mt-4 text-zinc-900 dark:text-zinc-100 font-medium">
                                Failed to load status
                            </p>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                {error instanceof Error ? error.message : "Unknown error"}
                            </p>
                            <button
                                onClick={() => refetch()}
                                className="mt-4 px-4 py-2 text-sm bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 rounded-lg hover:opacity-90 transition-opacity"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {/* Status Content */}
                    {status && StatusIcon && config && (
                        <div className="bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
                            {/* Overall Status */}
                            <div className="px-8 py-8 text-center border-b border-zinc-200 dark:border-zinc-700">
                                <div className="flex items-center justify-center gap-3">
                                    <StatusIcon className="w-6 h-6 text-emerald-500" />
                                    <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                        {config.label}
                                    </span>
                                </div>
                                <button
                                    onClick={() => refetch()}
                                    disabled={isFetching}
                                    className="mt-3 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 text-zinc-500 dark:text-zinc-400 inline-flex items-center gap-1 text-xs"
                                    title="Refresh"
                                >
                                    <RefreshCw
                                        className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
                                    />
                                    <span>Refresh</span>
                                </button>
                            </div>

                            {/* Components */}
                            <div className="px-8 divide-y divide-zinc-200 dark:divide-zinc-700">
                                {status.components.map((component) => (
                                    <ComponentRow key={component.name} component={component} />
                                ))}
                            </div>

                            {/* Recent Notices */}
                            <div className="px-8 py-6 border-t border-zinc-200 dark:border-zinc-700">
                                <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                                    Recent Notices
                                </h3>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                        No notices reported for the past 7 days
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;
