import type { ExecutionPauseContext, ExecutionStatus, JsonValue } from "@flowmaestro/shared";

export interface ExecutionModel {
    id: string;
    workflow_id: string;
    status: ExecutionStatus;
    inputs: Record<string, JsonValue> | null;
    outputs: Record<string, JsonValue> | null;
    current_state: JsonValue | null;
    pause_context: ExecutionPauseContext | null;
    error: string | null;
    started_at: Date | null;
    completed_at: Date | null;
    created_at: Date;
}

export interface CreateExecutionInput {
    workflow_id: string;
    inputs?: Record<string, JsonValue>;
}

export interface UpdateExecutionInput {
    status?: ExecutionStatus;
    outputs?: Record<string, JsonValue>;
    current_state?: JsonValue;
    pause_context?: ExecutionPauseContext | null;
    error?: string;
    started_at?: Date;
    completed_at?: Date;
}
