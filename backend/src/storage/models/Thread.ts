import type { JsonObject } from "@flowmaestro/shared";

export type ThreadStatus = "active" | "archived" | "deleted";

export interface ThreadModel {
    id: string;
    user_id: string;
    workspace_id: string;
    /** Owning agent; null when the thread belongs to a persona instance. */
    agent_id: string | null;
    /** Owning persona instance; null when the thread belongs to an agent. */
    persona_instance_id: string | null;
    title: string | null;
    status: ThreadStatus;
    metadata: JsonObject;
    created_at: Date;
    updated_at: Date;
    last_message_at: Date | null;
    archived_at: Date | null;
    deleted_at: Date | null;
}

export interface CreateThreadInput {
    user_id: string;
    workspace_id: string;
    /** Exactly one of agent_id and persona_instance_id must be set. */
    agent_id?: string;
    persona_instance_id?: string;
    title?: string;
    status?: ThreadStatus;
    metadata?: JsonObject;
}

export interface UpdateThreadInput {
    title?: string;
    status?: ThreadStatus;
    metadata?: JsonObject;
    archived_at?: Date | null;
    last_message_at?: Date | null;
}

export interface ThreadListFilter {
    workspace_id: string;
    agent_id?: string;
    status?: ThreadStatus;
    limit?: number;
    offset?: number;
    search?: string; // Search in title
}

/**
 * @deprecated Use ThreadListFilter with workspace_id instead. Kept for backward compatibility.
 */
export interface ThreadListFilterByUser {
    user_id: string;
    agent_id?: string;
    status?: ThreadStatus;
    limit?: number;
    offset?: number;
    search?: string;
}
