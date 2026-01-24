import {
    MessageSquare,
    FastForward,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Clock
} from "lucide-react";
import React, { useState, useCallback } from "react";
import { skipPersonaInstanceClarification } from "../../../lib/api";
import type { PersonaInstance } from "../../../lib/api";

interface ClarifyingPhaseUIProps {
    instance: PersonaInstance;
    onSkipped: (updatedInstance: PersonaInstance) => void;
    onError: (error: string) => void;
}

/**
 * UI component displayed during the clarifying phase
 * Shows clarification progress and skip option
 */
export const ClarifyingPhaseUI: React.FC<ClarifyingPhaseUIProps> = ({
    instance,
    onSkipped,
    onError
}) => {
    const [isSkipping, setIsSkipping] = useState(false);

    const handleSkipClarification = useCallback(async () => {
        if (isSkipping) return;

        setIsSkipping(true);
        try {
            const response = await skipPersonaInstanceClarification(instance.id);
            onSkipped(response.data);
        } catch (error) {
            onError(error instanceof Error ? error.message : "Failed to skip clarification");
        } finally {
            setIsSkipping(false);
        }
    }, [instance.id, isSkipping, onSkipped, onError]);

    const exchangeCount = instance.clarification_exchange_count || 0;
    const maxExchanges = instance.clarification_max_exchanges || 3;
    const remainingExchanges = Math.max(0, maxExchanges - exchangeCount);
    const isNearingLimit = remainingExchanges === 1;
    const isAtLimit = remainingExchanges === 0;

    return (
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
            {/* Header with status badge */}
            <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-primary/10 rounded-lg shrink-0 animate-pulse">
                        <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-foreground">
                                Clarifying Phase
                            </h3>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                <Clock className="w-3 h-3" />
                                {exchangeCount}/{maxExchanges} exchanges
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                            The persona is asking clarifying questions to better understand your
                            task. Answer below to get more accurate results.
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleSkipClarification}
                    disabled={isSkipping}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-background hover:bg-muted border border-border rounded-lg transition-colors disabled:opacity-50 shrink-0"
                >
                    {isSkipping ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Skipping...
                        </>
                    ) : (
                        <>
                            <FastForward className="w-4 h-4" />
                            Skip & Start
                        </>
                    )}
                </button>
            </div>

            {/* Progress indicator - always visible */}
            <div className="mt-4">
                <div className="flex gap-1.5">
                    {Array.from({ length: maxExchanges }).map((_, i) => (
                        <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                i < exchangeCount
                                    ? "bg-primary"
                                    : i === exchangeCount
                                      ? "bg-primary/40 animate-pulse"
                                      : "bg-primary/20"
                            }`}
                        />
                    ))}
                </div>
            </div>

            {/* Status message based on remaining exchanges */}
            {isAtLimit ? (
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3 py-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                        Maximum exchanges reached. The persona will proceed with the information
                        gathered.
                    </span>
                </div>
            ) : isNearingLimit ? (
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>
                        Last exchange - after this response, the persona will begin working on your
                        task.
                    </span>
                </div>
            ) : exchangeCount === 0 ? (
                <p className="mt-3 text-xs text-muted-foreground">
                    You can skip this phase anytime to start with the information already provided.
                </p>
            ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                    {remainingExchanges} exchange{remainingExchanges !== 1 ? "s" : ""} remaining
                    before auto-proceeding.
                </p>
            )}
        </div>
    );
};

export default ClarifyingPhaseUI;
