/**
 * Heartbeat utilities for long-running Temporal activities
 *
 * Heartbeats serve two purposes:
 * 1. Let Temporal know the activity is still alive
 * 2. Provide progress information for monitoring
 */

import { Context } from "@temporalio/activity";
import { HEARTBEAT_INTERVALS } from "./config";
import { activityLogger } from "./logger";

/**
 * Progress details to include with heartbeat
 */
export interface HeartbeatProgress {
    /** Current step/phase name */
    step?: string;
    /** Percentage complete (0-100) */
    percentComplete?: number;
    /** Number of items processed */
    itemsProcessed?: number;
    /** Total items to process */
    totalItems?: number;
    /** Bytes processed (for streaming) */
    bytesProcessed?: number;
    /** Total bytes (for streaming) */
    totalBytes?: number;
    /** Custom message */
    message?: string;
    /** Any additional context */
    [key: string]: unknown;
}

/**
 * Heartbeat manager for long-running activities
 * Automatically sends heartbeats at regular intervals
 */
export class HeartbeatManager {
    private intervalId: NodeJS.Timeout | null = null;
    private lastProgress: HeartbeatProgress = {};
    private heartbeatCount = 0;
    private readonly context: Context;
    private readonly intervalMs: number;
    private readonly activityName: string;

    constructor(
        context: Context,
        activityName: string,
        intervalMs: number = HEARTBEAT_INTERVALS.DEFAULT
    ) {
        this.context = context;
        this.activityName = activityName;
        this.intervalMs = intervalMs;
    }

    /**
     * Start automatic heartbeating
     */
    start(initialProgress?: HeartbeatProgress): void {
        if (this.intervalId) {
            return; // Already started
        }

        if (initialProgress) {
            this.lastProgress = initialProgress;
        }

        // Send initial heartbeat
        this.sendHeartbeat();

        // Set up interval
        this.intervalId = setInterval(() => {
            this.sendHeartbeat();
        }, this.intervalMs);

        activityLogger.debug(`Heartbeat started for ${this.activityName}`, {
            nodeType: this.activityName,
            intervalMs: this.intervalMs
        });
    }

    /**
     * Update progress and send heartbeat immediately
     */
    update(progress: HeartbeatProgress): void {
        this.lastProgress = { ...this.lastProgress, ...progress };
        this.sendHeartbeat();
    }

    /**
     * Stop automatic heartbeating
     */
    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;

            activityLogger.debug(`Heartbeat stopped for ${this.activityName}`, {
                nodeType: this.activityName,
                heartbeatCount: this.heartbeatCount
            });
        }
    }

    /**
     * Send a heartbeat with current progress
     */
    private sendHeartbeat(): void {
        try {
            this.heartbeatCount++;
            this.context.heartbeat({
                ...this.lastProgress,
                heartbeatCount: this.heartbeatCount,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            // Heartbeat errors are usually non-fatal
            activityLogger.warn(`Heartbeat failed for ${this.activityName}`, {
                nodeType: this.activityName,
                heartbeatCount: this.heartbeatCount,
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }

    /**
     * Get current heartbeat count
     */
    getHeartbeatCount(): number {
        return this.heartbeatCount;
    }

    /**
     * Check if heartbeating is active
     */
    isActive(): boolean {
        return this.intervalId !== null;
    }
}

/**
 * Create a heartbeat manager with context from current activity
 * Safe to call even if not in an activity context (returns null)
 */
export function createHeartbeatManager(
    activityName: string,
    intervalMs?: number
): HeartbeatManager | null {
    try {
        const context = Context.current();
        return new HeartbeatManager(context, activityName, intervalMs);
    } catch {
        // Not in an activity context
        return null;
    }
}

/**
 * Simple heartbeat function for use in loops or callbacks
 * Returns true if heartbeat was sent, false if not in activity context
 */
export function sendHeartbeat(details?: HeartbeatProgress): boolean {
    try {
        const context = Context.current();
        context.heartbeat(details);
        return true;
    } catch {
        // Not in an activity context
        return false;
    }
}

/**
 * Check if the current activity has been cancelled
 * Useful for long-running operations to check for cancellation
 */
export async function isCancelled(): Promise<boolean> {
    try {
        const context = Context.current();
        // Check if cancellation has been triggered
        // context.cancelled is a promise that resolves when cancelled
        return Promise.race([context.cancelled.then(() => true), Promise.resolve(false)]);
    } catch {
        return false;
    }
}

/**
 * Interface for heartbeat operations (subset of HeartbeatManager)
 * Used for the dummy manager when not in activity context
 */
export interface HeartbeatOperations {
    start: (initialProgress?: HeartbeatProgress) => void;
    update: (progress: HeartbeatProgress) => void;
    stop: () => void;
    getHeartbeatCount: () => number;
    isActive: () => boolean;
}

/**
 * Get the cancellation signal for use with AbortController
 * Returns undefined if not in an activity context
 */
export function getCancellationSignal(): AbortSignal | undefined {
    try {
        const context = Context.current();
        return context.cancellationSignal;
    } catch {
        return undefined;
    }
}

/**
 * Wrapper for async operations that automatically handles heartbeating
 * Use for long-running async operations
 */
export async function withHeartbeat<T>(
    activityName: string,
    operation: (heartbeat: HeartbeatOperations) => Promise<T>,
    intervalMs?: number
): Promise<T> {
    const manager = createHeartbeatManager(activityName, intervalMs);

    if (!manager) {
        // Not in activity context, just run the operation with a no-op manager
        const dummyManager: HeartbeatOperations = {
            start: () => {},
            update: () => {},
            stop: () => {},
            getHeartbeatCount: () => 0,
            isActive: () => false
        };
        return operation(dummyManager);
    }

    manager.start();

    try {
        return await operation(manager);
    } finally {
        manager.stop();
    }
}

/**
 * Helper to create a progress callback for streaming operations
 * Returns a function that updates heartbeat with streaming progress
 */
export function createStreamingProgressCallback(
    manager: HeartbeatManager,
    totalItems?: number
): (itemsProcessed: number, message?: string) => void {
    return (itemsProcessed: number, message?: string) => {
        const progress: HeartbeatProgress = {
            itemsProcessed,
            step: "streaming"
        };

        if (totalItems !== undefined) {
            progress.totalItems = totalItems;
            progress.percentComplete = Math.round((itemsProcessed / totalItems) * 100);
        }

        if (message) {
            progress.message = message;
        }

        manager.update(progress);
    };
}
