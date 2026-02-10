/**
 * Xero Integration Provider
 *
 * Cloud accounting software with OAuth2 authentication.
 * Supports organisations, contacts, and invoices.
 *
 * Rate limit: 60 requests/minute per organisation
 */

import { BaseProvider } from "../../core/BaseProvider";
import { XeroClient } from "./client/XeroClient";
import { XeroMCPAdapter } from "./mcp/XeroMCPAdapter";
import {
    // Organisation Operations
    getOrganisationOperation,
    executeGetOrganisation,
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

export class XeroProvider extends BaseProvider {
    readonly name = "xero";
    readonly displayName = "Xero";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 60,
            burstSize: 10
        }
    };

    private clientPool: Map<string, XeroClient> = new Map();
    private mcpAdapter: XeroMCPAdapter;

    constructor() {
        super();

        // Register Organisation Operations (1 operation)
        this.registerOperation(getOrganisationOperation);

        // Register Contact Operations (3 operations)
        this.registerOperation(listContactsOperation);
        this.registerOperation(getContactOperation);
        this.registerOperation(createContactOperation);

        // Register Invoice Operations (3 operations)
        this.registerOperation(listInvoicesOperation);
        this.registerOperation(getInvoiceOperation);
        this.registerOperation(createInvoiceOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new XeroMCPAdapter(this.operations);
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
            // Organisation Operations
            case "getOrganisation":
                return executeGetOrganisation(client, params as never);

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
    private getOrCreateClient(connection: ConnectionWithData): XeroClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get OAuth2 data from connection
        // Xero stores tenantId in the token data (obtained from /connections endpoint)
        const data = connection.data as OAuth2TokenData & {
            tenant_id?: string;
            tenantId?: string;
        };

        if (!data.access_token) {
            throw new Error("Xero access token is required");
        }

        // Xero requires tenantId for all API requests
        const tenantId = data.tenant_id || data.tenantId;
        if (!tenantId) {
            throw new Error("Xero tenant ID is required");
        }

        const client = new XeroClient({
            accessToken: data.access_token,
            tenantId: tenantId,
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
