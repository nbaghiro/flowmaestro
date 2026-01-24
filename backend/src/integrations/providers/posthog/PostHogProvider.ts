import { BaseProvider } from "../../core/BaseProvider";
import { PostHogClient } from "./client/PostHogClient";
import { PostHogMCPAdapter } from "./mcp/PostHogMCPAdapter";
import {
    captureEventOperation,
    executeCaptureEvent,
    captureEventsOperation,
    executeCaptureEvents,
    identifyUserOperation,
    executeIdentifyUser,
    identifyGroupOperation,
    executeIdentifyGroup
} from "./operations";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    APIKeyConfig,
    ProviderCapabilities
} from "../../core/types";

/**
 * PostHog Provider - implements Project API Key authentication
 *
 * PostHog uses an API key passed in the request body:
 * - /capture/: api_key in body
 * - /batch/: api_key in body
 *
 * Rate limits:
 * - No rate limits on capture endpoints
 * - Batch requests limited to 20MB payload
 */
export class PostHogProvider extends BaseProvider {
    readonly name = "posthog";
    readonly displayName = "PostHog";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 6000 // No rate limit, but set reasonable default
        }
    };

    private mcpAdapter: PostHogMCPAdapter;
    private clientPool: Map<string, PostHogClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(captureEventOperation);
        this.registerOperation(captureEventsOperation);
        this.registerOperation(identifyUserOperation);
        this.registerOperation(identifyGroupOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new PostHogMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     * Note: PostHog doesn't use header auth; API key is in payload.
     * This is for interface compliance.
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "Authorization",
            headerTemplate: "Bearer {{api_key}}"
        };

        return config;
    }

    /**
     * Execute operation via direct API
     */
    async executeOperation(
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        // Validate parameters
        const validatedParams = this.validateParams(operationId, params);

        // Get or create client
        const client = this.getOrCreateClient(connection);

        // Execute operation
        switch (operationId) {
            case "captureEvent":
                return await executeCaptureEvent(client, validatedParams as never);
            case "captureEvents":
                return await executeCaptureEvents(client, validatedParams as never);
            case "identifyUser":
                return await executeIdentifyUser(client, validatedParams as never);
            case "identifyGroup":
                return await executeIdentifyGroup(client, validatedParams as never);
            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unknown operation: ${operationId}`,
                        retryable: false
                    }
                };
        }
    }

    /**
     * Get MCP tools
     */
    getMCPTools(): MCPTool[] {
        return this.mcpAdapter.getTools();
    }

    /**
     * Execute MCP tool
     */
    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        const client = this.getOrCreateClient(connection);
        const result = await this.mcpAdapter.executeTool(toolName, params, client);

        if ((result as { success?: boolean }).success) {
            return (result as { data?: unknown }).data;
        } else {
            throw new Error(
                (result as { error?: { message?: string } }).error?.message ||
                    "MCP tool execution failed"
            );
        }
    }

    /**
     * Get or create PostHog client (with connection pooling)
     *
     * For PostHog, we use:
     * - api_key field as the PostHog Project API Key
     * - api_secret field (optional) as the host URL for self-hosted instances
     */
    private getOrCreateClient(connection: ConnectionWithData): PostHogClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as ApiKeyData;
        const client = new PostHogClient({
            apiKey: data.api_key,
            host: data.api_secret || undefined // Use api_secret as optional host URL
        });

        // Cache client
        this.clientPool.set(poolKey, client);

        return client;
    }

    /**
     * Clear client from pool (e.g., when connection is deleted)
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
