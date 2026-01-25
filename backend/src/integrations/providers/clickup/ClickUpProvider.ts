import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { ClickUpClient } from "./client/ClickUpClient";
import { ClickUpMCPAdapter } from "./mcp/ClickUpMCPAdapter";
import {
    // Task operations
    createTaskOperation,
    executeCreateTask,
    getTaskOperation,
    executeGetTask,
    updateTaskOperation,
    executeUpdateTask,
    deleteTaskOperation,
    executeDeleteTask,
    getTasksOperation,
    executeGetTasks,
    // Comment operations
    createTaskCommentOperation,
    executeCreateTaskComment,
    getTaskCommentsOperation,
    executeGetTaskComments,
    // Hierarchy operations
    getWorkspacesOperation,
    executeGetWorkspaces,
    getSpacesOperation,
    executeGetSpaces,
    getListsOperation,
    executeGetLists
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities,
    WebhookConfig,
    TriggerDefinition
} from "../../core/types";

/**
 * ClickUp Provider - implements OAuth2 authentication for project management
 *
 * Note: ClickUp uses raw access token in Authorization header (no "Bearer" prefix)
 */
export class ClickUpProvider extends BaseProvider {
    readonly name = "clickup";
    readonly displayName = "ClickUp";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 100 // Free/Unlimited/Business plans
        }
    };

    private mcpAdapter: ClickUpMCPAdapter;
    private clientPool: Map<string, ClickUpClient> = new Map();

    constructor() {
        super();

        // Register task operations
        this.registerOperation(createTaskOperation);
        this.registerOperation(getTaskOperation);
        this.registerOperation(updateTaskOperation);
        this.registerOperation(deleteTaskOperation);
        this.registerOperation(getTasksOperation);

        // Register comment operations
        this.registerOperation(createTaskCommentOperation);
        this.registerOperation(getTaskCommentsOperation);

        // Register hierarchy operations
        this.registerOperation(getWorkspacesOperation);
        this.registerOperation(getSpacesOperation);
        this.registerOperation(getListsOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new ClickUpMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://app.clickup.com/api",
            tokenUrl: "https://api.clickup.com/api/v2/oauth/token",
            scopes: [], // ClickUp doesn't use traditional scopes - access is workspace-based
            clientId: appConfig.oauth.clickup.clientId,
            clientSecret: appConfig.oauth.clickup.clientSecret,
            redirectUri: getOAuthRedirectUri("clickup"),
            refreshable: false // ClickUp tokens don't currently expire
        };

        return config;
    }

    /**
     * Get webhook configuration
     */
    getWebhookConfig(): WebhookConfig {
        return {
            setupType: "manual",
            signatureType: "hmac_sha256",
            signatureHeader: "X-Signature"
        };
    }

    /**
     * Get available triggers
     */
    getTriggers(): TriggerDefinition[] {
        return [
            {
                id: "taskCreated",
                name: "Task Created",
                description: "Triggered when a new task is created in the workspace",
                tags: ["task", "create"]
            },
            {
                id: "taskUpdated",
                name: "Task Updated",
                description: "Triggered when a task is updated (status, assignee, due date, etc.)",
                tags: ["task", "update"]
            },
            {
                id: "taskDeleted",
                name: "Task Deleted",
                description: "Triggered when a task is deleted from the workspace",
                tags: ["task", "delete"]
            }
        ];
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
            // Task operations
            case "createTask":
                return await executeCreateTask(client, validatedParams as never);
            case "getTask":
                return await executeGetTask(client, validatedParams as never);
            case "updateTask":
                return await executeUpdateTask(client, validatedParams as never);
            case "deleteTask":
                return await executeDeleteTask(client, validatedParams as never);
            case "getTasks":
                return await executeGetTasks(client, validatedParams as never);

            // Comment operations
            case "createTaskComment":
                return await executeCreateTaskComment(client, validatedParams as never);
            case "getTaskComments":
                return await executeGetTaskComments(client, validatedParams as never);

            // Hierarchy operations
            case "getWorkspaces":
                return await executeGetWorkspaces(client, validatedParams as never);
            case "getSpaces":
                return await executeGetSpaces(client, validatedParams as never);
            case "getLists":
                return await executeGetLists(client, validatedParams as never);

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
     * Get or create ClickUp client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): ClickUpClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const tokens = connection.data as OAuth2TokenData;
        const client = new ClickUpClient({
            accessToken: tokens.access_token,
            connectionId: connection.id
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
