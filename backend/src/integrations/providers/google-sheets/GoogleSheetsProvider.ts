import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { GoogleSheetsClient } from "./client/GoogleSheetsClient";
import {
    // Spreadsheet operations
    createSpreadsheetOperation,
    executeCreateSpreadsheet,
    getSpreadsheetOperation,
    executeGetSpreadsheet,
    batchUpdateSpreadsheetOperation,
    executeBatchUpdateSpreadsheet,
    // Values read operations
    getValuesOperation,
    executeGetValues,
    batchGetValuesOperation,
    executeBatchGetValues,
    // Values write operations
    appendValuesOperation,
    executeAppendValues,
    updateValuesOperation,
    executeUpdateValues,
    batchUpdateValuesOperation,
    executeBatchUpdateValues,
    clearValuesOperation,
    executeClearValues,
    batchClearValuesOperation,
    executeBatchClearValues,
    // Sheet management operations
    addSheetOperation,
    executeAddSheet,
    deleteSheetOperation,
    executeDeleteSheet,
    copySheetOperation,
    executeCopySheet,
    updateSheetPropertiesOperation,
    executeUpdateSheetProperties,
    // Formatting operations
    formatCellsOperation,
    executeFormatCells,
    mergeCellsOperation,
    executeMergeCells,
    unmergeCellsOperation,
    executeUnmergeCells,
    autoResizeOperation,
    executeAutoResize
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities,
    WebhookRequestData
} from "../../core/types";

/**
 * Google Sheets Provider - implements OAuth2 authentication with REST API operations
 *
 * ## Setup Instructions
 *
 * ### 1. Create Google Cloud Project
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing one
 * 3. Enable Google Sheets API:
 *    - Go to "APIs & Services" > "Library"
 *    - Search for "Google Sheets API"
 *    - Click "Enable"
 *
 * ### 2. Create OAuth 2.0 Credentials
 * 1. Go to "APIs & Services" > "Credentials"
 * 2. Click "Create Credentials" > "OAuth client ID"
 * 3. Configure consent screen if prompted:
 *    - User Type: External (or Internal for Workspace)
 *    - App name: FlowMaestro (or your app name)
 *    - Support email: Your email
 *    - Scopes: Add https://www.googleapis.com/auth/spreadsheets
 *    - Test users: Add your email for testing
 * 4. Create OAuth client ID:
 *    - Application type: Web application
 *    - Name: FlowMaestro Google Sheets
 *    - Authorized redirect URIs: http://localhost:3001/api/oauth/google-sheets/callback
 *      (replace with your API_URL in production)
 * 5. Copy Client ID and Client Secret
 *
 * ### 3. Configure Environment Variables
 * Add to your `.env` file:
 * ```
 * GOOGLE_CLIENT_ID=your_client_id_here
 * GOOGLE_CLIENT_SECRET=your_client_secret_here
 * ```
 *
 * Note: This uses the shared Google OAuth client (GOOGLE_CLIENT_ID) that also
 * supports Drive, Calendar, Gmail, and user authentication. The consent screen
 * should include the spreadsheets scope along with other Google API scopes.
 *
 * ### 4. OAuth Scopes
 * Required scope for this provider:
 * - `https://www.googleapis.com/auth/spreadsheets` - Full read/write access
 *
 * The shared Google OAuth client may also include other scopes for Drive,
 * Calendar, Gmail, etc. This is normal and allows multiple Google integrations
 * to use the same OAuth client.
 *
 * ### 5. Rate Limits
 * - Google Sheets API has quota limits per project
 * - Default: 60 read/write requests per minute per user
 * - Monitor usage in Google Cloud Console
 *
 * ### 6. Testing Connection
 * After setup, test the connection by:
 * 1. Creating a connection in FlowMaestro
 * 2. Authorizing via OAuth flow
 * 3. Running "Test Connection" to verify access
 */
export class GoogleSheetsProvider extends BaseProvider {
    readonly name = "google-sheets";
    readonly displayName = "Google Sheets";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true, // Polling-based triggers
        supportsPolling: true,
        rateLimit: {
            tokensPerMinute: 60 // 60 requests per minute per user
        }
    };

    private clientPool: Map<string, GoogleSheetsClient> = new Map();

    constructor() {
        super();

        // Register spreadsheet operations
        this.registerOperation(createSpreadsheetOperation);
        this.registerOperation(getSpreadsheetOperation);
        this.registerOperation(batchUpdateSpreadsheetOperation);

        // Register values read operations
        this.registerOperation(getValuesOperation);
        this.registerOperation(batchGetValuesOperation);

        // Register values write operations
        this.registerOperation(appendValuesOperation);
        this.registerOperation(updateValuesOperation);
        this.registerOperation(batchUpdateValuesOperation);
        this.registerOperation(clearValuesOperation);
        this.registerOperation(batchClearValuesOperation);

        // Register sheet management operations
        this.registerOperation(addSheetOperation);
        this.registerOperation(deleteSheetOperation);
        this.registerOperation(copySheetOperation);
        this.registerOperation(updateSheetPropertiesOperation);

        // Register formatting operations
        this.registerOperation(formatCellsOperation);
        this.registerOperation(mergeCellsOperation);
        this.registerOperation(unmergeCellsOperation);
        this.registerOperation(autoResizeOperation);

        // Configure webhook settings (polling-based)
        this.setWebhookConfig({
            setupType: "polling", // Google Sheets doesn't have real webhooks
            signatureType: "none"
        });

        // Register trigger events (polling-based)
        this.registerTrigger({
            id: "row_added",
            name: "Row Added",
            description: "Triggered when a new row is added to a spreadsheet",
            requiredScopes: ["https://www.googleapis.com/auth/spreadsheets"],
            configFields: [
                {
                    name: "spreadsheetId",
                    label: "Spreadsheet",
                    type: "text",
                    required: true,
                    description: "The ID of the spreadsheet to monitor",
                    placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                },
                {
                    name: "sheetName",
                    label: "Sheet Name",
                    type: "text",
                    required: false,
                    description: "Specific sheet to monitor (leave empty for first sheet)",
                    placeholder: "Sheet1"
                }
            ],
            tags: ["rows", "data"]
        });

        this.registerTrigger({
            id: "row_updated",
            name: "Row Updated",
            description: "Triggered when a row is modified in a spreadsheet",
            requiredScopes: ["https://www.googleapis.com/auth/spreadsheets"],
            configFields: [
                {
                    name: "spreadsheetId",
                    label: "Spreadsheet",
                    type: "text",
                    required: true,
                    description: "The ID of the spreadsheet to monitor",
                    placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                },
                {
                    name: "sheetName",
                    label: "Sheet Name",
                    type: "text",
                    required: false,
                    description: "Specific sheet to monitor (leave empty for first sheet)",
                    placeholder: "Sheet1"
                },
                {
                    name: "columns",
                    label: "Columns to Watch",
                    type: "text",
                    required: false,
                    description: "Specific columns to monitor (comma-separated, e.g., A,B,C)",
                    placeholder: "A,B,C"
                }
            ],
            tags: ["rows", "data"]
        });

        this.registerTrigger({
            id: "cell_changed",
            name: "Cell Changed",
            description: "Triggered when a specific cell or range changes",
            requiredScopes: ["https://www.googleapis.com/auth/spreadsheets"],
            configFields: [
                {
                    name: "spreadsheetId",
                    label: "Spreadsheet",
                    type: "text",
                    required: true,
                    description: "The ID of the spreadsheet to monitor",
                    placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                },
                {
                    name: "range",
                    label: "Cell Range",
                    type: "text",
                    required: true,
                    description: "The cell or range to monitor (A1 notation)",
                    placeholder: "Sheet1!A1:B10"
                }
            ],
            tags: ["cells", "data"]
        });
    }

    /**
     * Extract event type from polling result
     * (Not used for actual webhooks since Google Sheets uses polling)
     */
    override extractEventType(_request: WebhookRequestData): string | undefined {
        return undefined;
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
            tokenUrl: "https://oauth2.googleapis.com/token",
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
            clientId: appConfig.oauth.google.clientId,
            clientSecret: appConfig.oauth.google.clientSecret,
            redirectUri: getOAuthRedirectUri("google"),
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
            // Spreadsheet operations
            case "createSpreadsheet":
                return await executeCreateSpreadsheet(client, validatedParams as never);
            case "getSpreadsheet":
                return await executeGetSpreadsheet(client, validatedParams as never);
            case "batchUpdateSpreadsheet":
                return await executeBatchUpdateSpreadsheet(client, validatedParams as never);

            // Values read operations
            case "getValues":
                return await executeGetValues(client, validatedParams as never);
            case "batchGetValues":
                return await executeBatchGetValues(client, validatedParams as never);

            // Values write operations
            case "appendValues":
                return await executeAppendValues(client, validatedParams as never);
            case "updateValues":
                return await executeUpdateValues(client, validatedParams as never);
            case "batchUpdateValues":
                return await executeBatchUpdateValues(client, validatedParams as never);
            case "clearValues":
                return await executeClearValues(client, validatedParams as never);
            case "batchClearValues":
                return await executeBatchClearValues(client, validatedParams as never);

            // Sheet management operations
            case "addSheet":
                return await executeAddSheet(client, validatedParams as never);
            case "deleteSheet":
                return await executeDeleteSheet(client, validatedParams as never);
            case "copySheet":
                return await executeCopySheet(client, validatedParams as never);
            case "updateSheetProperties":
                return await executeUpdateSheetProperties(client, validatedParams as never);

            // Formatting operations
            case "formatCells":
                return await executeFormatCells(client, validatedParams as never);
            case "mergeCells":
                return await executeMergeCells(client, validatedParams as never);
            case "unmergeCells":
                return await executeUnmergeCells(client, validatedParams as never);
            case "autoResize":
                return await executeAutoResize(client, validatedParams as never);

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
        // Convert operations to MCP tools with google_sheets_ prefix
        return this.getOperations().map((op) => ({
            name: `google_sheets_${op.id}`,
            description: op.description,
            inputSchema: op.inputSchemaJSON
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
        // Remove google_sheets_ prefix to get operation ID
        const operationId = toolName.replace("google_sheets_", "");

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
     * Get or create Google Sheets client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): GoogleSheetsClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as OAuth2TokenData;
        const client = new GoogleSheetsClient({
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
