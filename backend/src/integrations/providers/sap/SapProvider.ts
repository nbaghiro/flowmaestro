import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { getLogger } from "../../../core/logging";
import { BaseProvider } from "../../core/BaseProvider";
import { SapClient } from "./client/SapClient";
import { SapMCPAdapter } from "./mcp/SapMCPAdapter";
import {
    listBusinessPartnersOperation,
    executeListBusinessPartners,
    getBusinessPartnerOperation,
    executeGetBusinessPartner,
    createBusinessPartnerOperation,
    executeCreateBusinessPartner,
    updateBusinessPartnerOperation,
    executeUpdateBusinessPartner,
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
    listMaterialsOperation,
    executeListMaterials,
    getMaterialOperation,
    executeGetMaterial,
    listInvoicesOperation,
    executeListInvoices,
    getInvoiceOperation,
    executeGetInvoice
} from "./operations";
import type { SapConnectionData } from "./operations/types";
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
 * SAP S/4HANA Cloud Provider
 *
 * Implements OAuth 2.0 authentication and provides 14 operations for:
 * - Business Partners (list, get, create, update)
 * - Sales Orders (list, get, create)
 * - Purchase Orders (list, get, create)
 * - Materials/Products (list, get)
 * - Invoices/Billing Documents (list, get)
 *
 * Rate Limits: ~300 requests/minute
 * Documentation: https://api.sap.com/
 */
export class SapProvider extends BaseProvider {
    readonly name = "sap";
    readonly displayName = "SAP";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: false,
        rateLimit: {
            tokensPerMinute: 300,
            burstSize: 50
        }
    };

    private clientPool: Map<string, SapClient> = new Map();
    private mcpAdapter: SapMCPAdapter;

    constructor() {
        super();

        // Register Business Partner Operations (4)
        this.registerOperation(listBusinessPartnersOperation);
        this.registerOperation(getBusinessPartnerOperation);
        this.registerOperation(createBusinessPartnerOperation);
        this.registerOperation(updateBusinessPartnerOperation);

        // Register Sales Order Operations (3)
        this.registerOperation(listSalesOrdersOperation);
        this.registerOperation(getSalesOrderOperation);
        this.registerOperation(createSalesOrderOperation);

        // Register Purchase Order Operations (3)
        this.registerOperation(listPurchaseOrdersOperation);
        this.registerOperation(getPurchaseOrderOperation);
        this.registerOperation(createPurchaseOrderOperation);

        // Register Material Operations (2)
        this.registerOperation(listMaterialsOperation);
        this.registerOperation(getMaterialOperation);

        // Register Invoice Operations (2)
        this.registerOperation(listInvoicesOperation);
        this.registerOperation(getInvoiceOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new SapMCPAdapter(this.operations);

        logger.info(
            { component: "SapProvider", operationCount: this.operations.size },
            "Registered operations"
        );
    }

    /**
     * Get OAuth configuration
     *
     * Note: SAP requires host in OAuth URLs. The authUrl and tokenUrl
     * are templates - {host} must be replaced with the actual host
     * before initiating the OAuth flow.
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://{host}/sap/bc/sec/oauth2/authorize",
            tokenUrl: "https://{host}/sap/bc/sec/oauth2/token",
            scopes: [
                "API_BUSINESS_PARTNER",
                "API_SALES_ORDER_SRV",
                "API_PURCHASEORDER_PROCESS_SRV",
                "API_BILLING_DOCUMENT_SRV",
                "API_PRODUCT_SRV"
            ],
            clientId: appConfig.oauth.sap.clientId,
            clientSecret: appConfig.oauth.sap.clientSecret,
            redirectUri: getOAuthRedirectUri("sap"),
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
            // Business Partner Operations
            case "listBusinessPartners":
                return executeListBusinessPartners(
                    client,
                    params as Parameters<typeof executeListBusinessPartners>[1]
                );
            case "getBusinessPartner":
                return executeGetBusinessPartner(
                    client,
                    params as Parameters<typeof executeGetBusinessPartner>[1]
                );
            case "createBusinessPartner":
                return executeCreateBusinessPartner(
                    client,
                    params as Parameters<typeof executeCreateBusinessPartner>[1]
                );
            case "updateBusinessPartner":
                return executeUpdateBusinessPartner(
                    client,
                    params as Parameters<typeof executeUpdateBusinessPartner>[1]
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

            // Material Operations
            case "listMaterials":
                return executeListMaterials(
                    client,
                    params as Parameters<typeof executeListMaterials>[1]
                );
            case "getMaterial":
                return executeGetMaterial(
                    client,
                    params as Parameters<typeof executeGetMaterial>[1]
                );

            // Invoice Operations
            case "listInvoices":
                return executeListInvoices(
                    client,
                    params as Parameters<typeof executeListInvoices>[1]
                );
            case "getInvoice":
                return executeGetInvoice(client, params as Parameters<typeof executeGetInvoice>[1]);

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

    private getOrCreateClient(connection: ConnectionWithData): SapClient {
        const cacheKey = connection.id;

        let client = this.clientPool.get(cacheKey);

        if (!client) {
            const connectionData = connection.data as SapConnectionData;

            if (!connectionData.access_token) {
                throw new Error("No access token found in connection data");
            }

            const host =
                connectionData.host || (connection.metadata as Record<string, unknown>)?.host;

            if (!host || typeof host !== "string") {
                throw new Error("No SAP host found in connection data");
            }

            client = new SapClient({
                host,
                accessToken: connectionData.access_token,
                connectionId: connection.id
            });

            this.clientPool.set(cacheKey, client);
            logger.info(
                { component: "SapProvider", connectionId: connection.id, host },
                "Created new client for connection"
            );
        }

        return client;
    }

    clearClientCache(connectionId: string): void {
        this.clientPool.delete(connectionId);
        logger.info(
            { component: "SapProvider", connectionId },
            "Cleared client cache for connection"
        );
    }
}
