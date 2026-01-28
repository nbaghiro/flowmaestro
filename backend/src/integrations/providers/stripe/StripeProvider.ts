import crypto from "crypto";
import { BaseProvider } from "../../core/BaseProvider";
import { StripeClient } from "./client/StripeClient";
import { StripeMCPAdapter } from "./mcp/StripeMCPAdapter";
import {
    // Payment Intents
    createPaymentIntentOperation,
    executeCreatePaymentIntent,
    confirmPaymentIntentOperation,
    executeConfirmPaymentIntent,
    cancelPaymentIntentOperation,
    executeCancelPaymentIntent,
    getPaymentIntentOperation,
    executeGetPaymentIntent,
    listPaymentIntentsOperation,
    executeListPaymentIntents,
    // Charges
    createChargeOperation,
    executeCreateCharge,
    getChargeOperation,
    executeGetCharge,
    listChargesOperation,
    executeListCharges,
    // Refunds
    createRefundOperation,
    executeCreateRefund,
    getRefundOperation,
    executeGetRefund,
    listRefundsOperation,
    executeListRefunds,
    // Customers
    createCustomerOperation,
    executeCreateCustomer,
    updateCustomerOperation,
    executeUpdateCustomer,
    getCustomerOperation,
    executeGetCustomer,
    listCustomersOperation,
    executeListCustomers
} from "./operations";
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
 * Stripe Provider - implements API Key authentication with payment operations
 *
 * Features:
 * - Payment intents (create, confirm, cancel, get, list)
 * - Charges (create, get, list)
 * - Refunds (create, get, list)
 * - Customers (create, update, get, list)
 */
export class StripeProvider extends BaseProvider {
    readonly name = "stripe";
    readonly displayName = "Stripe";
    readonly authMethod = "api_key" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 6000, // 100 requests/second
            burstSize: 100
        }
    };

    private mcpAdapter: StripeMCPAdapter;
    private clientPool: Map<string, StripeClient> = new Map();

    constructor() {
        super();

        // Register payment intent operations
        this.registerOperation(createPaymentIntentOperation);
        this.registerOperation(confirmPaymentIntentOperation);
        this.registerOperation(cancelPaymentIntentOperation);
        this.registerOperation(getPaymentIntentOperation);
        this.registerOperation(listPaymentIntentsOperation);

        // Register charge operations
        this.registerOperation(createChargeOperation);
        this.registerOperation(getChargeOperation);
        this.registerOperation(listChargesOperation);

        // Register refund operations
        this.registerOperation(createRefundOperation);
        this.registerOperation(getRefundOperation);
        this.registerOperation(listRefundsOperation);

        // Register customer operations
        this.registerOperation(createCustomerOperation);
        this.registerOperation(updateCustomerOperation);
        this.registerOperation(getCustomerOperation);
        this.registerOperation(listCustomersOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new StripeMCPAdapter(this.operations);

        // Configure webhook settings
        this.setWebhookConfig({
            setupType: "manual", // User configures webhook URL in Stripe Dashboard
            signatureType: "timestamp_signature", // Stripe uses t=timestamp,v1=signature format
            signatureHeader: "Stripe-Signature",
            timestampHeader: "Stripe-Signature", // Timestamp is in the same header
            timestampMaxAge: 300 // 5 minutes
        });

        // Register payment triggers
        this.registerTrigger({
            id: "payment_intent.succeeded",
            name: "Payment Completed",
            description: "Triggered when a payment completes successfully",
            configFields: [],
            tags: ["payments", "success"]
        });

        this.registerTrigger({
            id: "payment_intent.payment_failed",
            name: "Payment Failed",
            description: "Triggered when a payment fails",
            configFields: [],
            tags: ["payments", "failure"]
        });

        this.registerTrigger({
            id: "charge.refunded",
            name: "Charge Refunded",
            description: "Triggered when a charge is refunded",
            configFields: [],
            tags: ["refunds", "charges"]
        });

        this.registerTrigger({
            id: "customer.created",
            name: "Customer Created",
            description: "Triggered when a new customer is created",
            configFields: [],
            tags: ["customers"]
        });

        this.registerTrigger({
            id: "customer.updated",
            name: "Customer Updated",
            description: "Triggered when a customer is updated",
            configFields: [],
            tags: ["customers"]
        });

        this.registerTrigger({
            id: "invoice.payment_failed",
            name: "Invoice Payment Failed",
            description: "Triggered when an invoice payment fails",
            configFields: [],
            tags: ["invoices", "failure"]
        });
    }

    /**
     * Stripe-specific webhook signature verification
     * Uses timestamp + payload signing with HMAC-SHA256
     */
    override verifyWebhookSignature(
        secret: string,
        request: WebhookRequestData
    ): { valid: boolean; error?: string } {
        const signatureHeader = this.getHeader(request.headers, "Stripe-Signature");

        if (!signatureHeader) {
            return { valid: false, error: "Missing Stripe-Signature header" };
        }

        // Parse the signature header (format: t=timestamp,v1=signature)
        const parts = signatureHeader.split(",");
        let timestamp: string | undefined;
        let signature: string | undefined;

        for (const part of parts) {
            const [key, value] = part.split("=");
            if (key === "t") {
                timestamp = value;
            } else if (key === "v1") {
                signature = value;
            }
        }

        if (!timestamp || !signature) {
            return { valid: false, error: "Invalid Stripe-Signature format" };
        }

        // Check timestamp (prevent replay attacks)
        const timestampNum = parseInt(timestamp, 10);
        const now = Math.floor(Date.now() / 1000);
        const tolerance = 300; // 5 minutes

        if (Math.abs(now - timestampNum) > tolerance) {
            return { valid: false, error: "Webhook timestamp too old" };
        }

        // Compute expected signature
        const body = this.getBodyString(request);
        const signedPayload = `${timestamp}.${body}`;

        const hmac = crypto.createHmac("sha256", secret);
        hmac.update(signedPayload, "utf-8");
        const expectedSignature = hmac.digest("hex");

        return {
            valid: this.timingSafeEqual(signature, expectedSignature)
        };
    }

    /**
     * Extract event type from Stripe webhook payload
     */
    override extractEventType(request: WebhookRequestData): string | undefined {
        try {
            const body = this.getBodyString(request);
            const payload = JSON.parse(body) as { type?: string };
            return payload.type;
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
            headerTemplate: "Bearer {{api_key}}"
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
            // Payment Intents
            case "createPaymentIntent":
                return await executeCreatePaymentIntent(client, validatedParams as never);
            case "confirmPaymentIntent":
                return await executeConfirmPaymentIntent(client, validatedParams as never);
            case "cancelPaymentIntent":
                return await executeCancelPaymentIntent(client, validatedParams as never);
            case "getPaymentIntent":
                return await executeGetPaymentIntent(client, validatedParams as never);
            case "listPaymentIntents":
                return await executeListPaymentIntents(client, validatedParams as never);

            // Charges
            case "createCharge":
                return await executeCreateCharge(client, validatedParams as never);
            case "getCharge":
                return await executeGetCharge(client, validatedParams as never);
            case "listCharges":
                return await executeListCharges(client, validatedParams as never);

            // Refunds
            case "createRefund":
                return await executeCreateRefund(client, validatedParams as never);
            case "getRefund":
                return await executeGetRefund(client, validatedParams as never);
            case "listRefunds":
                return await executeListRefunds(client, validatedParams as never);

            // Customers
            case "createCustomer":
                return await executeCreateCustomer(client, validatedParams as never);
            case "updateCustomer":
                return await executeUpdateCustomer(client, validatedParams as never);
            case "getCustomer":
                return await executeGetCustomer(client, validatedParams as never);
            case "listCustomers":
                return await executeListCustomers(client, validatedParams as never);

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
     * Get or create Stripe client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): StripeClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as ApiKeyData;
        const client = new StripeClient({
            apiKey: data.api_key
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
