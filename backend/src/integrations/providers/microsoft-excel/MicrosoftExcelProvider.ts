import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { toJSONSchema } from "../../../core/utils/zod-to-json-schema";
import { BaseProvider } from "../../core/BaseProvider";
import { MicrosoftExcelClient } from "./client/MicrosoftExcelClient";
import {
    getWorksheetsOperation,
    executeGetWorksheets,
    readRangeOperation,
    executeReadRange,
    writeRangeOperation,
    executeWriteRange,
    getTablesOperation,
    executeGetTables,
    getTableRowsOperation,
    executeGetTableRows,
    addTableRowOperation,
    executeAddTableRow,
    createWorksheetOperation,
    executeCreateWorksheet,
    getUsedRangeOperation,
    executeGetUsedRange,
    clearRangeOperation,
    executeClearRange
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
 * Microsoft Excel Provider - implements OAuth2 authentication with Excel REST API
 *
 * ## Important Notes
 *
 * - Excel REST API works best with OneDrive for Business/SharePoint
 * - Personal OneDrive accounts have limited Excel API support
 * - Workbooks must be stored in OneDrive/SharePoint to use this API
 *
 * ## Setup Instructions
 *
 * ### 1. Create Azure AD Application
 * Same setup as Microsoft OneDrive - uses shared MICROSOFT_CLIENT_ID
 *
 * ### 2. Configure API Permissions
 * Required Delegated permissions:
 * - Files.ReadWrite (Read and write user files)
 * - User.Read (Sign in and read user profile)
 * - offline_access (Maintain access)
 *
 * ### 3. Configure Environment Variables
 * ```
 * MICROSOFT_CLIENT_ID=your_client_id
 * MICROSOFT_CLIENT_SECRET=your_client_secret
 * ```
 *
 * ### 4. Usage
 * 1. User connects OneDrive via OAuth
 * 2. Get the itemId of an Excel file from OneDrive
 * 3. Use the itemId to perform Excel operations
 */
export class MicrosoftExcelProvider extends BaseProvider {
    readonly name = "microsoft-excel";
    readonly displayName = "Microsoft Excel";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 600
        }
    };

    private clientPool: Map<string, MicrosoftExcelClient> = new Map();

    constructor() {
        super();

        // Register worksheet operations
        this.registerOperation(getWorksheetsOperation);
        this.registerOperation(createWorksheetOperation);

        // Register data operations
        this.registerOperation(readRangeOperation);
        this.registerOperation(writeRangeOperation);
        this.registerOperation(getUsedRangeOperation);
        this.registerOperation(clearRangeOperation);

        // Register table operations
        this.registerOperation(getTablesOperation);
        this.registerOperation(getTableRowsOperation);
        this.registerOperation(addTableRowOperation);
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            scopes: ["User.Read", "Files.ReadWrite", "offline_access"],
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
            // Worksheet operations
            case "getWorksheets":
                return await executeGetWorksheets(client, validatedParams as never);
            case "createWorksheet":
                return await executeCreateWorksheet(client, validatedParams as never);

            // Data operations
            case "readRange":
                return await executeReadRange(client, validatedParams as never);
            case "writeRange":
                return await executeWriteRange(client, validatedParams as never);
            case "getUsedRange":
                return await executeGetUsedRange(client, validatedParams as never);
            case "clearRange":
                return await executeClearRange(client, validatedParams as never);

            // Table operations
            case "getTables":
                return await executeGetTables(client, validatedParams as never);
            case "getTableRows":
                return await executeGetTableRows(client, validatedParams as never);
            case "addTableRow":
                return await executeAddTableRow(client, validatedParams as never);

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
            name: `microsoft_excel_${op.id}`,
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
        const operationId = toolName.replace("microsoft_excel_", "");

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
     * Get or create Excel client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): MicrosoftExcelClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const data = connection.data as OAuth2TokenData;
        const client = new MicrosoftExcelClient({
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
