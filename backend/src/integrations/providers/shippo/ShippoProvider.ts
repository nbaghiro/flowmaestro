import crypto from "crypto";
import { BaseProvider } from "../../core/BaseProvider";
import { ShippoClient } from "./client/ShippoClient";
import { ShippoMCPAdapter } from "./mcp/ShippoMCPAdapter";
import {
    // Address operations
    validateAddressOperation,
    executeValidateAddress,
    // Shipment operations
    createShipmentOperation,
    executeCreateShipment,
    listShipmentsOperation,
    executeListShipments,
    getShipmentOperation,
    executeGetShipment,
    // Rate operations
    getRatesOperation,
    executeGetRates,
    // Label operations
    createLabelOperation,
    executeCreateLabel,
    getLabelOperation,
    executeGetLabel,
    // Tracking operations
    trackShipmentOperation,
    executeTrackShipment,
    getTrackingStatusOperation,
    executeGetTrackingStatus,
    // Manifest operations
    createManifestOperation,
    executeCreateManifest,
    // Carrier account operations
    listCarrierAccountsOperation,
    executeListCarrierAccounts
} from "./operations";
import type {
    ValidateAddressParams,
    CreateShipmentParams,
    ListShipmentsParams,
    GetShipmentParams,
    GetRatesParams,
    CreateLabelParams,
    GetLabelParams,
    TrackShipmentParams,
    GetTrackingStatusParams,
    CreateManifestParams,
    ListCarrierAccountsParams
} from "./schemas";
import type { ConnectionWithData, ApiKeyData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    APIKeyConfig,
    ProviderCapabilities,
    WebhookRequestData
} from "../../core/types";

/**
 * Shippo Provider
 *
 * Features:
 * - Address validation
 * - Shipment creation with multi-carrier rates
 * - Label purchase and printing
 * - Real-time tracking
 * - End-of-day manifests
 * - Carrier account management
 */
export class ShippoProvider extends BaseProvider {
    readonly name = "shippo";
    readonly displayName = "Shippo";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 4000, // GET requests
            burstSize: 100
        }
    };

    private mcpAdapter: ShippoMCPAdapter;
    private clientPool: Map<string, ShippoClient> = new Map();

    constructor() {
        super();

        // Register address operations
        this.registerOperation(validateAddressOperation);

        // Register shipment operations
        this.registerOperation(createShipmentOperation);
        this.registerOperation(listShipmentsOperation);
        this.registerOperation(getShipmentOperation);

        // Register rate operations
        this.registerOperation(getRatesOperation);

        // Register label operations
        this.registerOperation(createLabelOperation);
        this.registerOperation(getLabelOperation);

        // Register tracking operations
        this.registerOperation(trackShipmentOperation);
        this.registerOperation(getTrackingStatusOperation);

        // Register manifest operations
        this.registerOperation(createManifestOperation);

        // Register carrier account operations
        this.registerOperation(listCarrierAccountsOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new ShippoMCPAdapter(this.operations);

        // Configure webhook settings (automatic setup via API)
        this.setWebhookConfig({
            setupType: "automatic",
            signatureType: "hmac_sha256",
            signatureHeader: "X-Shippo-Signature"
        });

        // Register triggers
        this.registerTrigger({
            id: "track_updated",
            name: "Tracking Updated",
            description: "Triggered when tracking status changes",
            configFields: [],
            tags: ["tracking", "shipping"]
        });

        this.registerTrigger({
            id: "transaction_created",
            name: "Label Created",
            description: "Triggered when a shipping label is created",
            configFields: [],
            tags: ["labels", "transactions"]
        });

        this.registerTrigger({
            id: "transaction_updated",
            name: "Label Updated",
            description: "Triggered when a label status changes",
            configFields: [],
            tags: ["labels", "transactions"]
        });
    }

    /**
     * Shippo-specific webhook signature verification
     */
    override verifyWebhookSignature(
        secret: string,
        request: WebhookRequestData
    ): { valid: boolean; error?: string } {
        const signatureHeader = this.getHeader(request.headers, "X-Shippo-Signature");

        if (!signatureHeader) {
            return { valid: false, error: "Missing X-Shippo-Signature header" };
        }

        const body = this.getBodyString(request);

        // Shippo uses HMAC-SHA256
        const hmac = crypto.createHmac("sha256", secret);
        hmac.update(body, "utf-8");
        const computed = hmac.digest("hex");

        return {
            valid: this.timingSafeEqual(signatureHeader, computed)
        };
    }

    /**
     * Extract event type from Shippo webhook
     */
    override extractEventType(request: WebhookRequestData): string | undefined {
        try {
            const body = this.getBodyString(request);
            const payload = JSON.parse(body) as { event?: string };
            return payload.event;
        } catch {
            return undefined;
        }
    }

    /**
     * Get API Key configuration
     */
    getAuthConfig(): AuthConfig {
        const config: APIKeyConfig = {
            headerName: "Authorization",
            headerTemplate: "ShippoToken {{api_key}}"
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
            // Address operations
            case "validateAddress":
                return await executeValidateAddress(
                    client,
                    this.validateParams<ValidateAddressParams>(operationId, params)
                );

            // Shipment operations
            case "createShipment":
                return await executeCreateShipment(
                    client,
                    this.validateParams<CreateShipmentParams>(operationId, params)
                );
            case "listShipments":
                return await executeListShipments(
                    client,
                    this.validateParams<ListShipmentsParams>(operationId, params)
                );
            case "getShipment":
                return await executeGetShipment(
                    client,
                    this.validateParams<GetShipmentParams>(operationId, params)
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
            case "getLabel":
                return await executeGetLabel(
                    client,
                    this.validateParams<GetLabelParams>(operationId, params)
                );

            // Tracking operations
            case "trackShipment":
                return await executeTrackShipment(
                    client,
                    this.validateParams<TrackShipmentParams>(operationId, params)
                );
            case "getTrackingStatus":
                return await executeGetTrackingStatus(
                    client,
                    this.validateParams<GetTrackingStatusParams>(operationId, params)
                );

            // Manifest operations
            case "createManifest":
                return await executeCreateManifest(
                    client,
                    this.validateParams<CreateManifestParams>(operationId, params)
                );

            // Carrier account operations
            case "listCarrierAccounts":
                return await executeListCarrierAccounts(
                    client,
                    this.validateParams<ListCarrierAccountsParams>(operationId, params)
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
     * Get or create Shippo client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): ShippoClient {
        const poolKey = connection.id;

        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        const data = connection.data as ApiKeyData;

        const client = new ShippoClient({
            apiToken: data.api_key,
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
