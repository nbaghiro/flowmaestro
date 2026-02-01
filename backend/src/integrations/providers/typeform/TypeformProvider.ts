import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { toJSONSchema } from "../../../core/utils/zod-to-json-schema";
import { BaseProvider } from "../../core/BaseProvider";
import { TypeformClient } from "./client/TypeformClient";
import {
    listFormsOperation,
    executeListForms,
    getFormOperation,
    executeGetForm,
    listResponsesOperation,
    executeListResponses,
    listWorkspacesOperation,
    executeListWorkspaces
} from "./operations";
import type { GetFormParams } from "./operations/getForm";
import type { ListFormsParams } from "./operations/listForms";
import type { ListResponsesParams } from "./operations/listResponses";
import type { ListWorkspacesParams } from "./operations/listWorkspaces";
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
 * Typeform Provider - implements OAuth2 authentication with REST API operations
 *
 * Provides read-only access to Typeform forms, responses, and workspaces.
 */
export class TypeformProvider extends BaseProvider {
    readonly name = "typeform";
    readonly displayName = "Typeform";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 60 // ~1 request per second recommended
        }
    };

    private clientPool: Map<string, TypeformClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(listFormsOperation);
        this.registerOperation(getFormOperation);
        this.registerOperation(listResponsesOperation);
        this.registerOperation(listWorkspacesOperation);
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://api.typeform.com/oauth/authorize",
            tokenUrl: "https://api.typeform.com/oauth/token",
            scopes: ["accounts:read", "forms:read", "responses:read", "workspaces:read", "offline"],
            clientId: appConfig.oauth.typeform.clientId,
            clientSecret: appConfig.oauth.typeform.clientSecret,
            redirectUri: getOAuthRedirectUri("typeform"),
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
            case "listForms":
                return await executeListForms(client, validatedParams as ListFormsParams);
            case "getForm":
                return await executeGetForm(client, validatedParams as GetFormParams);
            case "listResponses":
                return await executeListResponses(client, validatedParams as ListResponsesParams);
            case "listWorkspaces":
                return await executeListWorkspaces(client, validatedParams as ListWorkspacesParams);
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
        // Convert operations to MCP tools with typeform_ prefix
        return this.getOperations().map((op) => ({
            name: `typeform_${op.id}`,
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
        // Remove typeform_ prefix to get operation ID
        const operationId = toolName.replace("typeform_", "");

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
     * Get or create Typeform client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): TypeformClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as OAuth2TokenData;
        const client = new TypeformClient({
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
