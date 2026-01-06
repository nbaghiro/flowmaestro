/**
 * API Key scopes for public API access control.
 * Format: resource:action
 */
export type ApiKeyScope =
    | "workflows:read"
    | "workflows:execute"
    | "executions:read"
    | "executions:cancel"
    | "agents:read"
    | "agents:execute"
    | "threads:read"
    | "threads:write"
    | "triggers:read"
    | "triggers:execute"
    | "knowledge-bases:read"
    | "knowledge-bases:query"
    | "webhooks:read"
    | "webhooks:write";

/**
 * Predefined scope bundles for common use cases.
 */
export const SCOPE_BUNDLES = {
    "workflow-executor": [
        "workflows:read",
        "workflows:execute",
        "executions:read",
        "executions:cancel",
        "triggers:read",
        "triggers:execute"
    ] as ApiKeyScope[],

    "agent-executor": [
        "agents:read",
        "agents:execute",
        "threads:read",
        "threads:write"
    ] as ApiKeyScope[],

    "knowledge-base-reader": ["knowledge-bases:read", "knowledge-bases:query"] as ApiKeyScope[],

    "read-only": [
        "workflows:read",
        "executions:read",
        "agents:read",
        "threads:read",
        "triggers:read",
        "knowledge-bases:read",
        "webhooks:read"
    ] as ApiKeyScope[],

    "full-access": [
        "workflows:read",
        "workflows:execute",
        "executions:read",
        "executions:cancel",
        "agents:read",
        "agents:execute",
        "threads:read",
        "threads:write",
        "triggers:read",
        "triggers:execute",
        "knowledge-bases:read",
        "knowledge-bases:query",
        "webhooks:read",
        "webhooks:write"
    ] as ApiKeyScope[]
};

export type ScopeBundleName = keyof typeof SCOPE_BUNDLES;

/**
 * API Key model as stored in the database.
 */
export interface ApiKeyModel {
    id: string;
    user_id: string;
    name: string;
    key_prefix: string;
    key_hash: string;
    scopes: ApiKeyScope[];
    rate_limit_per_minute: number;
    rate_limit_per_day: number;
    expires_at: Date | null;
    last_used_at: Date | null;
    last_used_ip: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    revoked_at: Date | null;
}

/**
 * API Key with the raw key value (only returned on creation).
 */
export interface ApiKeyWithSecret extends ApiKeyModel {
    key: string;
}

/**
 * Input for creating a new API key.
 */
export interface CreateApiKeyInput {
    user_id: string;
    name: string;
    scopes: ApiKeyScope[];
    rate_limit_per_minute?: number;
    rate_limit_per_day?: number;
    expires_at?: Date | null;
}

/**
 * Input for updating an existing API key.
 */
export interface UpdateApiKeyInput {
    name?: string;
    scopes?: ApiKeyScope[];
    rate_limit_per_minute?: number;
    rate_limit_per_day?: number;
    expires_at?: Date | null;
    is_active?: boolean;
}

/**
 * API Key response for listing (excludes sensitive fields).
 */
export interface ApiKeyListItem {
    id: string;
    name: string;
    key_prefix: string;
    scopes: ApiKeyScope[];
    rate_limit_per_minute: number;
    rate_limit_per_day: number;
    expires_at: Date | null;
    last_used_at: Date | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}
