import type { JsonObject } from "@flowmaestro/shared";

export type AgentExecutionStatus = "running" | "completed" | "failed" | "cancelled";
export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface ToolCall {
    id: string;
    name: string;
    arguments: JsonObject;
}

export interface ThreadMessage {
    id: string;
    role: MessageRole;
    content: string;
    tool_calls?: ToolCall[];
    tool_name?: string;
    tool_call_id?: string;
    timestamp: Date;
}

export interface AgentExecutionModel {
    id: string;
    agent_id: string;
    user_id: string;
    thread_id: string; // Thread this execution belongs to
    status: AgentExecutionStatus;
    thread_history: ThreadMessage[];
    iterations: number;
    tool_calls_count: number;
    started_at: Date;
    completed_at: Date | null;
    error: string | null;
    metadata: JsonObject;
}

export interface AgentMessageModel {
    id: string;
    execution_id: string;
    thread_id: string; // Thread this message belongs to
    role: MessageRole;
    content: string;
    tool_calls: ToolCall[] | null;
    tool_name: string | null;
    tool_call_id: string | null;
    created_at: Date;
}

export interface CreateAgentExecutionInput {
    agent_id: string;
    user_id: string;
    thread_id: string; // Required: execution must belong to a thread
    status?: AgentExecutionStatus;
    thread_history?: ThreadMessage[];
    iterations?: number;
    tool_calls_count?: number;
    metadata?: JsonObject;
}

export interface UpdateAgentExecutionInput {
    status?: AgentExecutionStatus;
    thread_history?: ThreadMessage[];
    iterations?: number;
    tool_calls_count?: number;
    completed_at?: Date;
    error?: string;
    metadata?: JsonObject;
}

export interface CreateAgentMessageInput {
    execution_id: string;
    role: MessageRole;
    content: string;
    tool_calls?: ToolCall[];
    tool_name?: string;
    tool_call_id?: string;
}
