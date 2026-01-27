import { BaseProvider } from "../../core/BaseProvider";
import { SegmentClient } from "./client/SegmentClient";
import { SegmentMCPAdapter } from "./mcp/SegmentMCPAdapter";
import {
    trackEventOperation,
    executeTrackEvent,
    identifyUserOperation,
    executeIdentifyUser,
    trackPageOperation,
    executeTrackPage,
    trackScreenOperation,
    executeTrackScreen,
    groupUserOperation,
    executeGroupUser,
    aliasUserOperation,
    executeAliasUser,
    batchEventsOperation,
    executeBatchEvents
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
 * Extended API key data that includes region
 */
interface SegmentApiKeyData extends ApiKeyData {
    region?: string;
}

/**
 * Segment Provider - implements Write Key authentication
 *
 * Segment uses Write Key authentication via HTTP Basic Auth:
 * - Username: Write Key
 * - Password: (empty)
 * Authorization: Basic base64(writeKey:)
 *
 * Rate limits:
 * - 1,000 requests per second per workspace
 * - Batch endpoint: max 500KB per request, 32KB per event, 2500 events max
 *
 * Regions:
 * - US (default): https://api.segment.io/v1
 * - EU: https://events.eu1.segmentapis.com/v1
 */
export class SegmentProvider extends BaseProvider {
    readonly name = "segment";
    readonly displayName = "Segment";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 6000 // Conservative: ~100 req/sec (actual limit is 1000/sec)
        }
    };

    private mcpAdapter: SegmentMCPAdapter;
    private clientPool: Map<string, SegmentClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(trackEventOperation);
        this.registerOperation(identifyUserOperation);
        this.registerOperation(trackPageOperation);
        this.registerOperation(trackScreenOperation);
        this.registerOperation(groupUserOperation);
        this.registerOperation(aliasUserOperation);
        this.registerOperation(batchEventsOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new SegmentMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     * Note: Segment uses Basic Auth with Write Key only (empty password).
     * The SegmentClient handles the actual authentication.
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "Authorization",
            headerTemplate: "Basic {{api_key}}"
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
            case "trackEvent":
                return await executeTrackEvent(client, validatedParams as never);
            case "identifyUser":
                return await executeIdentifyUser(client, validatedParams as never);
            case "trackPage":
                return await executeTrackPage(client, validatedParams as never);
            case "trackScreen":
                return await executeTrackScreen(client, validatedParams as never);
            case "groupUser":
                return await executeGroupUser(client, validatedParams as never);
            case "aliasUser":
                return await executeAliasUser(client, validatedParams as never);
            case "batchEvents":
                return await executeBatchEvents(client, validatedParams as never);
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
     * Get or create Segment client (with connection pooling)
     *
     * For Segment, we use:
     * - api_key field as the Segment Write Key
     * - region field (optional) for EU region support
     */
    private getOrCreateClient(connection: ConnectionWithData): SegmentClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as SegmentApiKeyData;

        // Determine region from connection data
        // The region may be stored in settings or api_secret field depending on implementation
        let region: "us" | "eu" = "us";
        if (data.region === "eu") {
            region = "eu";
        }

        const client = new SegmentClient({
            writeKey: data.api_key,
            region
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
