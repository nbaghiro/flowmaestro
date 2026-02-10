/**
 * usePersonaStream Hook
 *
 * React hook for streaming real-time updates from a persona instance execution.
 * Automatically connects when an instanceId is provided and disconnects on cleanup.
 */

import { useState, useEffect, useCallback } from "react";
import type { PersonaInstanceProgress } from "@flowmaestro/shared";
import { streamPersonaInstance } from "../lib/sse";

export interface PersonaDeliverable {
    id: string;
    name: string;
    type: string;
    description: string | null;
}

export type PersonaStreamStatus =
    | "disconnected"
    | "connecting"
    | "streaming"
    | "completed"
    | "failed";

export interface UsePersonaStreamResult {
    /** Whether the SSE connection is active */
    isConnected: boolean;
    /** Current status of the stream */
    status: PersonaStreamStatus;
    /** Current progress from the persona instance */
    progress: PersonaInstanceProgress | null;
    /** Deliverables received during streaming */
    deliverables: PersonaDeliverable[];
    /** Iteration count from the last progress update */
    iterationCount: number;
    /** Accumulated cost in credits */
    accumulatedCost: number;
    /** Error message if streaming failed */
    error: string | null;
    /** Completion details when persona finishes */
    completion: {
        reason: string;
        deliverableCount: number;
        durationSeconds: number;
        totalCost: number;
    } | null;
    /** Reset the stream state (useful when changing instances) */
    reset: () => void;
}

/**
 * Hook for streaming real-time updates from a persona instance.
 *
 * @param instanceId - The persona instance ID to stream events from, or null to disable
 * @returns Stream state and controls
 *
 * @example
 * ```tsx
 * const { isConnected, progress, deliverables, status } = usePersonaStream(instanceId);
 *
 * if (status === "streaming" && progress) {
 *     return <ProgressBar value={progress.percentage} label={progress.current_step_name} />;
 * }
 * ```
 */
export function usePersonaStream(instanceId: string | null): UsePersonaStreamResult {
    const [isConnected, setIsConnected] = useState(false);
    const [status, setStatus] = useState<PersonaStreamStatus>("disconnected");
    const [progress, setProgress] = useState<PersonaInstanceProgress | null>(null);
    const [deliverables, setDeliverables] = useState<PersonaDeliverable[]>([]);
    const [iterationCount, setIterationCount] = useState(0);
    const [accumulatedCost, setAccumulatedCost] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [completion, setCompletion] = useState<UsePersonaStreamResult["completion"]>(null);

    const reset = useCallback(() => {
        setIsConnected(false);
        setStatus("disconnected");
        setProgress(null);
        setDeliverables([]);
        setIterationCount(0);
        setAccumulatedCost(0);
        setError(null);
        setCompletion(null);
    }, []);

    useEffect(() => {
        if (!instanceId) {
            setStatus("disconnected");
            return;
        }

        setStatus("connecting");
        setError(null);

        const cleanup = streamPersonaInstance(instanceId, {
            onConnected: (data) => {
                setIsConnected(true);
                setStatus(
                    data.isTerminal
                        ? data.status === "completed"
                            ? "completed"
                            : "failed"
                        : "streaming"
                );

                if (data.progress) {
                    setProgress(data.progress);
                }
            },
            onProgress: (data) => {
                setProgress(data.progress);
                setIterationCount(data.iterationCount);
                setAccumulatedCost(data.accumulatedCost);
            },
            onDeliverable: (data) => {
                setDeliverables((prev) => {
                    // Avoid duplicates
                    if (prev.some((d) => d.id === data.deliverable.id)) {
                        return prev;
                    }
                    return [...prev, data.deliverable];
                });
            },
            onCompleted: (data) => {
                setStatus("completed");
                setIsConnected(false);
                setCompletion({
                    reason: data.completionReason,
                    deliverableCount: data.deliverableCount,
                    durationSeconds: data.durationSeconds,
                    totalCost: data.totalCost
                });
            },
            onFailed: (data) => {
                setStatus("failed");
                setIsConnected(false);
                setError(data.error);
            },
            onError: (err) => {
                setError(err);
                setIsConnected(false);
                // Don't change status to failed on connection errors - might just be network issue
            }
        });

        return cleanup;
    }, [instanceId]);

    return {
        isConnected,
        status,
        progress,
        deliverables,
        iterationCount,
        accumulatedCost,
        error,
        completion,
        reset
    };
}
