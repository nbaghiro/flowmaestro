import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { JiraClient } from "./client/JiraClient";
import { JiraMCPAdapter } from "./mcp/JiraMCPAdapter";
import {
    createIssueOperation,
    executeCreateIssue,
    getIssueOperation,
    executeGetIssue,
    updateIssueOperation,
    executeUpdateIssue,
    searchIssuesOperation,
    executeSearchIssues,
    deleteIssueOperation,
    executeDeleteIssue,
    transitionIssueOperation,
    executeTransitionIssue,
    assignIssueOperation,
    executeAssignIssue,
    addCommentOperation,
    executeAddComment,
    getCommentsOperation,
    executeGetComments,
    addAttachmentOperation,
    executeAddAttachment,
    linkIssuesOperation,
    executeLinkIssues,
    listProjectsOperation,
    executeListProjects,
    getProjectOperation,
    executeGetProject,
    getIssueTypesOperation,
    executeGetIssueTypes,
    listFieldsOperation,
    executeListFields,
    getCustomFieldConfigsOperation,
    executeGetCustomFieldConfigs,
    searchUsersOperation,
    executeSearchUsers,
    getCurrentUserOperation,
    executeGetCurrentUser
} from "./operations";
import type {
    JiraConnectionMetadata,
    CreateIssueInput,
    GetIssueInput,
    UpdateIssueInput,
    SearchIssuesInput,
    DeleteIssueInput,
    TransitionIssueInput,
    AssignIssueInput,
    AddCommentInput,
    GetCommentsInput,
    AddAttachmentInput,
    LinkIssuesInput,
    ListProjectsInput,
    GetProjectInput,
    GetIssueTypesInput,
    ListFieldsInput,
    GetCustomFieldConfigsInput,
    SearchUsersInput,
    GetCurrentUserInput
} from "./schemas";
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
 * Jira Cloud Provider
 * Provides integration with Jira Cloud for project management and issue tracking
 */
export class JiraProvider extends BaseProvider {
    readonly name = "jira";
    readonly displayName = "Jira Cloud";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 100, // Conservative estimate
            burstSize: 20
        }
    };

    private clientPool: Map<string, JiraClient> = new Map();
    private fieldCache: Map<string, { fields: unknown[]; timestamp: number }> = new Map();
    private mcpAdapter: JiraMCPAdapter;

    constructor() {
        super();

        // Register all 18 operations (Phase 2 + Phase 3 + Phase 4)
        // Issue Operations
        this.registerOperation(createIssueOperation);
        this.registerOperation(getIssueOperation);
        this.registerOperation(updateIssueOperation);
        this.registerOperation(searchIssuesOperation);
        this.registerOperation(deleteIssueOperation);
        this.registerOperation(transitionIssueOperation);
        this.registerOperation(assignIssueOperation);
        this.registerOperation(addCommentOperation);
        this.registerOperation(getCommentsOperation);
        this.registerOperation(addAttachmentOperation);
        this.registerOperation(linkIssuesOperation);

        // Project Operations
        this.registerOperation(listProjectsOperation);
        this.registerOperation(getProjectOperation);
        this.registerOperation(getIssueTypesOperation);

        // Field Operations
        this.registerOperation(listFieldsOperation);
        this.registerOperation(getCustomFieldConfigsOperation);

        // User Operations
        this.registerOperation(searchUsersOperation);
        this.registerOperation(getCurrentUserOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new JiraMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://auth.atlassian.com/authorize",
            tokenUrl: "https://auth.atlassian.com/oauth/token",
            scopes: [
                "read:jira-work",
                "write:jira-work",
                "read:jira-user",
                "manage:jira-webhook",
                "offline_access"
            ],
            clientId: appConfig.oauth.jira.clientId,
            clientSecret: appConfig.oauth.jira.clientSecret,
            redirectUri: getOAuthRedirectUri("jira"),
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
                return await executeCreateIssue(client, validatedParams as CreateIssueInput);
            case "getIssue":
                return await executeGetIssue(client, validatedParams as GetIssueInput);
            case "updateIssue":
                return await executeUpdateIssue(client, validatedParams as UpdateIssueInput);
            case "searchIssues":
                return await executeSearchIssues(client, validatedParams as SearchIssuesInput);
            case "deleteIssue":
                return await executeDeleteIssue(client, validatedParams as DeleteIssueInput);
            case "transitionIssue":
                return await executeTransitionIssue(
                    client,
                    validatedParams as TransitionIssueInput
                );
            case "assignIssue":
                return await executeAssignIssue(client, validatedParams as AssignIssueInput);
            case "addComment":
                return await executeAddComment(client, validatedParams as AddCommentInput);
            case "getComments":
                return await executeGetComments(client, validatedParams as GetCommentsInput);
            case "addAttachment":
                return await executeAddAttachment(client, validatedParams as AddAttachmentInput);
            case "linkIssues":
                return await executeLinkIssues(client, validatedParams as LinkIssuesInput);
            case "listProjects":
                return await executeListProjects(client, validatedParams as ListProjectsInput);
            case "getProject":
                return await executeGetProject(client, validatedParams as GetProjectInput);
            case "getIssueTypes":
                return await executeGetIssueTypes(client, validatedParams as GetIssueTypesInput);
            case "listFields":
                return await executeListFields(client, validatedParams as ListFieldsInput);
            case "getCustomFieldConfigs":
                return await executeGetCustomFieldConfigs(
                    client,
                    validatedParams as GetCustomFieldConfigsInput
                );
            case "searchUsers":
                return await executeSearchUsers(client, validatedParams as SearchUsersInput);
            case "getCurrentUser":
                return await executeGetCurrentUser(client, validatedParams as GetCurrentUserInput);
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

        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.error?.message || "MCP tool execution failed");
        }
    }

    /**
     * Get or create Jira client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): JiraClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Extract OAuth tokens
        const tokens = connection.data as OAuth2TokenData;

        // Extract cloudId from metadata
        const metadata = connection.metadata as JiraConnectionMetadata;
        if (!metadata?.cloudId) {
            throw new Error("Jira cloudId not found in connection metadata");
        }

        // Create new client
        const client = new JiraClient({
            accessToken: tokens.access_token,
            cloudId: metadata.cloudId,
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

    /**
     * Get cached fields or fetch from API
     */
    async getFields(client: JiraClient, forceRefresh = false): Promise<unknown[]> {
        const cacheKey = "fields";
        const now = Date.now();
        const cacheTimeout = 60 * 60 * 1000; // 1 hour

        // Check cache
        if (!forceRefresh && this.fieldCache.has(cacheKey)) {
            const cached = this.fieldCache.get(cacheKey)!;
            if (now - cached.timestamp < cacheTimeout) {
                return cached.fields;
            }
        }

        // Fetch fields from API
        const fields = await client.get<unknown[]>("/rest/api/3/field");

        // Update cache
        this.fieldCache.set(cacheKey, { fields, timestamp: now });

        return fields;
    }
}
