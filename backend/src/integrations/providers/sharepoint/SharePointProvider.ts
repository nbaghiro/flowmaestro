import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { toJSONSchema } from "../../../core/utils/zod-to-json-schema";
import { BaseProvider } from "../../core/BaseProvider";
import { SharePointClient } from "./client/SharePointClient";
import {
    listSitesOperation,
    executeListSites,
    getSiteOperation,
    executeGetSite,
    listListsOperation,
    executeListLists,
    getListOperation,
    executeGetList,
    listItemsOperation,
    executeListItems,
    createItemOperation,
    executeCreateItem,
    listDriveItemsOperation,
    executeListDriveItems,
    searchContentOperation,
    executeSearchContent
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
 * SharePoint Provider
 * Provides integration with Microsoft SharePoint via the Graph API
 */
export class SharePointProvider extends BaseProvider {
    readonly name = "sharepoint";
    readonly displayName = "SharePoint";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 600
        }
    };

    private clientPool: Map<string, SharePointClient> = new Map();

    constructor() {
        super();

        // Register site operations
        this.registerOperation(listSitesOperation);
        this.registerOperation(getSiteOperation);

        // Register list operations
        this.registerOperation(listListsOperation);
        this.registerOperation(getListOperation);

        // Register item operations
        this.registerOperation(listItemsOperation);
        this.registerOperation(createItemOperation);

        // Register file operations
        this.registerOperation(listDriveItemsOperation);

        // Register search operations
        this.registerOperation(searchContentOperation);
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            scopes: ["User.Read", "Sites.ReadWrite.All", "offline_access"],
            clientId: appConfig.oauth.microsoft.clientId,
            clientSecret: appConfig.oauth.microsoft.clientSecret,
            redirectUri: getOAuthRedirectUri("microsoft"),
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
        const validatedParams = this.validateParams(operationId, params);
        const client = this.getOrCreateClient(connection);

        switch (operationId) {
            case "listSites":
                return await executeListSites(client, validatedParams as never);
            case "getSite":
                return await executeGetSite(client, validatedParams as never);
            case "listLists":
                return await executeListLists(client, validatedParams as never);
            case "getList":
                return await executeGetList(client, validatedParams as never);
            case "listItems":
                return await executeListItems(client, validatedParams as never);
            case "createItem":
                return await executeCreateItem(client, validatedParams as never);
            case "listDriveItems":
                return await executeListDriveItems(client, validatedParams as never);
            case "searchContent":
                return await executeSearchContent(client, validatedParams as never);
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
        return this.getOperations().map((op) => ({
            name: `sharepoint_${op.id}`,
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
        const operationId = toolName.replace("sharepoint_", "");

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
     * Get or create SharePoint client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): SharePointClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const data = connection.data as OAuth2TokenData;
        const client = new SharePointClient({
            accessToken: data.access_token
        });

        this.clientPool.set(poolKey, client);

        return client;
    }

    /**
     * Clear client from pool
     */
    clearClient(connectionId: string): void {
        this.clientPool.delete(connectionId);
    }
}
