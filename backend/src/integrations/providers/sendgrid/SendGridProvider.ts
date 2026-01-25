/**
 * SendGrid Integration Provider
 *
 * Transactional email delivery platform with API Key authentication.
 * Supports email sending, contact management, lists, templates, validation, and analytics.
 *
 * Rate limit: 600 requests/minute
 */

import { BaseProvider } from "../../core/BaseProvider";
import { SendGridClient } from "./client/SendGridClient";
import { SendGridMCPAdapter } from "./mcp/SendGridMCPAdapter";
import {
    // Email Operations
    sendEmailOperation,
    executeSendEmail,
    sendTemplateEmailOperation,
    executeSendTemplateEmail,
    sendBatchEmailOperation,
    executeSendBatchEmail,
    // Contact Operations
    getContactsOperation,
    executeGetContacts,
    getContactOperation,
    executeGetContact,
    addContactsOperation,
    executeAddContacts,
    updateContactOperation,
    executeUpdateContact,
    deleteContactsOperation,
    executeDeleteContacts,
    searchContactsOperation,
    executeSearchContacts,
    // List Operations
    getListsOperation,
    executeGetLists,
    getListOperation,
    executeGetList,
    createListOperation,
    executeCreateList,
    updateListOperation,
    executeUpdateList,
    deleteListOperation,
    executeDeleteList,
    addContactsToListOperation,
    executeAddContactsToList,
    removeContactsFromListOperation,
    executeRemoveContactsFromList,
    // Template Operations
    getTemplatesOperation,
    executeGetTemplates,
    getTemplateOperation,
    executeGetTemplate,
    // Validation Operations
    validateEmailOperation,
    executeValidateEmail,
    // Analytics Operations
    getStatsOperation,
    executeGetStats
} from "./operations";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

export class SendGridProvider extends BaseProvider {
    readonly name = "sendgrid";
    readonly displayName = "SendGrid";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 600,
            burstSize: 100
        }
    };

    private clientPool: Map<string, SendGridClient> = new Map();
    private mcpAdapter: SendGridMCPAdapter;

    constructor() {
        super();

        // Register Email Operations (3 operations)
        this.registerOperation(sendEmailOperation);
        this.registerOperation(sendTemplateEmailOperation);
        this.registerOperation(sendBatchEmailOperation);

        // Register Contact Operations (6 operations)
        this.registerOperation(getContactsOperation);
        this.registerOperation(getContactOperation);
        this.registerOperation(addContactsOperation);
        this.registerOperation(updateContactOperation);
        this.registerOperation(deleteContactsOperation);
        this.registerOperation(searchContactsOperation);

        // Register List Operations (7 operations)
        this.registerOperation(getListsOperation);
        this.registerOperation(getListOperation);
        this.registerOperation(createListOperation);
        this.registerOperation(updateListOperation);
        this.registerOperation(deleteListOperation);
        this.registerOperation(addContactsToListOperation);
        this.registerOperation(removeContactsFromListOperation);

        // Register Template Operations (2 operations)
        this.registerOperation(getTemplatesOperation);
        this.registerOperation(getTemplateOperation);

        // Register Validation Operations (1 operation)
        this.registerOperation(validateEmailOperation);

        // Register Analytics Operations (1 operation)
        this.registerOperation(getStatsOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new SendGridMCPAdapter(this.operations);
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
            // Email Operations
            case "sendEmail":
                return executeSendEmail(client, params as never);
            case "sendTemplateEmail":
                return executeSendTemplateEmail(client, params as never);
            case "sendBatchEmail":
                return executeSendBatchEmail(client, params as never);

            // Contact Operations
            case "getContacts":
                return executeGetContacts(client, params as never);
            case "getContact":
                return executeGetContact(client, params as never);
            case "addContacts":
                return executeAddContacts(client, params as never);
            case "updateContact":
                return executeUpdateContact(client, params as never);
            case "deleteContacts":
                return executeDeleteContacts(client, params as never);
            case "searchContacts":
                return executeSearchContacts(client, params as never);

            // List Operations
            case "getLists":
                return executeGetLists(client, params as never);
            case "getList":
                return executeGetList(client, params as never);
            case "createList":
                return executeCreateList(client, params as never);
            case "updateList":
                return executeUpdateList(client, params as never);
            case "deleteList":
                return executeDeleteList(client, params as never);
            case "addContactsToList":
                return executeAddContactsToList(client, params as never);
            case "removeContactsFromList":
                return executeRemoveContactsFromList(client, params as never);

            // Template Operations
            case "getTemplates":
                return executeGetTemplates(client, params as never);
            case "getTemplate":
                return executeGetTemplate(client, params as never);

            // Validation Operations
            case "validateEmail":
                return executeValidateEmail(client, params as never);

            // Analytics Operations
            case "getStats":
                return executeGetStats(client, params as never);

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
     */
    private getOrCreateClient(connection: ConnectionWithData): SendGridClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get API key from connection data
        const data = connection.data as ApiKeyData;

        if (!data.api_key) {
            throw new Error("SendGrid API key is required");
        }

        const client = new SendGridClient({
            apiKey: data.api_key,
            connectionId: connection.id
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
