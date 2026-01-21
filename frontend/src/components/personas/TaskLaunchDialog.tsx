import {
    X,
    Rocket,
    Clock,
    Coins,
    Bell,
    ChevronDown,
    ChevronUp,
    Zap,
    Globe,
    Database,
    FileText,
    Code,
    BarChart3,
    Mail,
    Search,
    Bot
} from "lucide-react";
import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { usePersonaStore } from "../../stores/personaStore";
import type { PersonaDefinition, CreatePersonaInstanceRequest } from "../../lib/api";

interface TaskLaunchDialogProps {
    persona: PersonaDefinition;
    isOpen: boolean;
    onClose: () => void;
}

// Map tool types to icons
const toolIcons: Record<string, React.ReactNode> = {
    web_search: <Globe className="w-4 h-4" />,
    knowledge_base: <Database className="w-4 h-4" />,
    file_create: <FileText className="w-4 h-4" />,
    code_execution: <Code className="w-4 h-4" />,
    data_analysis: <BarChart3 className="w-4 h-4" />,
    email: <Mail className="w-4 h-4" />,
    search: <Search className="w-4 h-4" />
};

// Friendly tool names
const toolNames: Record<string, string> = {
    web_search: "Web Research",
    knowledge_base: "Knowledge Bases",
    file_create: "File Creation",
    code_execution: "Code Execution",
    data_analysis: "Data Analysis",
    email: "Email Drafting",
    search: "Search & Discovery"
};

const durationOptions = [
    { value: 0.25, label: "15 minutes" },
    { value: 0.5, label: "30 minutes" },
    { value: 1, label: "1 hour" },
    { value: 2, label: "2 hours" }
];

export const TaskLaunchDialog: React.FC<TaskLaunchDialogProps> = ({ persona, isOpen, onClose }) => {
    const navigate = useNavigate();
    const { createInstance } = usePersonaStore();

    const [taskDescription, setTaskDescription] = useState("");
    const [maxDurationHours, setMaxDurationHours] = useState<number>(
        persona.default_max_duration_hours
    );
    const [maxCostCredits, setMaxCostCredits] = useState<number | undefined>(
        persona.default_max_cost_credits
    );
    const [notifyOnApproval, setNotifyOnApproval] = useState(true);
    const [notifyOnCompletion, setNotifyOnCompletion] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const handleSubmit = useCallback(
        async (e?: React.FormEvent | React.MouseEvent) => {
            e?.preventDefault();

            if (!taskDescription.trim()) {
                setError("Please provide a task description");
                return;
            }

            setIsSubmitting(true);
            setError(null);

            try {
                const request: CreatePersonaInstanceRequest = {
                    persona_slug: persona.slug,
                    task_description: taskDescription.trim(),
                    max_duration_hours: maxDurationHours,
                    max_cost_credits: maxCostCredits,
                    notification_config: {
                        on_approval_needed: notifyOnApproval,
                        on_completion: notifyOnCompletion
                    }
                };

                const instance = await createInstance(request);

                // Navigate to the instance view
                navigate(`/persona-instances/${instance.id}`);
                onClose();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to launch task");
            } finally {
                setIsSubmitting(false);
            }
        },
        [
            taskDescription,
            maxDurationHours,
            maxCostCredits,
            notifyOnApproval,
            notifyOnCompletion,
            persona.slug,
            createInstance,
            navigate,
            onClose
        ]
    );

    if (!isOpen) return null;

    // Get unique tool types for display
    const tools = persona.default_tools || [];
    const uniqueToolTypes = [...new Set(tools.map((t) => t.type))].slice(0, 5);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />

            {/* Dialog */}
            <div className="relative bg-card rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 p-2 hover:bg-muted rounded-full transition-colors z-10"
                >
                    <X className="w-5 h-5 text-muted-foreground" />
                </button>

                {/* Fixed Header */}
                <div className="relative bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 pb-6 border-b border-border">
                    <div className="flex items-start gap-5">
                        {/* Avatar */}
                        <div className="relative">
                            {persona.avatar_url ? (
                                <img
                                    src={persona.avatar_url}
                                    alt={persona.name}
                                    className="w-20 h-20 rounded-2xl border-2 border-primary/20"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center">
                                    <Bot className="w-10 h-10 text-primary" />
                                </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-card" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 pt-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-xl font-bold text-foreground">
                                    {persona.name}
                                </h2>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
                                    <Zap className="w-3 h-3" />
                                    Autonomous
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {persona.description}
                            </p>
                        </div>
                    </div>

                    {/* Capabilities Pills */}
                    {uniqueToolTypes.length > 0 && (
                        <div className="mt-5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                                Capabilities
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {uniqueToolTypes.map((toolType) => (
                                    <div
                                        key={toolType}
                                        className="flex items-center gap-1.5 px-2.5 py-1 bg-card border border-border rounded-full text-xs text-foreground"
                                    >
                                        {toolIcons[toolType] || <Zap className="w-4 h-4" />}
                                        <span>{toolNames[toolType] || toolType}</span>
                                    </div>
                                ))}
                                {tools.length > 5 && (
                                    <div className="px-2.5 py-1 bg-muted text-xs text-muted-foreground rounded-full">
                                        +{tools.length - 5} more
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {/* Error message */}
                        {error && (
                            <div className="p-3 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {/* Task Brief */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Brief your specialist
                            </label>
                            <p className="text-xs text-muted-foreground mb-3">
                                Describe what you need. Be specific about goals, scope, and any
                                constraints. {persona.name.split(" - ")[0]} will work autonomously
                                and deliver results.
                            </p>
                            <textarea
                                value={taskDescription}
                                onChange={(e) => setTaskDescription(e.target.value)}
                                placeholder={persona.example_tasks[0] || "Describe the task..."}
                                className="w-full min-h-[120px] px-4 py-3 bg-background border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Expected Deliverables */}
                        {persona.typical_deliverables.length > 0 && (
                            <div className="bg-muted/30 rounded-lg p-4">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                                    What you'll receive
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {persona.typical_deliverables
                                        .slice(0, 4)
                                        .map((deliverable, idx) => (
                                            <span
                                                key={idx}
                                                className="text-sm text-foreground bg-card px-3 py-1 rounded border border-border"
                                            >
                                                {deliverable.replace(/\s*\([^)]*\)/g, "").trim()}
                                            </span>
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* Advanced Options Toggle */}
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {showAdvanced ? (
                                <ChevronUp className="w-4 h-4" />
                            ) : (
                                <ChevronDown className="w-4 h-4" />
                            )}
                            Advanced options
                        </button>

                        {/* Advanced Options */}
                        {showAdvanced && (
                            <div className="space-y-4 pl-4 border-l-2 border-border">
                                {/* Execution Limits */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-2">
                                            <Clock className="w-4 h-4 text-muted-foreground" />
                                            Time limit
                                        </label>
                                        <select
                                            value={maxDurationHours}
                                            onChange={(e) =>
                                                setMaxDurationHours(Number(e.target.value))
                                            }
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            disabled={isSubmitting}
                                        >
                                            {durationOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-2">
                                            <Coins className="w-4 h-4 text-muted-foreground" />
                                            Budget limit
                                        </label>
                                        <input
                                            type="number"
                                            value={maxCostCredits || ""}
                                            onChange={(e) =>
                                                setMaxCostCredits(
                                                    e.target.value
                                                        ? Number(e.target.value)
                                                        : undefined
                                                )
                                            }
                                            placeholder="100 credits"
                                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            disabled={isSubmitting}
                                            min={1}
                                            max={10000}
                                        />
                                    </div>
                                </div>

                                {/* Notifications */}
                                <div>
                                    <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-3">
                                        <Bell className="w-4 h-4 text-muted-foreground" />
                                        Notifications
                                    </label>
                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={notifyOnApproval}
                                                onChange={(e) =>
                                                    setNotifyOnApproval(e.target.checked)
                                                }
                                                className="rounded border-border"
                                                disabled={isSubmitting}
                                            />
                                            When approval is needed
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={notifyOnCompletion}
                                                onChange={(e) =>
                                                    setNotifyOnCompletion(e.target.checked)
                                                }
                                                className="rounded border-border"
                                                disabled={isSubmitting}
                                            />
                                            When task completes
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                {/* Fixed Footer */}
                <div className="border-t border-border bg-card p-6 space-y-4">
                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                            disabled={isSubmitting || !taskDescription.trim()}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                    Starting...
                                </>
                            ) : (
                                <>
                                    <Rocket className="w-4 h-4" />
                                    Assign Task
                                </>
                            )}
                        </button>
                    </div>

                    {/* Trust indicator */}
                    <p className="text-xs text-center text-muted-foreground">
                        {persona.name.split(" - ")[0]} will work in the background. You'll be
                        notified of progress and can intervene anytime.
                    </p>
                </div>
            </div>
        </div>
    );
};
