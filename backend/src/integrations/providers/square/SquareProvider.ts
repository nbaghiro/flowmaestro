import crypto from "crypto";
import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { SquareClient } from "./client/SquareClient";
import { SquareMCPAdapter } from "./mcp/SquareMCPAdapter";
import {
    // Payments
    createPaymentOperation,
    executeCreatePayment,
    completePaymentOperation,
    executeCompletePayment,
    getPaymentOperation,
    executeGetPayment,
    listPaymentsOperation,
    executeListPayments,
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
    executeListCustomers,
    // Orders
    getOrderOperation,
    executeGetOrder
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
 * Square Provider - implements OAuth2 authentication with payment operations
 *
 * Features:
 * - Payments (create, complete, get, list)
 * - Refunds (create, get, list)
 * - Customers (create, update, get, list)
 * - Orders (get)
 */
export class SquareProvider extends BaseProvider {
    readonly name = "square";
    readonly displayName = "Square";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 600, // 10 requests/second per location
            burstSize: 10
        }
    };

    private mcpAdapter: SquareMCPAdapter;
    private clientPool: Map<string, SquareClient> = new Map();

    constructor() {
        super();

        // Register payment operations
        this.registerOperation(createPaymentOperation);
        this.registerOperation(completePaymentOperation);
        this.registerOperation(getPaymentOperation);
        this.registerOperation(listPaymentsOperation);

        // Register refund operations
        this.registerOperation(createRefundOperation);
        this.registerOperation(getRefundOperation);
        this.registerOperation(listRefundsOperation);

        // Register customer operations
        this.registerOperation(createCustomerOperation);
        this.registerOperation(updateCustomerOperation);
        this.registerOperation(getCustomerOperation);
        this.registerOperation(listCustomersOperation);

        // Register order operations
        this.registerOperation(getOrderOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new SquareMCPAdapter(this.operations);

        // Configure webhook settings
        this.setWebhookConfig({
            setupType: "manual", // User configures webhook URL in Square Dashboard
            signatureType: "hmac_sha256",
            signatureHeader: "x-square-hmac-sha256-signature"
        });

        // Register payment triggers
        this.registerTrigger({
            id: "payment.completed",
            name: "Payment Completed",
            description: "Triggered when a payment completes",
            requiredScopes: ["PAYMENTS_READ"],
            configFields: [],
            tags: ["payments", "success"]
        });

        this.registerTrigger({
            id: "payment.updated",
            name: "Payment Updated",
            description: "Triggered when a payment is updated",
            requiredScopes: ["PAYMENTS_READ"],
            configFields: [],
            tags: ["payments"]
        });

        this.registerTrigger({
            id: "refund.created",
            name: "Refund Created",
            description: "Triggered when a refund is created",
            requiredScopes: ["PAYMENTS_READ"],
            configFields: [],
            tags: ["refunds"]
        });

        this.registerTrigger({
            id: "customer.created",
            name: "Customer Created",
            description: "Triggered when a new customer is created",
            requiredScopes: ["CUSTOMERS_READ"],
            configFields: [],
            tags: ["customers"]
        });
    }

    /**
     * Square-specific HMAC-SHA256 webhook signature verification
     */
    override verifyWebhookSignature(
        secret: string,
        request: WebhookRequestData
    ): { valid: boolean; error?: string } {
        const signatureHeader = this.getHeader(request.headers, "x-square-hmac-sha256-signature");

        if (!signatureHeader) {
            return { valid: false, error: "Missing x-square-hmac-sha256-signature header" };
        }

        const body = this.getBodyString(request);

        // Square uses base64-encoded HMAC-SHA256
        const hmac = crypto.createHmac("sha256", secret);
        hmac.update(body, "utf-8");
        const expectedSignature = hmac.digest("base64");

        return {
            valid: this.timingSafeEqual(signatureHeader, expectedSignature)
        };
    }

    /**
     * Extract event type from Square webhook payload
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
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const config: OAuthConfig = {
            authUrl: "https://connect.squareup.com/oauth2/authorize",
            tokenUrl: "https://connect.squareup.com/oauth2/token",
            scopes: [
                "PAYMENTS_READ",
                "PAYMENTS_WRITE",
                "CUSTOMERS_READ",
                "CUSTOMERS_WRITE",
                "ORDERS_READ",
                "ORDERS_WRITE"
            ],
            clientId: appConfig.oauth.square.clientId,
            clientSecret: appConfig.oauth.square.clientSecret,
            redirectUri: getOAuthRedirectUri("square"),
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
            // Payments
            case "createPayment":
                return await executeCreatePayment(client, validatedParams as never);
            case "completePayment":
                return await executeCompletePayment(client, validatedParams as never);
            case "getPayment":
                return await executeGetPayment(client, validatedParams as never);
            case "listPayments":
                return await executeListPayments(client, validatedParams as never);

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

            // Orders
            case "getOrder":
                return await executeGetOrder(client, validatedParams as never);

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
     * Get or create Square client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): SquareClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get tokens from connection
        const tokens = connection.data as OAuth2TokenData;

        // Create new client
        const client = new SquareClient({
            accessToken: tokens.access_token
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
