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
    Trash2
} from "lucide-react";
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ConfirmDialog } from "../components/common/ConfirmDialog";
import { usePersonaStore } from "../stores/personaStore";
import type {
    PersonaCategory,
    PersonaInstanceMessage,
    PersonaInstanceDeliverable
} from "../lib/api";

const categoryIcons: Record<PersonaCategory, string> = {
    research: "🔍",
    content: "✍️",
    development: "💻",
    data: "📊",
    operations: "⚙️",
    business: "📈"
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
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    useEffect(() => {
        if (id) {
            fetchInstance(id);
        }
    }, [id, fetchInstance]);

    useEffect(() => {
        // Scroll to bottom when messages change
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [currentInstance?.messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !id || isSending) return;

        setIsSending(true);
        try {
            await sendMessage(id, message.trim());
            setMessage("");
        } catch (_error) {
            // Error handled in store
        } finally {
            setIsSending(false);
        }
    };

    const handleCancel = async () => {
        if (!id) return;
        try {
            await cancelInstance(id);
            setShowCancelDialog(false);
        } catch (_error) {
            // Error handled in store
        }
    };

    const handleComplete = async () => {
        if (!id) return;
        try {
            await completeInstance(id);
        } catch (_error) {
            // Error handled in store
        }
    };

    const handleDelete = async () => {
        if (!id) return;
        try {
            await deleteInstance(id);
            navigate("/persona-instances");
        } catch (_error) {
            // Error handled in store
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
                        <span>
                            Cost: {Math.round(currentInstance.accumulated_cost_credits || 0)}{" "}
                            credits
                        </span>
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
                                <input
                                    type="text"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Send a message to redirect or provide feedback..."
                                    className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    disabled={isSending}
                                />
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

                {/* Deliverables Panel */}
                <div className="w-80 border-l border-border bg-card overflow-y-auto">
                    <div className="p-4 border-b border-border">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Deliverables
                        </h3>
                    </div>
                    <div className="p-4">
                        {currentInstance.deliverables && currentInstance.deliverables.length > 0 ? (
                            <div className="space-y-3">
                                {currentInstance.deliverables.map(
                                    (deliverable: PersonaInstanceDeliverable, index: number) => (
                                        <div
                                            key={index}
                                            className="p-3 bg-muted rounded-lg hover:bg-muted/80 cursor-pointer transition-colors"
                                        >
                                            <p className="text-sm font-medium text-foreground truncate">
                                                {deliverable.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {deliverable.type}
                                            </p>
                                        </div>
                                    )
                                )}
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
        </div>
    );
};
