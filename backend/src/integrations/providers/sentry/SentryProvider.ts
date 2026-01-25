/**
 * Sentry Integration Provider
 *
 * Error tracking and performance monitoring for developers.
 * Uses Bearer token authentication with Auth Token.
 *
 * Rate limit: 600 requests/minute
 */

import { BaseProvider } from "../../core/BaseProvider";
import { SentryClient } from "./client/SentryClient";
import { SentryMCPAdapter } from "./mcp/SentryMCPAdapter";
import {
    // Organization Operations
    listOrganizationsOperation,
    executeListOrganizations,
    // Project Operations
    listProjectsOperation,
    executeListProjects,
    getProjectOperation,
    executeGetProject,
    // Issue Operations
    listIssuesOperation,
    executeListIssues,
    getIssueOperation,
    executeGetIssue,
    updateIssueOperation,
    executeUpdateIssue,
    // Event Operations
    listIssueEventsOperation,
    executeListIssueEvents,
    // Release Operations
    listReleasesOperation,
    executeListReleases,
    createReleaseOperation,
    executeCreateRelease,
    // Alert Operations
    listAlertRulesOperation,
    executeListAlertRules
} from "./operations";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

interface SentryConnectionData extends ApiKeyData {
    region?: string; // Sentry region (e.g., "sentry.io", "us.sentry.io", "de.sentry.io")
}

export class SentryProvider extends BaseProvider {
    readonly name = "sentry";
    readonly displayName = "Sentry";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 600,
            burstSize: 100
        }
    };

    private clientPool: Map<string, SentryClient> = new Map();
    private mcpAdapter: SentryMCPAdapter;

    constructor() {
        super();

        // Register Organization Operations (1 operation)
        this.registerOperation(listOrganizationsOperation);

        // Register Project Operations (2 operations)
        this.registerOperation(listProjectsOperation);
        this.registerOperation(getProjectOperation);

        // Register Issue Operations (3 operations)
        this.registerOperation(listIssuesOperation);
        this.registerOperation(getIssueOperation);
        this.registerOperation(updateIssueOperation);

        // Register Event Operations (1 operation)
        this.registerOperation(listIssueEventsOperation);

        // Register Release Operations (2 operations)
        this.registerOperation(listReleasesOperation);
        this.registerOperation(createReleaseOperation);

        // Register Alert Operations (1 operation)
        this.registerOperation(listAlertRulesOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new SentryMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     */
    getAuthConfig(): AuthConfig {
        return {
            headerName: "Authorization",
            headerTemplate: "Bearer {{api_key}}"
        };
    }

    /**
     * Execute an operation
     */
    async executeOperation(
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        const client = this.getOrCreateClient(connection);

        switch (operationId) {
            // Organization Operations
            case "listOrganizations":
                return executeListOrganizations(client, params as never);

            // Project Operations
            case "listProjects":
                return executeListProjects(client, params as never);
            case "getProject":
                return executeGetProject(client, params as never);

            // Issue Operations
            case "listIssues":
                return executeListIssues(client, params as never);
            case "getIssue":
                return executeGetIssue(client, params as never);
            case "updateIssue":
                return executeUpdateIssue(client, params as never);

            // Event Operations
            case "listIssueEvents":
                return executeListIssueEvents(client, params as never);

            // Release Operations
            case "listReleases":
                return executeListReleases(client, params as never);
            case "createRelease":
                return executeCreateRelease(client, params as never);

            // Alert Operations
            case "listAlertRules":
                return executeListAlertRules(client, params as never);

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
     * Get MCP tools for AI agent integration
     */
    getMCPTools(): MCPTool[] {
        return this.mcpAdapter.getTools();
    }

    /**
     * Execute an MCP tool
     */
    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        const client = this.getOrCreateClient(connection);
        const result = await this.mcpAdapter.executeTool(toolName, params, client);

        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error?.message || "MCP tool execution failed");
        }
    }

    /**
     * Get or create a client for a connection (with caching)
     *
     * For Sentry:
     * - api_key field = Auth Token
     * - region field (from metadata) = Sentry region
     */
    private getOrCreateClient(connection: ConnectionWithData): SentryClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get credentials from connection data
        const data = connection.data as SentryConnectionData;

        if (!data.api_key) {
            throw new Error("Sentry Auth Token is required");
        }

        // Get region from connection metadata or default to sentry.io
        const metadata = connection.metadata as Record<string, unknown> | undefined;
        const region = metadata?.region as string | undefined;

        const client = new SentryClient({
            authToken: data.api_key,
            region: region || "sentry.io"
        });

        this.clientPool.set(poolKey, client);
        return client;
    }

    /**
     * Clear cached client
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
