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
 * Operation definition with metadata and schemas
 */
export interface OperationDefinition {
    id: string; // "sendMessage"
    name: string; // "Send Message"
    description: string;
    category: string; // "messaging", "files", "channels"
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
}
