import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { ApolloClient } from "./client/ApolloClient";
import { ApolloMCPAdapter } from "./mcp/ApolloMCPAdapter";
import {
    searchPeopleOperation,
    executeSearchPeople,
    searchOrganizationsOperation,
    executeSearchOrganizations,
    enrichPersonOperation,
    executeEnrichPerson,
    enrichOrganizationOperation,
    executeEnrichOrganization,
    createContactOperation,
    executeCreateContact,
    getContactOperation,
    executeGetContact,
    updateContactOperation,
    executeUpdateContact,
    deleteContactOperation,
    executeDeleteContact,
    createAccountOperation,
    executeCreateAccount,
    getAccountOperation,
    executeGetAccount,
    updateAccountOperation,
    executeUpdateAccount,
    deleteAccountOperation,
    executeDeleteAccount
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

// Import all operations

/**
 * Apollo.io Provider - Sales intelligence platform integration
 */
export class ApolloProvider extends BaseProvider {
    readonly name = "apollo";
    readonly displayName = "Apollo.io";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 60,
            burstSize: 10
        }
    };

    private mcpAdapter: ApolloMCPAdapter;
    private clientPool: Map<string, ApolloClient> = new Map();

    constructor() {
        super();

        // Register all 12 operations
        this.registerOperation(searchPeopleOperation);
        this.registerOperation(searchOrganizationsOperation);
        this.registerOperation(enrichPersonOperation);
        this.registerOperation(enrichOrganizationOperation);
        this.registerOperation(createContactOperation);
        this.registerOperation(getContactOperation);
        this.registerOperation(updateContactOperation);
        this.registerOperation(deleteContactOperation);
        this.registerOperation(createAccountOperation);
        this.registerOperation(getAccountOperation);
        this.registerOperation(updateAccountOperation);
        this.registerOperation(deleteAccountOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new ApolloMCPAdapter(this.operations);
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://app.apollo.io/#/oauth/authorize",
            tokenUrl: "https://app.apollo.io/api/v1/oauth/token",
            scopes: ["read_user_profile", "app_scopes"],
            clientId: appConfig.oauth.apollo.clientId,
            clientSecret: appConfig.oauth.apollo.clientSecret,
            redirectUri: getOAuthRedirectUri("apollo"),
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
            case "searchPeople":
                return await executeSearchPeople(client, validatedParams as never);
            case "searchOrganizations":
                return await executeSearchOrganizations(client, validatedParams as never);
            case "enrichPerson":
                return await executeEnrichPerson(client, validatedParams as never);
            case "enrichOrganization":
                return await executeEnrichOrganization(client, validatedParams as never);
            case "createContact":
                return await executeCreateContact(client, validatedParams as never);
            case "getContact":
                return await executeGetContact(client, validatedParams as never);
            case "updateContact":
                return await executeUpdateContact(client, validatedParams as never);
            case "deleteContact":
                return await executeDeleteContact(client, validatedParams as never);
            case "createAccount":
                return await executeCreateAccount(client, validatedParams as never);
            case "getAccount":
                return await executeGetAccount(client, validatedParams as never);
            case "updateAccount":
                return await executeUpdateAccount(client, validatedParams as never);
            case "deleteAccount":
                return await executeDeleteAccount(client, validatedParams as never);
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
     * Get or create Apollo client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): ApolloClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const tokens = connection.data as OAuth2TokenData;
        const client = new ApolloClient({
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
