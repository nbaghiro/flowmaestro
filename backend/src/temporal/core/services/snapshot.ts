/**
 * Snapshot Management
 *
 * Workflow snapshots for pause/resume functionality.
 * Provides serialization, validation, and persistence of execution state.
 */

import { v4 as uuidv4 } from "uuid";
import type { JsonObject, JsonValue, NodeExecutionStatus } from "@flowmaestro/shared";
import { db } from "../../../storage/database";
import { createSharedMemory } from "./context";
import type {
    ExecutionQueueState,
    LoopIterationState,
    ParallelBranchState,
    ContextSnapshot
} from "../types";

// ============================================================================
// SNAPSHOT TYPES
// ============================================================================

export type SnapshotType = "checkpoint" | "pause" | "failure" | "final";

export interface SnapshotNodeState {
    nodeId: string;
    status: NodeExecutionStatus;
    output?: JsonObject;
    error?: string;
    startedAt?: number;
    completedAt?: number;
    retryCount: number;
}

export interface SnapshotLoopState {
    loopNodeId: string;
    currentIndex: number;
    totalItems: number;
    currentItem?: JsonValue;
    accumulatedResults: JsonValue[];
    isComplete: boolean;
}

export interface SnapshotParallelState {
    parallelNodeId: string;
    branchIndex: number;
    totalBranches: number;
    branchId: string;
    currentItem?: JsonValue;
    isComplete: boolean;
}

export interface SnapshotPauseContext {
    reason: string;
    pausedAtNodeId: string;
    pausedAt: number;
    resumeTrigger?: "manual" | "timeout" | "webhook" | "signal";
    timeoutMs?: number;
    preservedData?: JsonObject;
}

export interface WorkflowSnapshot {
    id: string;
    executionId: string;
    workflowId: string;
    userId: string;
    snapshotType: SnapshotType;
    schemaVersion: number;
    completedNodes: SnapshotNodeState[];
    pendingNodes: SnapshotNodeState[];
    executingNodes: SnapshotNodeState[];
    failedNodes: SnapshotNodeState[];
    skippedNodes: SnapshotNodeState[];
    nodeOutputs: Record<string, JsonObject>;
    workflowVariables: Record<string, JsonValue>;
    inputs: JsonObject;
    loopStates: SnapshotLoopState[];
    parallelStates: SnapshotParallelState[];
    pauseContext?: SnapshotPauseContext;
    createdAt: number;
    progress: number;
    totalSizeBytes: number;
}

export interface CreateSnapshotOptions {
    type: SnapshotType;
    pauseContext?: SnapshotPauseContext;
    maxSizeBytes?: number;
    compressOutputs?: boolean;
}

export interface LoadSnapshotOptions {
    validateSchema?: boolean;
    decompressOutputs?: boolean;
}

export interface SnapshotValidationResult {
    valid: boolean;
    errors?: string[];
    warnings?: string[];
}

export interface WorkflowSnapshotRecord {
    id: string;
    execution_id: string;
    workflow_id: string;
    user_id: string;
    snapshot_type: SnapshotType;
    schema_version: number;
    completed_nodes: string;
    pending_nodes: string;
    executing_nodes: string;
    failed_nodes: string;
    skipped_nodes: string;
    node_outputs: string;
    workflow_variables: string;
    inputs: string;
    loop_states: string;
    parallel_states: string;
    pause_context: string | null;
    progress: number;
    total_size_bytes: number;
    created_at: Date;
}

export const SNAPSHOT_SCHEMA_VERSION = 1;

// ============================================================================
// SNAPSHOT MANAGER
// ============================================================================

export function createSnapshot(
    executionId: string,
    workflowId: string,
    userId: string,
    queueState: ExecutionQueueState,
    context: ContextSnapshot,
    loopStates: Map<string, LoopIterationState>,
    parallelStates: Map<string, ParallelBranchState>,
    options: CreateSnapshotOptions
): WorkflowSnapshot {
    const completedNodes: SnapshotNodeState[] = [];
    const pendingNodes: SnapshotNodeState[] = [];
    const executingNodes: SnapshotNodeState[] = [];
    const failedNodes: SnapshotNodeState[] = [];
    const skippedNodes: SnapshotNodeState[] = [];

    for (const [nodeId, state] of queueState.nodeStates) {
        const snapshotState: SnapshotNodeState = {
            nodeId,
            status: state.status,
            output: state.output,
            error: state.error,
            startedAt: state.startedAt,
            completedAt: state.completedAt,
            retryCount: state.retryCount
        };

        switch (state.status) {
            case "completed":
                completedNodes.push(snapshotState);
                break;
            case "pending":
            case "ready":
                pendingNodes.push(snapshotState);
                break;
            case "executing":
                executingNodes.push(snapshotState);
                break;
            case "failed":
                failedNodes.push(snapshotState);
                break;
            case "skipped":
                skippedNodes.push(snapshotState);
                break;
        }
    }

    const nodeOutputs: Record<string, JsonObject> = {};
    for (const [nodeId, output] of context.nodeOutputs) {
        nodeOutputs[nodeId] = output;
    }

    const workflowVariables: Record<string, JsonValue> = {};
    for (const [key, value] of context.workflowVariables) {
        workflowVariables[key] = value;
    }

    const snapshotLoopStates: SnapshotLoopState[] = [];
    for (const [loopNodeId, state] of loopStates) {
        const totalItems = state.total ?? 0;
        snapshotLoopStates.push({
            loopNodeId,
            currentIndex: state.index,
            totalItems,
            currentItem: state.item,
            accumulatedResults: state.results,
            isComplete: state.index >= totalItems
        });
    }

    const snapshotParallelStates: SnapshotParallelState[] = [];
    for (const [_key, state] of parallelStates) {
        snapshotParallelStates.push({
            parallelNodeId: state.branchId.split("-")[0],
            branchIndex: state.index,
            totalBranches: 0,
            branchId: state.branchId,
            currentItem: state.currentItem,
            isComplete: false
        });
    }

    const total = queueState.nodeStates.size;
    const processed = completedNodes.length + failedNodes.length + skippedNodes.length;
    const progress = total > 0 ? Math.round((processed / total) * 100) : 0;

    const totalSizeBytes = estimateSnapshotSize({
        nodeOutputs,
        workflowVariables,
        inputs: context.inputs
    });

    return {
        id: uuidv4(),
        executionId,
        workflowId,
        userId,
        snapshotType: options.type,
        schemaVersion: SNAPSHOT_SCHEMA_VERSION,
        completedNodes,
        pendingNodes,
        executingNodes,
        failedNodes,
        skippedNodes,
        nodeOutputs,
        workflowVariables,
        inputs: context.inputs,
        loopStates: snapshotLoopStates,
        parallelStates: snapshotParallelStates,
        pauseContext: options.pauseContext,
        createdAt: Date.now(),
        progress,
        totalSizeBytes
    };
}

export function validateSnapshot(snapshot: WorkflowSnapshot): SnapshotValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!snapshot.id) errors.push("Missing snapshot ID");
    if (!snapshot.executionId) errors.push("Missing execution ID");
    if (!snapshot.workflowId) errors.push("Missing workflow ID");
    if (!snapshot.userId) errors.push("Missing user ID");

    if (snapshot.schemaVersion > SNAPSHOT_SCHEMA_VERSION) {
        errors.push(
            `Schema version ${snapshot.schemaVersion} is newer than supported ${SNAPSHOT_SCHEMA_VERSION}`
        );
    } else if (snapshot.schemaVersion < SNAPSHOT_SCHEMA_VERSION) {
        warnings.push(
            `Schema version ${snapshot.schemaVersion} is older than current ${SNAPSHOT_SCHEMA_VERSION}`
        );
    }

    if (!Array.isArray(snapshot.completedNodes)) errors.push("completedNodes must be an array");
    if (!Array.isArray(snapshot.pendingNodes)) errors.push("pendingNodes must be an array");
    if (!Array.isArray(snapshot.loopStates)) errors.push("loopStates must be an array");
    if (!Array.isArray(snapshot.parallelStates)) errors.push("parallelStates must be an array");

    if (snapshot.snapshotType === "pause" && !snapshot.pauseContext) {
        warnings.push("Pause snapshot missing pauseContext");
    }

    return {
        valid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
    };
}

export function serializeSnapshot(snapshot: WorkflowSnapshot): WorkflowSnapshotRecord {
    return {
        id: snapshot.id,
        execution_id: snapshot.executionId,
        workflow_id: snapshot.workflowId,
        user_id: snapshot.userId,
        snapshot_type: snapshot.snapshotType,
        schema_version: snapshot.schemaVersion,
        completed_nodes: JSON.stringify(snapshot.completedNodes),
        pending_nodes: JSON.stringify(snapshot.pendingNodes),
        executing_nodes: JSON.stringify(snapshot.executingNodes),
        failed_nodes: JSON.stringify(snapshot.failedNodes),
        skipped_nodes: JSON.stringify(snapshot.skippedNodes),
        node_outputs: JSON.stringify(snapshot.nodeOutputs),
        workflow_variables: JSON.stringify(snapshot.workflowVariables),
        inputs: JSON.stringify(snapshot.inputs),
        loop_states: JSON.stringify(snapshot.loopStates),
        parallel_states: JSON.stringify(snapshot.parallelStates),
        pause_context: snapshot.pauseContext ? JSON.stringify(snapshot.pauseContext) : null,
        progress: snapshot.progress,
        total_size_bytes: snapshot.totalSizeBytes,
        created_at: new Date(snapshot.createdAt)
    };
}

export function deserializeSnapshot(
    record: WorkflowSnapshotRecord,
    _options?: LoadSnapshotOptions
): WorkflowSnapshot {
    return {
        id: record.id,
        executionId: record.execution_id,
        workflowId: record.workflow_id,
        userId: record.user_id,
        snapshotType: record.snapshot_type,
        schemaVersion: record.schema_version,
        completedNodes: JSON.parse(record.completed_nodes),
        pendingNodes: JSON.parse(record.pending_nodes),
        executingNodes: JSON.parse(record.executing_nodes),
        failedNodes: JSON.parse(record.failed_nodes),
        skippedNodes: JSON.parse(record.skipped_nodes),
        nodeOutputs: JSON.parse(record.node_outputs),
        workflowVariables: JSON.parse(record.workflow_variables),
        inputs: JSON.parse(record.inputs),
        loopStates: JSON.parse(record.loop_states),
        parallelStates: JSON.parse(record.parallel_states),
        pauseContext: record.pause_context ? JSON.parse(record.pause_context) : undefined,
        progress: record.progress,
        totalSizeBytes: record.total_size_bytes,
        createdAt: record.created_at.getTime()
    };
}

export function restoreQueueState(snapshot: WorkflowSnapshot): ExecutionQueueState {
    const pending = new Set<string>();
    const ready = new Set<string>();
    const executing = new Set<string>();
    const completed = new Set<string>();
    const failed = new Set<string>();
    const skipped = new Set<string>();
    const nodeStates = new Map<
        string,
        {
            nodeId: string;
            status: NodeExecutionStatus;
            retryCount: number;
            output?: JsonObject;
            error?: string;
            startedAt?: number;
            completedAt?: number;
        }
    >();

    for (const node of snapshot.completedNodes) {
        completed.add(node.nodeId);
        nodeStates.set(node.nodeId, {
            nodeId: node.nodeId,
            status: "completed",
            retryCount: node.retryCount,
            output: node.output,
            startedAt: node.startedAt,
            completedAt: node.completedAt
        });
    }

    for (const node of snapshot.pendingNodes) {
        if (node.status === "ready") {
            ready.add(node.nodeId);
        } else {
            pending.add(node.nodeId);
        }
        nodeStates.set(node.nodeId, {
            nodeId: node.nodeId,
            status: node.status,
            retryCount: node.retryCount
        });
    }

    for (const node of snapshot.executingNodes) {
        ready.add(node.nodeId);
        nodeStates.set(node.nodeId, {
            nodeId: node.nodeId,
            status: "ready",
            retryCount: node.retryCount
        });
    }

    for (const node of snapshot.failedNodes) {
        failed.add(node.nodeId);
        nodeStates.set(node.nodeId, {
            nodeId: node.nodeId,
            status: "failed",
            retryCount: node.retryCount,
            error: node.error,
            startedAt: node.startedAt,
            completedAt: node.completedAt
        });
    }

    for (const node of snapshot.skippedNodes) {
        skipped.add(node.nodeId);
        nodeStates.set(node.nodeId, {
            nodeId: node.nodeId,
            status: "skipped",
            retryCount: node.retryCount
        });
    }

    return { pending, ready, executing, completed, failed, skipped, nodeStates };
}

export function restoreContextSnapshot(snapshot: WorkflowSnapshot): ContextSnapshot {
    const nodeOutputs = new Map<string, JsonObject>();
    for (const [nodeId, output] of Object.entries(snapshot.nodeOutputs)) {
        nodeOutputs.set(nodeId, output);
    }

    const workflowVariables = new Map<string, JsonValue>();
    for (const [key, value] of Object.entries(snapshot.workflowVariables)) {
        workflowVariables.set(key, value);
    }

    return {
        nodeOutputs,
        workflowVariables,
        sharedMemory: createSharedMemory(),
        inputs: snapshot.inputs,
        metadata: {
            totalSizeBytes: snapshot.totalSizeBytes,
            nodeCount: nodeOutputs.size,
            createdAt: snapshot.createdAt
        }
    };
}

export function restoreLoopStates(snapshot: WorkflowSnapshot): Map<string, LoopIterationState> {
    const states = new Map<string, LoopIterationState>();
    for (const loopState of snapshot.loopStates) {
        states.set(loopState.loopNodeId, {
            index: loopState.currentIndex,
            total: loopState.totalItems,
            item: loopState.currentItem,
            results: loopState.accumulatedResults
        });
    }
    return states;
}

export function getSnapshotTypeDescription(type: SnapshotType): string {
    switch (type) {
        case "checkpoint":
            return "Automatic checkpoint";
        case "pause":
            return "User-initiated pause";
        case "failure":
            return "Failure recovery point";
        case "final":
            return "Final execution state";
        default:
            return "Unknown snapshot type";
    }
}

function estimateSnapshotSize(data: {
    nodeOutputs: Record<string, JsonObject>;
    workflowVariables: Record<string, JsonValue>;
    inputs: JsonObject;
}): number {
    return JSON.stringify(data).length * 2;
}

// ============================================================================
// SNAPSHOT REPOSITORY
// ============================================================================

export class SnapshotRepository {
    async save(snapshot: WorkflowSnapshot): Promise<void> {
        const record = serializeSnapshot(snapshot);
        const query = `
            INSERT INTO flowmaestro.workflow_snapshots (
                id, execution_id, workflow_id, user_id, snapshot_type, schema_version,
                completed_nodes, pending_nodes, executing_nodes, failed_nodes, skipped_nodes,
                node_outputs, workflow_variables, inputs, loop_states, parallel_states,
                pause_context, progress, total_size_bytes, created_at
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
        `;
        await db.query(query, [
            record.id,
            record.execution_id,
            record.workflow_id,
            record.user_id,
            record.snapshot_type,
            record.schema_version,
            record.completed_nodes,
            record.pending_nodes,
            record.executing_nodes,
            record.failed_nodes,
            record.skipped_nodes,
            record.node_outputs,
            record.workflow_variables,
            record.inputs,
            record.loop_states,
            record.parallel_states,
            record.pause_context,
            record.progress,
            record.total_size_bytes,
            record.created_at
        ]);
    }

    async findById(id: string): Promise<WorkflowSnapshot | null> {
        const result = await db.query<WorkflowSnapshotRecord>(
            "SELECT * FROM flowmaestro.workflow_snapshots WHERE id = $1",
            [id]
        );
        if (result.rows.length === 0) return null;
        return deserializeSnapshot(result.rows[0]);
    }

    async findLatestByExecutionId(executionId: string): Promise<WorkflowSnapshot | null> {
        const result = await db.query<WorkflowSnapshotRecord>(
            `SELECT * FROM flowmaestro.workflow_snapshots
             WHERE execution_id = $1 ORDER BY created_at DESC LIMIT 1`,
            [executionId]
        );
        if (result.rows.length === 0) return null;
        return deserializeSnapshot(result.rows[0]);
    }

    async findByExecutionId(executionId: string): Promise<WorkflowSnapshot[]> {
        const result = await db.query<WorkflowSnapshotRecord>(
            `SELECT * FROM flowmaestro.workflow_snapshots
             WHERE execution_id = $1 ORDER BY created_at DESC`,
            [executionId]
        );
        return result.rows.map((r) => deserializeSnapshot(r));
    }

    async deleteByExecutionId(executionId: string): Promise<number> {
        const result = await db.query(
            "DELETE FROM flowmaestro.workflow_snapshots WHERE execution_id = $1",
            [executionId]
        );
        return result.rowCount ?? 0;
    }
}

export const snapshotRepository = new SnapshotRepository();
