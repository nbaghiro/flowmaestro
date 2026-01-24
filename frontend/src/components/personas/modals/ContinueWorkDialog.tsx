import { X, Clock, Coins, ArrowRight, Loader2, History } from "lucide-react";
import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { continuePersonaInstance } from "../../../lib/api";
import type { PersonaInstance, PersonaCategory } from "../../../lib/api";

interface ContinueWorkDialogProps {
    instance: PersonaInstance & {
        persona?: {
            name: string;
            slug: string;
            title?: string;
            avatar_url: string | null;
            category: PersonaCategory;
        } | null;
    };
    isOpen: boolean;
    onClose: () => void;
}

const durationOptions = [
    { value: 0.25, label: "15 minutes" },
    { value: 0.5, label: "30 minutes" },
    { value: 1, label: "1 hour" },
    { value: 2, label: "2 hours" }
];

export const ContinueWorkDialog: React.FC<ContinueWorkDialogProps> = ({
    instance,
    isOpen,
    onClose
}) => {
    const navigate = useNavigate();

    const [additionalInstructions, setAdditionalInstructions] = useState("");
    const [maxDurationHours, setMaxDurationHours] = useState<number>(1);
    const [maxCostCredits, setMaxCostCredits] = useState<number | undefined>(50);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = useCallback(
        async (e?: React.FormEvent) => {
            e?.preventDefault();

            if (!additionalInstructions.trim()) {
                setError("Please provide additional instructions");
                return;
            }

            setIsSubmitting(true);
            setError(null);

            try {
                const response = await continuePersonaInstance(instance.id, {
                    additional_instructions: additionalInstructions,
                    max_duration_hours: maxDurationHours,
                    max_cost_credits: maxCostCredits
                });

                // Navigate to the new instance
                navigate(`/persona-instances/${response.data.id}`);
                onClose();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to continue work");
            } finally {
                setIsSubmitting(false);
            }
        },
        [instance.id, additionalInstructions, maxDurationHours, maxCostCredits, navigate, onClose]
    );

    if (!isOpen) return null;

    const personaName = instance.persona?.name || "Persona";
    const continuationNumber = (instance.continuation_count || 0) + 1;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />

            {/* Dialog */}
            <div className="relative bg-card rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 p-2 hover:bg-muted rounded-full transition-colors z-10"
                >
                    <X className="w-5 h-5 text-muted-foreground" />
                </button>

                {/* Header */}
                <div className="p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <History className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">Continue Work</h2>
                            <p className="text-sm text-muted-foreground">
                                This will be continuation #{continuationNumber}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Error message */}
                        {error && (
                            <div className="p-3 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {/* Previous Work Summary */}
                        <div className="bg-muted/30 rounded-lg p-4">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                                Previous Work
                            </p>
                            <p className="text-sm text-foreground font-medium mb-1">
                                {instance.task_title || "Untitled Task"}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-3">
                                {instance.task_description}
                            </p>
                            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                {instance.duration_seconds && (
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDuration(instance.duration_seconds)}
                                    </span>
                                )}
                                {instance.accumulated_cost_credits > 0 && (
                                    <span className="flex items-center gap-1">
                                        <Coins className="w-3 h-3" />
                                        {instance.accumulated_cost_credits} credits used
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Additional Instructions */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Additional Instructions <span className="text-red-500">*</span>
                            </label>
                            <p className="text-xs text-muted-foreground mb-3">
                                What else would you like {personaName.split(" - ")[0]} to do? They
                                will have access to all previous context and deliverables.
                            </p>
                            <textarea
                                value={additionalInstructions}
                                onChange={(e) => setAdditionalInstructions(e.target.value)}
                                placeholder="e.g., Now analyze customer reviews and add a section on customer satisfaction..."
                                className="w-full min-h-[120px] px-4 py-3 bg-background border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Limits */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-2">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    Time limit
                                </label>
                                <select
                                    value={maxDurationHours}
                                    onChange={(e) => setMaxDurationHours(Number(e.target.value))}
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
                                            e.target.value ? Number(e.target.value) : undefined
                                        )
                                    }
                                    placeholder="50 credits"
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    disabled={isSubmitting}
                                    min={1}
                                    max={10000}
                                />
                            </div>
                        </div>

                        {/* Info note */}
                        <p className="text-xs text-muted-foreground">
                            The persona will have full access to the previous conversation and any
                            deliverables created.
                        </p>
                    </form>
                </div>

                {/* Footer */}
                <div className="border-t border-border p-6 flex gap-3">
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
                        disabled={isSubmitting || !additionalInstructions.trim()}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Starting...
                            </>
                        ) : (
                            <>
                                <ArrowRight className="w-4 h-4" />
                                Continue Work
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
}
