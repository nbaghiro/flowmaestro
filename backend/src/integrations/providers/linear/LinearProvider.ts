import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { toJSONSchema } from "../../../core/utils/zod-to-json-schema";
import { BaseProvider } from "../../core/BaseProvider";
import { LinearClient } from "./client/LinearClient";
import {
    createIssueOperation,
    executeCreateIssue,
    updateIssueOperation,
    executeUpdateIssue,
    getIssueOperation,
    executeGetIssue,
    listIssuesOperation,
    executeListIssues,
    listTeamsOperation,
    executeListTeams,
    listUsersOperation,
    executeListUsers,
    listWorkflowStatesOperation,
    executeListWorkflowStates
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities
} from "../../core/types";

/**
 * Linear Provider - implements OAuth2 authentication with GraphQL operations
 */
export class LinearProvider extends BaseProvider {
    readonly name = "linear";
    readonly displayName = "Linear";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 8.33 // 500 requests per hour / 60 minutes
        }
    };

    private clientPool: Map<string, LinearClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(createIssueOperation);
        this.registerOperation(updateIssueOperation);
        this.registerOperation(getIssueOperation);
        this.registerOperation(listIssuesOperation);
        this.registerOperation(listTeamsOperation);
        this.registerOperation(listUsersOperation);
        this.registerOperation(listWorkflowStatesOperation);
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://linear.app/oauth/authorize",
            tokenUrl: "https://api.linear.app/oauth/token",
            scopes: ["read", "write"],
            clientId: appConfig.oauth.linear.clientId,
            clientSecret: appConfig.oauth.linear.clientSecret,
            redirectUri: getOAuthRedirectUri("linear"),
            refreshable: true
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
            case "createIssue":
                return await executeCreateIssue(client, validatedParams as never);
            case "updateIssue":
                return await executeUpdateIssue(client, validatedParams as never);
            case "getIssue":
                return await executeGetIssue(client, validatedParams as never);
            case "listIssues":
                return await executeListIssues(client, validatedParams as never);
            case "listTeams":
                return await executeListTeams(client, validatedParams as never);
            case "listUsers":
                return await executeListUsers(client, validatedParams as never);
            case "listWorkflowStates":
                return await executeListWorkflowStates(client, validatedParams as never);
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
        // Convert operations to MCP tools with linear_ prefix
        return this.getOperations().map((op) => ({
            name: `linear_${op.id}`,
            description: op.description,
            inputSchema: toJSONSchema(op.inputSchema)
        }));
    }

    /**
     * Execute MCP tool
     */
    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        // Remove linear_ prefix to get operation ID
        const operationId = toolName.replace("linear_", "");

        const result = await this.executeOperation(operationId, params, connection, {
            mode: "agent",
            conversationId: "unknown",
            toolCallId: "unknown"
        });

        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error?.message || "MCP tool execution failed");
        }
    }

    /**
     * Get or create Linear client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): LinearClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as OAuth2TokenData;
        const client = new LinearClient({
            accessToken: data.access_token
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
