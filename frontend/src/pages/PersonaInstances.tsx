import { ArrowLeft, Plus, AlertCircle, Play, CheckCircle, Archive } from "lucide-react";
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { InstanceCard } from "../components/persona-instances/InstanceCard";
import { usePersonaStore } from "../stores/personaStore";
import type { PersonaInstanceStatus } from "../lib/api";

type FilterStatus = "all" | "active" | "needs_attention" | "completed";

const filterOptions: { value: FilterStatus; label: string; icon: React.ReactNode }[] = [
    { value: "all", label: "All Tasks", icon: null },
    { value: "active", label: "Active", icon: <Play className="w-4 h-4" /> },
    {
        value: "needs_attention",
        label: "Needs Attention",
        icon: <AlertCircle className="w-4 h-4" />
    },
    { value: "completed", label: "Completed", icon: <CheckCircle className="w-4 h-4" /> }
];

const statusGroups: Record<FilterStatus, PersonaInstanceStatus[]> = {
    all: [
        "initializing",
        "clarifying",
        "running",
        "waiting_approval",
        "completed",
        "cancelled",
        "failed",
        "timeout"
    ],
    active: ["initializing", "clarifying", "running", "waiting_approval"],
    needs_attention: ["waiting_approval"],
    completed: ["completed", "cancelled", "failed", "timeout"]
};

export const PersonaInstances: React.FC = () => {
    const navigate = useNavigate();
    const { dashboard, isLoadingInstances, instancesError, fetchDashboard, cancelInstance } =
        usePersonaStore();

    const [filter, setFilter] = useState<FilterStatus>("all");

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    // Combine all instances from dashboard for filtering
    const allInstances = useMemo(() => {
        if (!dashboard) return [];

        const combined = [
            ...(dashboard.needs_attention || []),
            ...(dashboard.running || []),
            ...(dashboard.recent_completed || [])
        ];

        // Deduplicate by id
        const seen = new Set<string>();
        return combined.filter((instance) => {
            if (seen.has(instance.id)) return false;
            seen.add(instance.id);
            return true;
        });
    }, [dashboard]);

    // Filter instances based on selected filter
    const filteredInstances = useMemo(() => {
        const allowedStatuses = statusGroups[filter];
        return allInstances.filter((instance) =>
            allowedStatuses.includes(instance.status as PersonaInstanceStatus)
        );
    }, [allInstances, filter]);

    // Group instances by status for display
    const groupedInstances = useMemo(() => {
        const groups = {
            needs_attention: filteredInstances.filter((i) => i.status === "waiting_approval"),
            running: filteredInstances.filter((i) =>
                ["initializing", "clarifying", "running"].includes(i.status)
            ),
            completed: filteredInstances.filter((i) =>
                ["completed", "cancelled", "failed", "timeout"].includes(i.status)
            )
        };
        return groups;
    }, [filteredInstances]);

    const handleInstanceClick = (id: string) => {
        navigate(`/persona-instances/${id}`);
    };

    const handleCancel = async (id: string) => {
        try {
            await cancelInstance(id);
        } catch (_error) {
            // Error is handled in store
        }
    };

    const needsAttentionCount = dashboard?.needs_attention?.length || 0;
    const runningCount = dashboard?.running?.length || 0;

    return (
        <div className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate("/personas")}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">My Active Tasks</h1>
                            <p className="text-muted-foreground mt-1">
                                {runningCount} running
                                {needsAttentionCount > 0 && (
                                    <span className="text-amber-600 dark:text-amber-400">
                                        {" "}
                                        · {needsAttentionCount} need attention
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate("/personas")}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        New Task
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-2 mb-6 border-b border-border">
                    {filterOptions.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setFilter(option.value)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                filter === option.value
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            {option.icon}
                            {option.label}
                            {option.value === "needs_attention" && needsAttentionCount > 0 && (
                                <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 px-1.5 py-0.5 rounded-full text-xs">
                                    {needsAttentionCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Loading State */}
                {isLoadingInstances && (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                )}

                {/* Error State */}
                {instancesError && (
                    <div className="p-4 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-lg mb-8">
                        {instancesError}
                    </div>
                )}

                {/* Empty State */}
                {!isLoadingInstances && !instancesError && filteredInstances.length === 0 && (
                    <div className="text-center py-20">
                        <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                            {filter === "all"
                                ? "No tasks yet"
                                : filter === "needs_attention"
                                  ? "No tasks need attention"
                                  : filter === "active"
                                    ? "No active tasks"
                                    : "No completed tasks"}
                        </h3>
                        <p className="text-muted-foreground mb-6">
                            {filter === "all"
                                ? "Launch a persona to get started"
                                : "Check back later or try a different filter"}
                        </p>
                        {filter === "all" && (
                            <button
                                onClick={() => navigate("/personas")}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                Browse Personas
                            </button>
                        )}
                    </div>
                )}

                {/* Instance List */}
                {!isLoadingInstances && !instancesError && filteredInstances.length > 0 && (
                    <div className="space-y-8">
                        {/* Needs Attention Section */}
                        {groupedInstances.needs_attention.length > 0 && (
                            <section>
                                <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400 mb-4">
                                    <AlertCircle className="w-4 h-4" />
                                    NEEDS ATTENTION ({groupedInstances.needs_attention.length})
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {groupedInstances.needs_attention.map((instance) => (
                                        <InstanceCard
                                            key={instance.id}
                                            instance={instance}
                                            onClick={() => handleInstanceClick(instance.id)}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Running Section */}
                        {groupedInstances.running.length > 0 && (
                            <section>
                                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-4">
                                    <Play className="w-4 h-4" />
                                    RUNNING ({groupedInstances.running.length})
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {groupedInstances.running.map((instance) => (
                                        <InstanceCard
                                            key={instance.id}
                                            instance={instance}
                                            onClick={() => handleInstanceClick(instance.id)}
                                            onCancel={() => handleCancel(instance.id)}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Completed Section */}
                        {groupedInstances.completed.length > 0 && (
                            <section>
                                <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-4">
                                    <CheckCircle className="w-4 h-4" />
                                    COMPLETED ({groupedInstances.completed.length})
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {groupedInstances.completed.map((instance) => (
                                        <InstanceCard
                                            key={instance.id}
                                            instance={instance}
                                            onClick={() => handleInstanceClick(instance.id)}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
