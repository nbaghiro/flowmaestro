import { BaseProvider } from "../../core/BaseProvider";
import { ChargebeeClient } from "./client/ChargebeeClient";
import { ChargebeeMCPAdapter } from "./mcp/ChargebeeMCPAdapter";
// Customer operations
import {
    listCustomersOperation,
    executeListCustomers,
    getCustomerOperation,
    executeGetCustomer,
    createCustomerOperation,
    executeCreateCustomer
} from "./operations/customers";
// Subscription operations
import {
    listInvoicesOperation,
    executeListInvoices,
    getInvoiceOperation,
    executeGetInvoice
} from "./operations/invoices";
import {
    listSubscriptionsOperation,
    executeListSubscriptions,
    getSubscriptionOperation,
    executeGetSubscription,
    createSubscriptionOperation,
    executeCreateSubscription
} from "./operations/subscriptions";
// Invoice operations
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    APIKeyConfig,
    ProviderCapabilities
} from "../../core/types";

/**
 * Chargebee Provider - implements API Key authentication with subscription billing operations
 *
 * Chargebee uses HTTP Basic Auth:
 * - API key as username, empty password
 * - Site subdomain stored in api_secret field
 * - Base URL: https://{site}.chargebee.com/api/v2
 *
 * Rate limit: 150 requests/minute
 */
export class ChargebeeProvider extends BaseProvider {
    readonly name = "chargebee";
    readonly displayName = "Chargebee";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 150
        }
    };

    private mcpAdapter: ChargebeeMCPAdapter;
    private clientPool: Map<string, ChargebeeClient> = new Map();

    constructor() {
        super();

        // Register Customer operations
        this.registerOperation(listCustomersOperation);
        this.registerOperation(getCustomerOperation);
        this.registerOperation(createCustomerOperation);

        // Register Subscription operations
        this.registerOperation(listSubscriptionsOperation);
        this.registerOperation(getSubscriptionOperation);
        this.registerOperation(createSubscriptionOperation);

        // Register Invoice operations
        this.registerOperation(listInvoicesOperation);
        this.registerOperation(getInvoiceOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new ChargebeeMCPAdapter(this.operations);
    }

    /**
     * Get API Key configuration
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "Authorization",
            headerTemplate: "Basic {{base64(api_key + ':')}}"
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
            // Customer operations
            case "listCustomers":
                return await executeListCustomers(client, validatedParams as never);
            case "getCustomer":
                return await executeGetCustomer(client, validatedParams as never);
            case "createCustomer":
                return await executeCreateCustomer(client, validatedParams as never);
            // Subscription operations
            case "listSubscriptions":
                return await executeListSubscriptions(client, validatedParams as never);
            case "getSubscription":
                return await executeGetSubscription(client, validatedParams as never);
            case "createSubscription":
                return await executeCreateSubscription(client, validatedParams as never);
            // Invoice operations
            case "listInvoices":
                return await executeListInvoices(client, validatedParams as never);
            case "getInvoice":
                return await executeGetInvoice(client, validatedParams as never);
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
     * Get or create Chargebee client (with connection pooling)
     *
     * Chargebee requires API key and site subdomain
     */
    private getOrCreateClient(connection: ConnectionWithData): ChargebeeClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        // Chargebee uses api_key for the API key and api_secret for the site subdomain
        const data = connection.data as ApiKeyData;
        const client = new ChargebeeClient({
            apiKey: data.api_key,
            site: data.api_secret || "" // Site subdomain is stored in api_secret field
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
