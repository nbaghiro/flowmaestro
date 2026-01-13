import type { JsonObject } from "@flowmaestro/shared";

export type ThreadStatus = "active" | "archived" | "deleted";

export interface ThreadModel {
    id: string;
    user_id: string;
    workspace_id: string;
    agent_id: string;
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
    agent_id: string;
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
