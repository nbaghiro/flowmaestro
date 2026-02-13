import { BaseProvider } from "../../core/BaseProvider";
import { ShipStationClient } from "./client/ShipStationClient";
import { ShipStationMCPAdapter } from "./mcp/ShipStationMCPAdapter";
import {
    // Order operations
    listOrdersOperation,
    executeListOrders,
    getOrderOperation,
    executeGetOrder,
    createOrderOperation,
    executeCreateOrder,
    updateOrderStatusOperation,
    executeUpdateOrderStatus,
    // Shipment operations
    createShipmentOperation,
    executeCreateShipment,
    // Rate operations
    getRatesOperation,
    executeGetRates,
    // Label operations
    createLabelOperation,
    executeCreateLabel,
    voidLabelOperation,
    executeVoidLabel,
    // Carrier operations
    listCarriersOperation,
    executeListCarriers,
    listServicesOperation,
    executeListServices,
    // Warehouse operations
    listWarehousesOperation,
    executeListWarehouses,
    // Store operations
    listStoresOperation,
    executeListStores
} from "./operations";
import type {
    ListOrdersParams,
    GetOrderParams,
    CreateOrderParams,
    UpdateOrderStatusParams,
    CreateShipmentParams,
    GetRatesParams,
    CreateLabelParams,
    VoidLabelParams,
    ListCarriersParams,
    ListServicesParams,
    ListWarehousesParams,
    ListStoresParams
} from "./schemas";
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
 * ShipStation Provider
 *
 * Features:
 * - Order management (list, get, create, mark as shipped)
 * - Shipment creation with labels
 * - Multi-carrier rate shopping
 * - Label creation and voiding
 * - Carrier and service listing
 * - Warehouse management
 * - Store/sales channel management
 */
export class ShipStationProvider extends BaseProvider {
    readonly name = "shipstation";
    readonly displayName = "ShipStation";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 40, // Very strict rate limit
            burstSize: 10
        }
    };

    private mcpAdapter: ShipStationMCPAdapter;
    private clientPool: Map<string, ShipStationClient> = new Map();

    constructor() {
        super();

        // Register order operations
        this.registerOperation(listOrdersOperation);
        this.registerOperation(getOrderOperation);
        this.registerOperation(createOrderOperation);
        this.registerOperation(updateOrderStatusOperation);

        // Register shipment operations
        this.registerOperation(createShipmentOperation);

        // Register rate operations
        this.registerOperation(getRatesOperation);

        // Register label operations
        this.registerOperation(createLabelOperation);
        this.registerOperation(voidLabelOperation);

        // Register carrier operations
        this.registerOperation(listCarriersOperation);
        this.registerOperation(listServicesOperation);

        // Register warehouse operations
        this.registerOperation(listWarehousesOperation);

        // Register store operations
        this.registerOperation(listStoresOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new ShipStationMCPAdapter(this.operations);

        // Configure webhook settings (manual setup in ShipStation dashboard)
        this.setWebhookConfig({
            setupType: "manual",
            signatureType: "none" // ShipStation webhooks don't use signature verification
        });

        // Register triggers
        this.registerTrigger({
            id: "ORDER_NOTIFY",
            name: "Order Created",
            description: "Triggered when a new order is imported",
            configFields: [],
            tags: ["orders", "sales"]
        });

        this.registerTrigger({
            id: "SHIP_NOTIFY",
            name: "Order Shipped",
            description: "Triggered when an order is shipped",
            configFields: [],
            tags: ["orders", "shipping"]
        });

        this.registerTrigger({
            id: "ITEM_ORDER_NOTIFY",
            name: "Item Ordered",
            description: "Triggered for each item in an order",
            configFields: [],
            tags: ["orders", "items"]
        });

        this.registerTrigger({
            id: "ITEM_SHIP_NOTIFY",
            name: "Item Shipped",
            description: "Triggered for each item when shipped",
            configFields: [],
            tags: ["shipping", "items"]
        });
    }

    /**
     * Get API Key configuration
     * ShipStation uses Basic Auth with API Key and Secret
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "Authorization",
            headerTemplate: "Basic {{base64(api_key:api_secret)}}"
        };
        return config;
    }

    /**
     * Execute operation
     */
    async executeOperation(
        operationId: string,
        params: Record<string, unknown>,
        connection: ConnectionWithData,
        _context: ExecutionContext
    ): Promise<OperationResult> {
        const client = this.getOrCreateClient(connection);

        switch (operationId) {
            // Order operations
            case "listOrders":
                return await executeListOrders(
                    client,
                    this.validateParams<ListOrdersParams>(operationId, params)
                );
            case "getOrder":
                return await executeGetOrder(
                    client,
                    this.validateParams<GetOrderParams>(operationId, params)
                );
            case "createOrder":
                return await executeCreateOrder(
                    client,
                    this.validateParams<CreateOrderParams>(operationId, params)
                );
            case "updateOrderStatus":
                return await executeUpdateOrderStatus(
                    client,
                    this.validateParams<UpdateOrderStatusParams>(operationId, params)
                );

            // Shipment operations
            case "createShipment":
                return await executeCreateShipment(
                    client,
                    this.validateParams<CreateShipmentParams>(operationId, params)
                );

            // Rate operations
            case "getRates":
                return await executeGetRates(
                    client,
                    this.validateParams<GetRatesParams>(operationId, params)
                );

            // Label operations
            case "createLabel":
                return await executeCreateLabel(
                    client,
                    this.validateParams<CreateLabelParams>(operationId, params)
                );
            case "voidLabel":
                return await executeVoidLabel(
                    client,
                    this.validateParams<VoidLabelParams>(operationId, params)
                );

            // Carrier operations
            case "listCarriers":
                return await executeListCarriers(
                    client,
                    this.validateParams<ListCarriersParams>(operationId, params)
                );
            case "listServices":
                return await executeListServices(
                    client,
                    this.validateParams<ListServicesParams>(operationId, params)
                );

            // Warehouse operations
            case "listWarehouses":
                return await executeListWarehouses(
                    client,
                    this.validateParams<ListWarehousesParams>(operationId, params)
                );

            // Store operations
            case "listStores":
                return await executeListStores(
                    client,
                    this.validateParams<ListStoresParams>(operationId, params)
                );

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
     * Get or create ShipStation client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): ShipStationClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const data = connection.data as ApiKeyData;

        if (!data.api_key || !data.api_secret) {
            throw new Error("Missing API Key or API Secret. Please reconnect.");
        }

        const client = new ShipStationClient({
            apiKey: data.api_key,
            apiSecret: data.api_secret,
            connectionId: connection.id
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
