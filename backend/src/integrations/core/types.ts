import type { ConnectionWithData, ConnectionMethod } from "../../storage/models/Connection";
import type { z } from "zod";

/**
 * Execution context - tells us whether this is a workflow or agent execution
 */
export type ExecutionContext =
    | { mode: "workflow"; workflowId: string; nodeId: string }
    | { mode: "agent"; conversationId: string; toolCallId: string };

/**
 * Result of an operation execution
 */
export interface OperationResult {
    success: boolean;
    data?: unknown;
    error?: OperationError;
}

/**
 * Standardized error format
 */
export interface OperationError {
    type: "validation" | "permission" | "not_found" | "rate_limit" | "server_error";
    message: string;
    code?: string;
    retryable: boolean;
    details?: Record<string, unknown>;
}

/**
 * Action type for filtering operations by node type
 * - "read": Fetch/list/get data (shown in Integration nodes)
 * - "write": Send/create/update/delete data (shown in Action nodes)
 */
export type OperationActionType = "read" | "write";

/**
 * Infer the action type from an operation ID.
 * Used when actionType is not explicitly set in the operation definition.
 */
export function inferActionType(operationId: string): OperationActionType {
    const id = operationId.toLowerCase();

    // Write operations: send, create, post, update, delete, add, remove, insert, reply, upload, etc.
    const writePatterns = [
        "send",
        "create",
        "post",
        "update",
        "delete",
        "add",
        "remove",
        "insert",
        "write",
        "reply",
        "upload",
        "append",
        "move",
        "copy",
        "rename",
        "set",
        "put",
        "patch",
        "edit",
        "modify",
        "assign",
        "unassign",
        "close",
        "reopen",
        "merge",
        "archive",
        "unarchive",
        "publish",
        "unpublish",
        "invite",
        "kick",
        "ban",
        "unban",
        "mute",
        "unmute",
        "pin",
        "unpin",
        "star",
        "unstar",
        "like",
        "unlike",
        "follow",
        "unfollow",
        "subscribe",
        "unsubscribe",
        "trigger",
        "execute",
        "run",
        "start",
        "stop",
        "cancel",
        "approve",
        "reject",
        "dismiss",
        "acknowledge"
    ];

    // Check if any write pattern matches
    for (const pattern of writePatterns) {
        if (id.includes(pattern)) {
            return "write";
        }
    }

    // Default to "read" for list, get, search, query, fetch, find, etc.
    return "read";
}

/**
 * Operation definition with metadata and schemas
 */
export interface OperationDefinition {
    id: string; // "sendMessage"
    name: string; // "Send Message"
    description: string;
    category: string; // "messaging", "files", "channels"
    actionType?: OperationActionType; // Optional - will be inferred from id if not provided
    inputSchema: z.ZodSchema; // Zod for TypeScript
    inputSchemaJSON: JSONSchema; // JSON Schema for MCP
    outputSchema?: z.ZodSchema;
    rateLimit?: RateLimitConfig;
    timeout?: number;
    retryable: boolean;
}

/**
 * JSON Schema (for MCP and frontend)
 */
export interface JSONSchema {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
    description?: string;
    [key: string]: unknown;
}

/**
 * MCP Tool definition
 */
export interface MCPTool {
    name: string; // "slack_sendMessage"
    description: string;
    inputSchema: JSONSchema;
    executeRef?: string; // Reference to operation ID
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
    tokensPerMinute: number;
    burstSize?: number;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
    maxRetries: number;
    retryableStatuses: number[];
    retryableErrors?: string[];
    backoffStrategy: "exponential" | "linear" | "constant";
    initialDelay?: number; // ms
    maxDelay?: number; // ms
}

/**
 * Provider capabilities
 */
export interface ProviderCapabilities {
    supportsWebhooks?: boolean;
    supportsPolling?: boolean;
    supportsStreaming?: boolean;
    maxRequestSize?: number;
    rateLimit?: RateLimitConfig;
    prefersMCP?: boolean;
}

// ============================================================================
// TRIGGER TYPES
// ============================================================================

/**
 * Categories for organizing trigger providers
 */
export type TriggerProviderCategory =
    | "communication"
    | "productivity"
    | "crm"
    | "developer_tools"
    | "ecommerce"
    | "file_storage"
    | "marketing"
    | "social_media"
    | "project_management"
    | "support"
    | "database"
    | "payments";

/**
 * How the webhook is set up with the external provider
 */
export type WebhookSetupType =
    | "automatic" // We register webhooks via provider APIs
    | "manual" // User must configure webhook URL in provider
    | "polling"; // No webhooks, we poll for changes

/**
 * Signature verification method for incoming webhooks
 */
export type WebhookSignatureType =
    | "hmac_sha256"
    | "hmac_sha1"
    | "timestamp_signature"
    | "bearer_token"
    | "ed25519"
    | "none";

/**
 * Configuration field for trigger event configuration UI
 */
export interface TriggerConfigField {
    name: string;
    label: string;
    type: "text" | "select" | "multiselect" | "boolean" | "number" | "json";
    required: boolean;
    description?: string;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
    defaultValue?: string | boolean | number;
    /** For dynamic options loaded from provider API */
    dynamicOptions?: {
        operation: string;
        labelField: string;
        valueField: string;
    };
}

/**
 * A specific event that can trigger a workflow from a provider
 */
export interface TriggerDefinition {
    id: string;
    name: string;
    description: string;
    /** JSON schema for the payload this event produces */
    payloadSchema?: JSONSchema;
    /** OAuth scopes required to receive this event */
    requiredScopes?: string[];
    /** Configuration fields specific to this event */
    configFields?: TriggerConfigField[];
    /** Tags for filtering/searching events */
    tags?: string[];
}

/**
 * Webhook configuration for a provider
 */
export interface WebhookConfig {
    /** How webhooks are set up */
    setupType: WebhookSetupType;
    /** Signature verification method */
    signatureType: WebhookSignatureType;
    /** Header containing the signature */
    signatureHeader?: string;
    /** Header containing the event type (if applicable) */
    eventHeader?: string;
    /** Header containing timestamp (for replay protection) */
    timestampHeader?: string;
    /** Maximum age of timestamp before rejecting (in seconds) */
    timestampMaxAge?: number;
}

/**
 * Incoming webhook request data for verification
 */
export interface WebhookRequestData {
    headers: Record<string, string | string[] | undefined>;
    body: string | Buffer;
    rawBody?: Buffer;
}

/**
 * Result of webhook signature verification
 */
export interface WebhookVerificationResult {
    valid: boolean;
    error?: string;
}

/**
 * OAuth configuration
 */
export interface OAuthConfig {
    authUrl: string;
    tokenUrl: string;
    scopes: string[];
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    refreshable?: boolean;
}

/**
 * API Key configuration
 */
export interface APIKeyConfig {
    headerName: string;
    headerTemplate: string; // e.g., "Bearer {{api_key}}"
}

/**
 * Auth configuration (union type)
 */
export type AuthConfig = OAuthConfig | APIKeyConfig;

/**
 * HTTP request configuration
 */
export interface RequestConfig {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    url: string;
    headers?: Record<string, string>;
    params?: Record<string, unknown>;
    data?: unknown;
    timeout?: number;
}

/**
 * Provider metadata
 */
export interface ProviderMetadata {
    name: string;
    displayName: string;
    description?: string;
    category?: string;
    logoUrl?: string;
    website?: string;
}

/**
 * Base provider interface
 */
export interface IProvider {
    readonly name: string;
    readonly displayName: string;
    readonly authMethod: ConnectionMethod;
    readonly capabilities: ProviderCapabilities;

    // Authentication
    getAuthConfig(): AuthConfig;
    refreshCredentials?(connection: ConnectionWithData): Promise<unknown>;

    // Direct API execution (workflows)
    executeOperation(
        operation: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        context: ExecutionContext
    ): Promise<OperationResult>;

    // MCP tool interface (agents)
    getMCPTools(): MCPTool[];
    executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown>;

    // Discovery
    getOperations(): OperationDefinition[];
    getOperationSchema(operation: string): z.ZodSchema | null;

    // Triggers (optional - only for providers that support webhooks)
    getTriggers?(): TriggerDefinition[];
    getWebhookConfig?(): WebhookConfig | null;

    // Webhook verification (optional - only for providers that support webhooks)
    verifyWebhookSignature?(secret: string, request: WebhookRequestData): WebhookVerificationResult;
    extractEventType?(request: WebhookRequestData): string | undefined;
}

/**
 * Provider registry entry
 */
export interface ProviderRegistryEntry {
    name: string;
    displayName: string;
    authMethod: ConnectionMethod;
    category?: string;
    loader: () => Promise<IProvider>;
}

/**
 * Operation summary (for API responses)
 */
export interface OperationSummary {
    id: string;
    name: string;
    description: string;
    category: string;
    actionType: OperationActionType; // "read" or "write" - for filtering by node type
    inputSchema: JSONSchema;
    inputSchemaJSON?: JSONSchema;
    parameters?: Array<{
        name: string;
        type: string;
        description?: string;
        required: boolean;
        default?: unknown;
    }>;
    retryable: boolean;
}

/**
 * Provider summary (for API responses)
 */
export interface ProviderSummary {
    name: string;
    displayName: string;
    authMethod: ConnectionMethod;
    category?: string;
    operationCount: number;
    capabilities: ProviderCapabilities;
    /** Trigger information (if provider supports webhooks) */
    triggers?: TriggerDefinition[];
    webhookConfig?: WebhookConfig;
}

/**
 * Trigger summary for API responses
 */
export interface TriggerSummary {
    id: string;
    name: string;
    description: string;
    configFields?: TriggerConfigField[];
    tags?: string[];
}

/**
 * Provider with trigger capabilities (for trigger selection UI)
 */
export interface TriggerProviderSummary {
    providerId: string;
    name: string;
    description?: string;
    icon?: string;
    category: TriggerProviderCategory;
    triggers: TriggerSummary[];
    webhookConfig: WebhookConfig;
    requiresConnection: boolean;
    enabled: boolean;
}
