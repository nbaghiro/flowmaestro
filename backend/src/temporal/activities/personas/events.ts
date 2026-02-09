/**
 * Persona Event Activities
 *
 * Activities for emitting real-time SSE events during persona execution.
 * Events are published to Redis and forwarded to connected SSE clients.
 */

import type { PersonaInstanceProgress, DeliverableType } from "@flowmaestro/shared";
import { redisEventBus } from "../../../services/events/RedisEventBus";
import { activityLogger } from "../../core";

// ============================================================================
// Event Input Types
// ============================================================================

export interface EmitPersonaStartedInput {
    instanceId: string;
    personaName: string;
    taskTitle: string | null;
}

export interface EmitPersonaProgressInput {
    instanceId: string;
    progress: PersonaInstanceProgress;
    iterationCount: number;
    accumulatedCost: number;
}

export interface EmitPersonaDeliverableInput {
    instanceId: string;
    deliverable: {
        id: string;
        name: string;
        type: DeliverableType;
        description: string | null;
    };
}

export interface EmitPersonaCompletedInput {
    instanceId: string;
    completionReason: string;
    deliverableCount: number;
    durationSeconds: number;
    totalCost: number;
}

export interface EmitPersonaFailedInput {
    instanceId: string;
    error: string;
}

// ============================================================================
// Event Activities
// ============================================================================

/**
 * Emit event when persona instance starts execution
 */
export async function emitPersonaStarted(input: EmitPersonaStartedInput): Promise<void> {
    activityLogger.debug("Emitting persona started event", { instanceId: input.instanceId });

    await redisEventBus.publishJson(`persona:${input.instanceId}:events`, {
        type: "persona:instance:started",
        timestamp: Date.now(),
        instanceId: input.instanceId,
        personaName: input.personaName,
        taskTitle: input.taskTitle
    });
}

/**
 * Emit event when persona instance makes progress
 */
export async function emitPersonaProgress(input: EmitPersonaProgressInput): Promise<void> {
    activityLogger.debug("Emitting persona progress event", {
        instanceId: input.instanceId,
        percentage: input.progress.percentage
    });

    await redisEventBus.publishJson(`persona:${input.instanceId}:events`, {
        type: "persona:instance:progress",
        timestamp: Date.now(),
        instanceId: input.instanceId,
        progress: input.progress,
        iterationCount: input.iterationCount,
        accumulatedCost: input.accumulatedCost
    });
}

/**
 * Emit event when persona instance creates a deliverable
 */
export async function emitPersonaDeliverable(input: EmitPersonaDeliverableInput): Promise<void> {
    activityLogger.debug("Emitting persona deliverable event", {
        instanceId: input.instanceId,
        deliverableName: input.deliverable.name
    });

    await redisEventBus.publishJson(`persona:${input.instanceId}:events`, {
        type: "persona:instance:deliverable",
        timestamp: Date.now(),
        instanceId: input.instanceId,
        deliverable: input.deliverable
    });
}

/**
 * Emit event when persona instance completes successfully
 */
export async function emitPersonaCompleted(input: EmitPersonaCompletedInput): Promise<void> {
    activityLogger.info("Emitting persona completed event", {
        instanceId: input.instanceId,
        completionReason: input.completionReason,
        deliverableCount: input.deliverableCount
    });

    await redisEventBus.publishJson(`persona:${input.instanceId}:events`, {
        type: "persona:instance:completed",
        timestamp: Date.now(),
        instanceId: input.instanceId,
        completionReason: input.completionReason,
        deliverableCount: input.deliverableCount,
        durationSeconds: input.durationSeconds,
        totalCost: input.totalCost
    });
}

/**
 * Emit event when persona instance fails
 */
export async function emitPersonaFailed(input: EmitPersonaFailedInput): Promise<void> {
    activityLogger.warn("Emitting persona failed event", {
        instanceId: input.instanceId,
        errorMessage: input.error
    });

    await redisEventBus.publishJson(`persona:${input.instanceId}:events`, {
        type: "persona:instance:failed",
        timestamp: Date.now(),
        instanceId: input.instanceId,
        error: input.error
    });
}
