import type { JsonObject, JsonValue } from "@flowmaestro/shared";
import { redisEventBus } from "../../services/events/RedisEventBus";

/**
 * Activities for emitting orchestration events to WebSocket clients
 * These are side-effect activities called from the orchestrator workflow
 *
 * Events are published to Redis so they can be received by the API server
 * process (which hosts WebSocket connections), even though activities run
 * in the Temporal worker process.
 */

export interface EmitExecutionStartedInput {
    executionId: string;
    workflowName: string;
    totalNodes: number;
}

export interface EmitExecutionProgressInput {
    executionId: string;
    completed: number;
    total: number;
    percentage: number;
}

export interface EmitExecutionCompletedInput {
    executionId: string;
    outputs: JsonObject;
    duration: number;
}

export interface EmitExecutionFailedInput {
    executionId: string;
    error: string;
    failedNodeId?: string;
}

export interface EmitNodeStartedInput {
    executionId: string;
    nodeId: string;
    nodeName: string;
    nodeType: string;
}

export interface EmitNodeCompletedInput {
    executionId: string;
    nodeId: string;
    nodeName: string;
    nodeType: string;
    output: JsonValue;
    duration: number;
    metadata?: JsonObject;
}

export interface EmitNodeFailedInput {
    executionId: string;
    nodeId: string;
    nodeName: string;
    nodeType: string;
    error: string;
}

/**
 * Emit execution started event
 */
export async function emitExecutionStarted(input: EmitExecutionStartedInput): Promise<void> {
    const { executionId, workflowName, totalNodes } = input;
    await redisEventBus.publish("workflow:events:execution:started", {
        type: "execution:started",
        timestamp: Date.now(),
        executionId,
        workflowName,
        totalNodes
    });
}

/**
 * Emit execution progress event
 */
export async function emitExecutionProgress(input: EmitExecutionProgressInput): Promise<void> {
    const { executionId, completed, total, percentage } = input;
    await redisEventBus.publish("workflow:events:execution:progress", {
        type: "execution:progress",
        timestamp: Date.now(),
        executionId,
        completed,
        total,
        percentage
    });
}

/**
 * Emit execution completed event
 */
export async function emitExecutionCompleted(input: EmitExecutionCompletedInput): Promise<void> {
    const { executionId, outputs, duration } = input;
    await redisEventBus.publish("workflow:events:execution:completed", {
        type: "execution:completed",
        timestamp: Date.now(),
        executionId,
        status: "completed",
        outputs,
        duration
    });
}

/**
 * Emit execution failed event
 */
export async function emitExecutionFailed(input: EmitExecutionFailedInput): Promise<void> {
    const { executionId, error, failedNodeId } = input;
    await redisEventBus.publish("workflow:events:execution:failed", {
        type: "execution:failed",
        timestamp: Date.now(),
        executionId,
        status: "failed",
        error,
        ...(failedNodeId && { failedNodeId })
    });
}

/**
 * Emit node started event
 */
export async function emitNodeStarted(input: EmitNodeStartedInput): Promise<void> {
    const { executionId, nodeId, nodeName, nodeType } = input;
    await redisEventBus.publish("workflow:events:node:started", {
        type: "node:started",
        timestamp: Date.now(),
        executionId,
        nodeId,
        nodeName,
        nodeType
    });
}

/**
 * Emit node completed event
 */
export async function emitNodeCompleted(input: EmitNodeCompletedInput): Promise<void> {
    const { executionId, nodeId, nodeName, nodeType, output, duration, metadata } = input;
    await redisEventBus.publish("workflow:events:node:completed", {
        type: "node:completed",
        timestamp: Date.now(),
        executionId,
        nodeId,
        nodeName,
        nodeType,
        output,
        duration,
        ...(metadata && { metadata })
    });
}

/**
 * Emit node failed event
 */
export async function emitNodeFailed(input: EmitNodeFailedInput): Promise<void> {
    const { executionId, nodeId, nodeName, nodeType, error } = input;
    await redisEventBus.publish("workflow:events:node:failed", {
        type: "node:failed",
        timestamp: Date.now(),
        executionId,
        nodeId,
        nodeName,
        nodeType,
        error
    });
}
