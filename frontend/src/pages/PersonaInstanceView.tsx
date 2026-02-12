import {
    ArrowLeft,
    Clock,
    DollarSign,
    Send,
    XCircle,
    CheckCircle,
    AlertCircle,
    Loader2,
    FileText,
    Trash2,
    ListChecks,
    Circle,
    CheckCircle2,
    SkipForward,
    ArrowRight,
    Wifi,
    WifiOff
} from "lucide-react";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { DeliverableCard } from "../components/personas/cards/DeliverableCard";
import { ClarifyingPhaseUI } from "../components/personas/clarification";
import { ContinueWorkDialog } from "../components/personas/modals/ContinueWorkDialog";
import { usePersonaStream } from "../hooks/usePersonaStream";
import { useToast } from "../hooks/useToast";
import { PersonaEvents } from "../lib/analytics";
import { usePersonaStore } from "../stores/personaStore";
import type {
    PersonaCategory,
    PersonaInstanceMessage,
    PersonaProgressStep,
    ProgressStepStatus
} from "../lib/api";

const categoryIcons: Record<PersonaCategory, string> = {
    research: "🔍",
    content: "✍️",
    development: "💻",
    data: "📊",
    operations: "⚙️",
    business: "📈",
    proposals: "📝"
};

const statusConfig: Record<
    string,
    {
        label: string;
        color: string;
        bgColor: string;
    }
> = {
    initializing: {
        label: "Initializing",
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-100 dark:bg-blue-900/30"
    },
    clarifying: {
        label: "Clarifying",
        color: "text-purple-600 dark:text-purple-400",
        bgColor: "bg-purple-100 dark:bg-purple-900/30"
    },
    running: {
        label: "Running",
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-900/30"
    },
    waiting_approval: {
        label: "Waiting Approval",
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-100 dark:bg-amber-900/30"
    },
    completed: {
        label: "Completed",
        color: "text-emerald-600 dark:text-emerald-400",
        bgColor: "bg-emerald-100 dark:bg-emerald-900/30"
    },
    cancelled: {
        label: "Cancelled",
        color: "text-slate-600 dark:text-slate-400",
        bgColor: "bg-slate-100 dark:bg-slate-900/30"
    },
    failed: {
        label: "Failed",
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-100 dark:bg-red-900/30"
    },
    timeout: {
        label: "Timed Out",
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-100 dark:bg-orange-900/30"
    }
};

function formatDuration(seconds: number | null | undefined): string {
    if (!seconds) return "0m";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

function formatDateTime(date: string): string {
    return new Date(date).toLocaleString();
}

// Step status icon mapping
const stepStatusConfig: Record<
    ProgressStepStatus,
    { icon: React.ReactNode; color: string; bgColor: string }
> = {
    pending: {
        icon: <Circle className="w-4 h-4" />,
        color: "text-muted-foreground",
        bgColor: "bg-muted"
    },
    in_progress: {
        icon: <Loader2 className="w-4 h-4 animate-spin" />,
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-100 dark:bg-blue-900/30"
    },
    completed: {
        icon: <CheckCircle2 className="w-4 h-4" />,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-900/30"
    },
    skipped: {
        icon: <SkipForward className="w-4 h-4" />,
        color: "text-slate-500",
        bgColor: "bg-slate-100 dark:bg-slate-900/30"
    }
};

export const PersonaInstanceView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const {
        currentInstance,
        isLoadingInstances,
        instancesError,
        fetchInstance,
        sendMessage,
        cancelInstance,
        completeInstance,
        deleteInstance
    } = usePersonaStore();

    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
    const [sendError, setSendError] = useState<string | null>(null);
    const [pendingMessage, setPendingMessage] = useState<string | null>(null);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showContinueDialog, setShowContinueDialog] = useState(false);
    const [clarificationError, setClarificationError] = useState<string | null>(null);

    const toast = useToast();

    // Determine if instance is active (for streaming)
    const instanceIsActive = currentInstance
        ? ["initializing", "clarifying", "running", "waiting_approval"].includes(
              currentInstance.status
          )
        : false;

    // Real-time streaming for active instances
    const {
        isConnected,
        progress: streamedProgress,
        deliverables: streamedDeliverables,
        status: streamStatus,
        accumulatedCost: streamedCost,
        error: streamError
    } = usePersonaStream(instanceIsActive && id ? id : null);

    const hasTrackedView = useRef(false);

    // Track instance view
    useEffect(() => {
        if (id && !hasTrackedView.current) {
            PersonaEvents.instanceViewed({ instanceId: id });
            hasTrackedView.current = true;
        }
    }, [id]);

    useEffect(() => {
        if (id) {
            fetchInstance(id);
        }
    }, [id, fetchInstance]);

    // Auto-refresh when stream indicates completion or failure
    useEffect(() => {
        if ((streamStatus === "completed" || streamStatus === "failed") && id) {
            fetchInstance(id);
        }
    }, [streamStatus, id, fetchInstance]);

    // Merge streamed progress with instance progress (stream takes priority when active)
    const effectiveProgress = useMemo(() => {
        if (instanceIsActive && streamedProgress) {
            return streamedProgress;
        }
        return currentInstance?.progress ?? null;
    }, [instanceIsActive, streamedProgress, currentInstance?.progress]);

    // Effective cost (prefer streamed when active)
    const effectiveCost = useMemo(() => {
        if (instanceIsActive && streamedCost > 0) {
            return streamedCost;
        }
        return currentInstance?.accumulated_cost_credits ?? 0;
    }, [instanceIsActive, streamedCost, currentInstance?.accumulated_cost_credits]);

    // Track streamed deliverables count to trigger refetch when new ones arrive
    const lastDeliverableCount = useRef(0);
    useEffect(() => {
        if (streamedDeliverables.length > lastDeliverableCount.current && id) {
            lastDeliverableCount.current = streamedDeliverables.length;
            // Refetch to get full deliverable data
            fetchInstance(id);
        }
    }, [streamedDeliverables.length, id, fetchInstance]);

    useEffect(() => {
        // Scroll to bottom when messages change or pending message appears
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [currentInstance?.messages, pendingMessage]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !id || isSending) return;

        const messageToSend = message.trim();
        setIsSending(true);
        setSendStatus("sending");
        setSendError(null);
        setPendingMessage(messageToSend);
        setMessage("");

        try {
            await sendMessage(id, messageToSend);
            PersonaEvents.instanceMessageSent({ instanceId: id });
            setSendStatus("sent");
            setPendingMessage(null);
            // Clear "sent" status after 2 seconds
            setTimeout(() => setSendStatus("idle"), 2000);
        } catch (error) {
            setSendStatus("error");
            setSendError(error instanceof Error ? error.message : "Failed to send message");
            // Restore message so user can retry
            setMessage(messageToSend);
            setPendingMessage(null);
        } finally {
            setIsSending(false);
        }
    };

    const handleCancel = async () => {
        if (!id) return;
        try {
            await cancelInstance(id);
            PersonaEvents.instanceCancelled({ instanceId: id });
            setShowCancelDialog(false);
            toast.success("Task cancelled");
        } catch (_error) {
            toast.error("Failed to cancel task");
        }
    };

    const handleComplete = async () => {
        if (!id) return;
        try {
            await completeInstance(id);
            // Calculate duration in days
            const durationDays = currentInstance
                ? Math.ceil(
                      (Date.now() - new Date(currentInstance.created_at).getTime()) /
                          (1000 * 60 * 60 * 24)
                  )
                : 0;
            PersonaEvents.instanceCompleted({ instanceId: id, durationDays });
            toast.success("Task marked as complete");
        } catch (_error) {
            toast.error("Failed to complete task");
        }
    };

    const handleDelete = async () => {
        if (!id) return;
        try {
            await deleteInstance(id);
            toast.success("Task deleted");
            navigate("/persona-instances");
        } catch (_error) {
            toast.error("Failed to delete task");
        }
    };

    if (isLoadingInstances && !currentInstance) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    if (instancesError) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Error loading task</h3>
                    <p className="text-muted-foreground mb-4">{instancesError}</p>
                    <button
                        onClick={() => navigate("/persona-instances")}
                        className="text-primary hover:underline"
                    >
                        Back to tasks
                    </button>
                </div>
            </div>
        );
    }

    if (!currentInstance) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Task not found</h3>
                    <button
                        onClick={() => navigate("/persona-instances")}
                        className="text-primary hover:underline"
                    >
                        Back to tasks
                    </button>
                </div>
            </div>
        );
    }

    const status = statusConfig[currentInstance.status] || statusConfig.running;
    const isActive = ["initializing", "clarifying", "running", "waiting_approval"].includes(
        currentInstance.status
    );
    const isTerminal = ["completed", "cancelled", "failed", "timeout"].includes(
        currentInstance.status
    );

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="border-b border-border bg-card px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate("/persona-instances")}
                            className="p-2 hover:bg-muted rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                        </button>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">
                                {currentInstance.persona?.avatar_url ? (
                                    <img
                                        src={currentInstance.persona.avatar_url}
                                        alt={currentInstance.persona.name}
                                        className="w-10 h-10 rounded-full"
                                    />
                                ) : currentInstance.persona?.category ? (
                                    categoryIcons[currentInstance.persona.category]
                                ) : (
                                    "🤖"
                                )}
                            </span>
                            <div>
                                <h1 className="font-semibold text-foreground">
                                    {currentInstance.persona?.name || "Unknown Persona"}
                                </h1>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                    {currentInstance.task_title || currentInstance.task_description}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Connection status indicator */}
                        {isActive && (
                            <span
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                                    isConnected
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                }`}
                                title={isConnected ? "Receiving live updates" : "Connecting..."}
                            >
                                {isConnected ? (
                                    <Wifi className="w-3 h-3" />
                                ) : (
                                    <WifiOff className="w-3 h-3" />
                                )}
                                {isConnected ? "Live" : "Connecting"}
                            </span>
                        )}
                        <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.color}`}
                        >
                            {currentInstance.status === "running" && (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            )}
                            {status.label}
                        </span>
                        {isActive && (
                            <button
                                onClick={() => setShowCancelDialog(true)}
                                className="px-3 py-1.5 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                        {currentInstance.status === "completed" && (
                            <button
                                onClick={handleComplete}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Mark Complete
                            </button>
                        )}
                        {isTerminal && (
                            <button
                                onClick={() => setShowContinueDialog(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/10 transition-colors"
                            >
                                <ArrowRight className="w-4 h-4" />
                                Continue Work
                            </button>
                        )}
                        {isTerminal && (
                            <button
                                onClick={() => setShowDeleteDialog(true)}
                                className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Metrics Bar */}
                <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>Duration: {formatDuration(currentInstance.duration_seconds)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <DollarSign className="w-4 h-4" />
                        <span>Cost: {Math.round(effectiveCost)} credits</span>
                    </div>
                    {currentInstance.max_duration_hours && (
                        <div className="text-muted-foreground/70">
                            Max: {currentInstance.max_duration_hours}h
                        </div>
                    )}
                    {currentInstance.max_cost_credits && (
                        <div className="text-muted-foreground/70">
                            Max: {currentInstance.max_cost_credits} credits
                        </div>
                    )}
                    <div className="ml-auto text-muted-foreground/70">
                        Started: {formatDateTime(currentInstance.created_at)}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Conversation Panel */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {/* Clarifying Phase UI */}
                        {currentInstance.status === "clarifying" && (
                            <ClarifyingPhaseUI
                                instance={currentInstance}
                                onSkipped={() => {
                                    setClarificationError(null);
                                    if (id) fetchInstance(id);
                                }}
                                onError={setClarificationError}
                            />
                        )}

                        {/* Clarification Error */}
                        {clarificationError && (
                            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-lg text-sm">
                                {clarificationError}
                            </div>
                        )}

                        {/* Initial Task Description */}
                        <div className="flex gap-3">
                            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center flex-shrink-0">
                                You
                            </div>
                            <div className="flex-1 bg-muted rounded-lg p-4">
                                <p className="text-sm text-foreground whitespace-pre-wrap">
                                    {currentInstance.task_description}
                                </p>
                                {currentInstance.additional_context &&
                                    Object.keys(currentInstance.additional_context).length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-border">
                                            <p className="text-xs text-muted-foreground">
                                                Additional context provided
                                            </p>
                                        </div>
                                    )}
                            </div>
                        </div>

                        {/* Conversation Messages - would come from thread */}
                        {currentInstance.messages?.map(
                            (msg: PersonaInstanceMessage, index: number) => (
                                <div key={index} className="flex gap-3">
                                    {msg.role === "user" ? (
                                        <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center flex-shrink-0 text-xs">
                                            You
                                        </div>
                                    ) : (
                                        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-lg">
                                            {currentInstance.persona?.avatar_url ? (
                                                <img
                                                    src={currentInstance.persona.avatar_url}
                                                    alt=""
                                                    className="w-8 h-8 rounded-full"
                                                />
                                            ) : currentInstance.persona?.category ? (
                                                categoryIcons[currentInstance.persona.category]
                                            ) : (
                                                "🤖"
                                            )}
                                        </div>
                                    )}
                                    <div
                                        className={`flex-1 rounded-lg p-4 ${
                                            msg.role === "user"
                                                ? "bg-muted"
                                                : "bg-card border border-border"
                                        }`}
                                    >
                                        <p className="text-sm text-foreground whitespace-pre-wrap">
                                            {msg.content}
                                        </p>
                                    </div>
                                </div>
                            )
                        )}

                        {/* Pending Message (optimistic) */}
                        {pendingMessage && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center flex-shrink-0 text-xs">
                                    You
                                </div>
                                <div className="flex-1 bg-muted rounded-lg p-4 opacity-70">
                                    <p className="text-sm text-foreground whitespace-pre-wrap">
                                        {pendingMessage}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        <span>Sending...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Send Error */}
                        {sendStatus === "error" && sendError && (
                            <div className="flex items-center gap-2 p-3 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-lg text-sm">
                                <XCircle className="w-4 h-4 flex-shrink-0" />
                                <span>Failed to send message: {sendError}</span>
                            </div>
                        )}

                        {/* Task Failed Error */}
                        {(currentInstance.status === "failed" ||
                            currentInstance.status === "timeout") &&
                            streamError && (
                                <div className="p-4 bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="font-medium text-red-800 dark:text-red-300">
                                                Task{" "}
                                                {currentInstance.status === "timeout"
                                                    ? "Timed Out"
                                                    : "Failed"}
                                            </h4>
                                            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                                                {streamError}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                        {/* Status Message */}
                        {isActive && (
                            <div className="flex items-center justify-center py-4">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>
                                        {currentInstance.status === "waiting_approval"
                                            ? "Waiting for your approval..."
                                            : "Working on your task..."}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    {isActive && (
                        <form
                            onSubmit={handleSendMessage}
                            className="border-t border-border p-4 bg-card"
                        >
                            <div className="flex gap-3">
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={message}
                                        onChange={(e) => {
                                            setMessage(e.target.value);
                                            // Clear error when user starts typing
                                            if (sendStatus === "error") {
                                                setSendStatus("idle");
                                                setSendError(null);
                                            }
                                        }}
                                        placeholder="Send a message to redirect or provide feedback..."
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        disabled={isSending}
                                    />
                                    {/* Delivery status indicator */}
                                    {sendStatus === "sent" && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            <span>Delivered</span>
                                        </div>
                                    )}
                                </div>
                                <button
                                    type="submit"
                                    disabled={!message.trim() || isSending}
                                    className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Sidebar - Progress & Deliverables */}
                <div className="w-80 border-l border-border bg-card overflow-y-auto">
                    {/* Progress Section */}
                    <div className="border-b border-border">
                        <div className="p-4 border-b border-border">
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                                <ListChecks className="w-4 h-4" />
                                Progress
                            </h3>
                        </div>
                        <div className="p-4">
                            {/* Progress Bar */}
                            {effectiveProgress && (
                                <div className="mb-4">
                                    <div className="flex items-center justify-between text-sm mb-1.5">
                                        <span className="text-muted-foreground">
                                            Step {effectiveProgress.current_step} of{" "}
                                            {effectiveProgress.total_steps}
                                        </span>
                                        <span className="font-medium text-foreground">
                                            {effectiveProgress.percentage}%
                                        </span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full transition-all duration-500"
                                            style={{
                                                width: `${effectiveProgress.percentage}%`
                                            }}
                                        />
                                    </div>
                                    {effectiveProgress.message && (
                                        <p className="text-xs text-muted-foreground mt-2 italic">
                                            {effectiveProgress.message}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Step List */}
                            {effectiveProgress?.steps && effectiveProgress.steps.length > 0 ? (
                                <div className="space-y-2">
                                    {effectiveProgress.steps.map((step: PersonaProgressStep) => {
                                        const config =
                                            stepStatusConfig[step.status] ||
                                            stepStatusConfig.pending;
                                        return (
                                            <div
                                                key={step.index}
                                                className={`flex items-start gap-2 p-2 rounded-lg ${
                                                    step.status === "in_progress"
                                                        ? config.bgColor
                                                        : ""
                                                }`}
                                            >
                                                <span className={`mt-0.5 ${config.color}`}>
                                                    {config.icon}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <p
                                                        className={`text-sm ${
                                                            step.status === "completed"
                                                                ? "text-muted-foreground line-through"
                                                                : step.status === "in_progress"
                                                                  ? "text-foreground font-medium"
                                                                  : "text-muted-foreground"
                                                        }`}
                                                    >
                                                        {step.title}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : isActive ? (
                                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                                    <p className="text-sm">Processing...</p>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    {isTerminal ? "Task completed" : "Waiting to start"}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Deliverables Section */}
                    <div className="p-4 border-b border-border">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Deliverables
                            {currentInstance.deliverables &&
                                currentInstance.deliverables.length > 0 && (
                                    <span className="ml-auto text-xs text-muted-foreground font-normal">
                                        {currentInstance.deliverables.length}
                                    </span>
                                )}
                        </h3>
                    </div>
                    <div className="p-4">
                        {currentInstance.deliverables && currentInstance.deliverables.length > 0 ? (
                            <div className="space-y-3">
                                {currentInstance.deliverables.map((deliverable) => (
                                    <DeliverableCard
                                        key={deliverable.id}
                                        deliverable={deliverable}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                No deliverables yet
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Cancel Dialog */}
            <ConfirmDialog
                isOpen={showCancelDialog}
                onClose={() => setShowCancelDialog(false)}
                onConfirm={handleCancel}
                title="Cancel Task"
                message="Are you sure you want to cancel this task? The persona will stop working and any unsaved progress may be lost."
                confirmText="Cancel Task"
                cancelText="Keep Running"
                variant="danger"
            />

            {/* Delete Dialog */}
            <ConfirmDialog
                isOpen={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                onConfirm={handleDelete}
                title="Delete Task"
                message="Are you sure you want to delete this task? This action cannot be undone."
                confirmText="Delete"
                cancelText="Keep"
                variant="danger"
            />

            {/* Continue Work Dialog */}
            <ContinueWorkDialog
                instance={currentInstance}
                isOpen={showContinueDialog}
                onClose={() => setShowContinueDialog(false)}
            />
        </div>
    );
};
