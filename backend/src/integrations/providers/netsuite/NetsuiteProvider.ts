import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { getLogger } from "../../../core/logging";
import { BaseProvider } from "../../core/BaseProvider";
import { NetsuiteClient } from "./client/NetsuiteClient";
import { NetsuiteMCPAdapter } from "./mcp/NetsuiteMCPAdapter";
import {
    listCustomersOperation,
    executeListCustomers,
    getCustomerOperation,
    executeGetCustomer,
    createCustomerOperation,
    executeCreateCustomer,
    updateCustomerOperation,
    executeUpdateCustomer,
    listSalesOrdersOperation,
    executeListSalesOrders,
    getSalesOrderOperation,
    executeGetSalesOrder,
    createSalesOrderOperation,
    executeCreateSalesOrder,
    listPurchaseOrdersOperation,
    executeListPurchaseOrders,
    getPurchaseOrderOperation,
    executeGetPurchaseOrder,
    createPurchaseOrderOperation,
    executeCreatePurchaseOrder,
    listInvoicesOperation,
    executeListInvoices,
    getInvoiceOperation,
    executeGetInvoice,
    createInvoiceOperation,
    executeCreateInvoice,
    listItemsOperation,
    executeListItems,
    getItemOperation,
    executeGetItem
} from "./operations";
import type { NetsuiteConnectionData } from "./operations/types";
import type { ConnectionWithData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities
} from "../../core/types";

const logger = getLogger();

/**
 * NetSuite Provider
 *
 * Implements OAuth 2.0 authentication and provides 15 operations for:
 * - Customers (list, get, create, update)
 * - Sales Orders (list, get, create)
 * - Purchase Orders (list, get, create)
 * - Invoices (list, get, create)
 * - Items (list, get)
 *
 * Rate Limits: ~300 requests/minute
 * Documentation: https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/
 */
export class NetsuiteProvider extends BaseProvider {
    readonly name = "netsuite";
    readonly displayName = "NetSuite";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 300,
            burstSize: 50
        }
    };

    private clientPool: Map<string, NetsuiteClient> = new Map();
    private mcpAdapter: NetsuiteMCPAdapter;

    constructor() {
        super();

        // Register Customer Operations (4)
        this.registerOperation(listCustomersOperation);
        this.registerOperation(getCustomerOperation);
        this.registerOperation(createCustomerOperation);
        this.registerOperation(updateCustomerOperation);

        // Register Sales Order Operations (3)
        this.registerOperation(listSalesOrdersOperation);
        this.registerOperation(getSalesOrderOperation);
        this.registerOperation(createSalesOrderOperation);

        // Register Purchase Order Operations (3)
        this.registerOperation(listPurchaseOrdersOperation);
        this.registerOperation(getPurchaseOrderOperation);
        this.registerOperation(createPurchaseOrderOperation);

        // Register Invoice Operations (3)
        this.registerOperation(listInvoicesOperation);
        this.registerOperation(getInvoiceOperation);
        this.registerOperation(createInvoiceOperation);

        // Register Item Operations (2)
        this.registerOperation(listItemsOperation);
        this.registerOperation(getItemOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new NetsuiteMCPAdapter(this.operations);

        logger.info(
            { component: "NetsuiteProvider", operationCount: this.operations.size },
            "Registered operations"
        );
    }

    /**
     * Get OAuth configuration
     *
     * Note: NetSuite requires accountId in OAuth URLs. The authUrl and tokenUrl
     * are templates - {accountId} must be replaced with the actual account ID
     * before initiating the OAuth flow.
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl:
                "https://{accountId}.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/authorize",
            tokenUrl:
                "https://{accountId}.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/token",
            scopes: ["rest_webservices", "restlets"],
            clientId: appConfig.oauth.netsuite.clientId,
            clientSecret: appConfig.oauth.netsuite.clientSecret,
            redirectUri: getOAuthRedirectUri("netsuite"),
            refreshable: true
        };

        return config;
    }

    getMCPTools(): MCPTool[] {
        return this.mcpAdapter.getTools();
    }

    async executeMCPTool(
        toolName: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData
    ): Promise<unknown> {
        const client = this.getOrCreateClient(connection);
        return this.mcpAdapter.executeTool(toolName, params, client);
    }

    async executeOperation(
        operation: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        const client = this.getOrCreateClient(connection);

        switch (operation) {
            // Customer Operations
            case "listCustomers":
                return executeListCustomers(
                    client,
                    params as Parameters<typeof executeListCustomers>[1]
                );
            case "getCustomer":
                return executeGetCustomer(
                    client,
                    params as Parameters<typeof executeGetCustomer>[1]
                );
            case "createCustomer":
                return executeCreateCustomer(
                    client,
                    params as Parameters<typeof executeCreateCustomer>[1]
                );
            case "updateCustomer":
                return executeUpdateCustomer(
                    client,
                    params as Parameters<typeof executeUpdateCustomer>[1]
                );

            // Sales Order Operations
            case "listSalesOrders":
                return executeListSalesOrders(
                    client,
                    params as Parameters<typeof executeListSalesOrders>[1]
                );
            case "getSalesOrder":
                return executeGetSalesOrder(
                    client,
                    params as Parameters<typeof executeGetSalesOrder>[1]
                );
            case "createSalesOrder":
                return executeCreateSalesOrder(
                    client,
                    params as Parameters<typeof executeCreateSalesOrder>[1]
                );

            // Purchase Order Operations
            case "listPurchaseOrders":
                return executeListPurchaseOrders(
                    client,
                    params as Parameters<typeof executeListPurchaseOrders>[1]
                );
            case "getPurchaseOrder":
                return executeGetPurchaseOrder(
                    client,
                    params as Parameters<typeof executeGetPurchaseOrder>[1]
                );
            case "createPurchaseOrder":
                return executeCreatePurchaseOrder(
                    client,
                    params as Parameters<typeof executeCreatePurchaseOrder>[1]
                );

            // Invoice Operations
            case "listInvoices":
                return executeListInvoices(
                    client,
                    params as Parameters<typeof executeListInvoices>[1]
                );
            case "getInvoice":
                return executeGetInvoice(client, params as Parameters<typeof executeGetInvoice>[1]);
            case "createInvoice":
                return executeCreateInvoice(
                    client,
                    params as Parameters<typeof executeCreateInvoice>[1]
                );

            // Item Operations
            case "listItems":
                return executeListItems(client, params as Parameters<typeof executeListItems>[1]);
            case "getItem":
                return executeGetItem(client, params as Parameters<typeof executeGetItem>[1]);

            default:
                return {
                    success: false,
                    error: {
                        type: "validation",
                        message: `Unknown operation: ${operation}`,
                        retryable: false
                    }
                };
        }
    }

    private getOrCreateClient(connection: ConnectionWithData): NetsuiteClient {
        const cacheKey = connection.id;

        let client = this.clientPool.get(cacheKey);

        if (!client) {
            const connectionData = connection.data as NetsuiteConnectionData;

            if (!connectionData.access_token) {
                throw new Error("No access token found in connection data");
            }

            const accountId =
                connectionData.accountId ||
                (connection.metadata as Record<string, unknown>)?.accountId;

            if (!accountId || typeof accountId !== "string") {
                throw new Error("No NetSuite account ID found in connection data");
            }

            client = new NetsuiteClient({
                accountId,
                accessToken: connectionData.access_token,
                connectionId: connection.id
            });

            this.clientPool.set(cacheKey, client);
            logger.info(
                { component: "NetsuiteProvider", connectionId: connection.id, accountId },
                "Created new client for connection"
            );
        }

        return client;
    }

    clearClientCache(connectionId: string): void {
        this.clientPool.delete(connectionId);
        logger.info(
            { component: "NetsuiteProvider", connectionId },
            "Cleared client cache for connection"
        );
    }
}
