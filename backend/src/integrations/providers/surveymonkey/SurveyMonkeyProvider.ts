import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { toJSONSchema } from "../../../core/utils/zod-to-json-schema";
import { BaseProvider } from "../../core/BaseProvider";
import { SurveyMonkeyClient } from "./client/SurveyMonkeyClient";
import {
    listSurveysOperation,
    executeListSurveys,
    getSurveyOperation,
    executeGetSurvey,
    getSurveyDetailsOperation,
    executeGetSurveyDetails,
    listResponsesOperation,
    executeListResponses,
    getResponseDetailsOperation,
    executeGetResponseDetails,
    listCollectorsOperation,
    executeListCollectors
} from "./operations";
import type { GetResponseDetailsParams } from "./operations/getResponseDetails";
import type { GetSurveyParams } from "./operations/getSurvey";
import type { GetSurveyDetailsParams } from "./operations/getSurveyDetails";
import type { ListCollectorsParams } from "./operations/listCollectors";
import type { ListResponsesParams } from "./operations/listResponses";
import type { ListSurveysParams } from "./operations/listSurveys";
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
 * SurveyMonkey Provider - implements OAuth2 authentication with REST API operations
 *
 * Provides read-only access to SurveyMonkey surveys, responses, and collectors.
 */
export class SurveyMonkeyProvider extends BaseProvider {
    readonly name = "surveymonkey";
    readonly displayName = "SurveyMonkey";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 120 // 120 requests per minute
        }
    };

    private clientPool: Map<string, SurveyMonkeyClient> = new Map();

    constructor() {
        super();

        // Register operations
        this.registerOperation(listSurveysOperation);
        this.registerOperation(getSurveyOperation);
        this.registerOperation(getSurveyDetailsOperation);
        this.registerOperation(listResponsesOperation);
        this.registerOperation(getResponseDetailsOperation);
        this.registerOperation(listCollectorsOperation);
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://api.surveymonkey.com/oauth/authorize",
            tokenUrl: "https://api.surveymonkey.com/oauth/token",
            scopes: [
                "users_read",
                "surveys_read",
                "collectors_read",
                "responses_read",
                "responses_read_detail"
            ],
            clientId: appConfig.oauth.surveymonkey.clientId,
            clientSecret: appConfig.oauth.surveymonkey.clientSecret,
            redirectUri: getOAuthRedirectUri("surveymonkey"),
            // SurveyMonkey tokens don't expire for authorized apps
            refreshable: false
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
            case "listSurveys":
                return await executeListSurveys(client, validatedParams as ListSurveysParams);
            case "getSurvey":
                return await executeGetSurvey(client, validatedParams as GetSurveyParams);
            case "getSurveyDetails":
                return await executeGetSurveyDetails(
                    client,
                    validatedParams as GetSurveyDetailsParams
                );
            case "listResponses":
                return await executeListResponses(client, validatedParams as ListResponsesParams);
            case "getResponseDetails":
                return await executeGetResponseDetails(
                    client,
                    validatedParams as GetResponseDetailsParams
                );
            case "listCollectors":
                return await executeListCollectors(client, validatedParams as ListCollectorsParams);
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
        // Convert operations to MCP tools with surveymonkey_ prefix
        return this.getOperations().map((op) => ({
            name: `surveymonkey_${op.id}`,
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
        // Remove surveymonkey_ prefix to get operation ID
        const operationId = toolName.replace("surveymonkey_", "");

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
     * Get or create SurveyMonkey client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): SurveyMonkeyClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as OAuth2TokenData;
        const client = new SurveyMonkeyClient({
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
