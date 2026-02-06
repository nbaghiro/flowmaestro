/**
 * Sage Integration Provider
 *
 * Sage Business Cloud Accounting with OAuth2 authentication.
 * Supports business info, contacts, and sales invoices.
 *
 * Rate limit: 200 requests/minute per business
 */

import { BaseProvider } from "../../core/BaseProvider";
import { SageClient } from "./client/SageClient";
import { SageMCPAdapter } from "./mcp/SageMCPAdapter";
import {
    // Business Operations
    getBusinessInfoOperation,
    executeGetBusinessInfo,
    // Contact Operations
    listContactsOperation,
    executeListContacts,
    getContactOperation,
    executeGetContact,
    createContactOperation,
    executeCreateContact,
    // Invoice Operations
    listInvoicesOperation,
    executeListInvoices,
    getInvoiceOperation,
    executeGetInvoice,
    createInvoiceOperation,
    executeCreateInvoice
} from "./operations";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    ProviderCapabilities
} from "../../core/types";

export class SageProvider extends BaseProvider {
    readonly name = "sage";
    readonly displayName = "Sage";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 200,
            burstSize: 20
        }
    };

    private clientPool: Map<string, SageClient> = new Map();
    private mcpAdapter: SageMCPAdapter;

    constructor() {
        super();

        // Register Business Operations (1 operation)
        this.registerOperation(getBusinessInfoOperation);

        // Register Contact Operations (3 operations)
        this.registerOperation(listContactsOperation);
        this.registerOperation(getContactOperation);
        this.registerOperation(createContactOperation);

        // Register Invoice Operations (3 operations)
        this.registerOperation(listInvoicesOperation);
        this.registerOperation(getInvoiceOperation);
        this.registerOperation(createInvoiceOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new SageMCPAdapter(this.operations);
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        return {
            headerName: "Authorization",
            headerTemplate: "Bearer {{access_token}}"
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
            // Business Operations
            case "getBusinessInfo":
                return executeGetBusinessInfo(client, params as never);

            // Contact Operations
            case "listContacts":
                return executeListContacts(client, params as never);
            case "getContact":
                return executeGetContact(client, params as never);
            case "createContact":
                return executeCreateContact(client, params as never);

            // Invoice Operations
            case "listInvoices":
                return executeListInvoices(client, params as never);
            case "getInvoice":
                return executeGetInvoice(client, params as never);
            case "createInvoice":
                return executeCreateInvoice(client, params as never);

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
    private getOrCreateClient(connection: ConnectionWithData): SageClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const data = connection.data as OAuth2TokenData;

        if (!data.access_token) {
            throw new Error("Sage access token is required");
        }

        const client = new SageClient({
            accessToken: data.access_token,
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
