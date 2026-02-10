import { config as appConfig, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { PaypalClient } from "./client/PaypalClient";
import { PaypalMCPAdapter } from "./mcp/PaypalMCPAdapter";
import {
    // Orders
    createOrderOperation,
    executeCreateOrder,
    getOrderOperation,
    executeGetOrder,
    captureOrderOperation,
    executeCaptureOrder,
    // Payments / Refunds
    refundPaymentOperation,
    executeRefundPayment,
    getRefundOperation,
    executeGetRefund,
    // Reporting
    searchTransactionsOperation,
    executeSearchTransactions,
    // Invoicing
    createInvoiceOperation,
    executeCreateInvoice,
    sendInvoiceOperation,
    executeSendInvoice,
    getInvoiceOperation,
    executeGetInvoice,
    // Payouts
    createPayoutOperation,
    executeCreatePayout,
    getPayoutDetailsOperation,
    executeGetPayoutDetails
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
 * PayPal Provider - implements OAuth2 authentication with payment operations
 *
 * Features:
 * - Orders (create, get, capture)
 * - Refunds (create, get)
 * - Transaction search
 * - Invoicing (create, send, get)
 * - Payouts (create, get details)
 */
export class PaypalProvider extends BaseProvider {
    readonly name = "paypal";
    readonly displayName = "PayPal";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        supportsWebhooks: true,
        rateLimit: {
            tokensPerMinute: 600,
            burstSize: 10
        }
    };

    private mcpAdapter: PaypalMCPAdapter;
    private clientPool: Map<string, PaypalClient> = new Map();

    constructor() {
        super();

        // Register order operations
        this.registerOperation(createOrderOperation);
        this.registerOperation(getOrderOperation);
        this.registerOperation(captureOrderOperation);

        // Register payment/refund operations
        this.registerOperation(refundPaymentOperation);
        this.registerOperation(getRefundOperation);

        // Register reporting operations
        this.registerOperation(searchTransactionsOperation);

        // Register invoicing operations
        this.registerOperation(createInvoiceOperation);
        this.registerOperation(sendInvoiceOperation);
        this.registerOperation(getInvoiceOperation);

        // Register payout operations
        this.registerOperation(createPayoutOperation);
        this.registerOperation(getPayoutDetailsOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new PaypalMCPAdapter(this.operations);

        // Configure webhook settings
        // PayPal verifies webhooks via API call rather than local HMAC
        this.setWebhookConfig({
            setupType: "manual",
            signatureType: "hmac_sha256",
            signatureHeader: "paypal-transmission-sig"
        });

        // Register payment triggers
        this.registerTrigger({
            id: "PAYMENT.CAPTURE.COMPLETED",
            name: "Payment Captured",
            description: "Triggered when a payment capture completes",
            requiredScopes: ["https://uri.paypal.com/services/payments/payment"],
            configFields: [],
            tags: ["payments", "success"]
        });

        this.registerTrigger({
            id: "CHECKOUT.ORDER.APPROVED",
            name: "Order Approved",
            description: "Triggered when a checkout order is approved by the buyer",
            requiredScopes: ["https://uri.paypal.com/services/payments/payment"],
            configFields: [],
            tags: ["orders"]
        });

        this.registerTrigger({
            id: "PAYMENT.CAPTURE.REFUNDED",
            name: "Payment Refunded",
            description: "Triggered when a captured payment is refunded",
            requiredScopes: ["https://uri.paypal.com/services/payments/refund"],
            configFields: [],
            tags: ["refunds"]
        });

        this.registerTrigger({
            id: "INVOICING.INVOICE.PAID",
            name: "Invoice Paid",
            description: "Triggered when an invoice is paid",
            requiredScopes: ["https://uri.paypal.com/services/invoicing"],
            configFields: [],
            tags: ["invoicing"]
        });
    }

    /**
     * PayPal webhook signature verification
     * PayPal uses a different approach: verify via API call to /v1/notifications/verify-webhook-signature
     * For now, we check for the presence of expected headers
     */
    override verifyWebhookSignature(
        _secret: string,
        request: WebhookRequestData
    ): { valid: boolean; error?: string } {
        const transmissionId = this.getHeader(request.headers, "paypal-transmission-id");
        const transmissionSig = this.getHeader(request.headers, "paypal-transmission-sig");
        const certUrl = this.getHeader(request.headers, "paypal-cert-url");

        if (!transmissionId || !transmissionSig || !certUrl) {
            return {
                valid: false,
                error: "Missing required PayPal webhook headers"
            };
        }

        // PayPal webhook verification requires an API call to verify-webhook-signature
        // In a full implementation, this would call the PayPal API
        // For now, we verify the presence of required headers
        return { valid: true };
    }

    /**
     * Extract event type from PayPal webhook payload
     */
    override extractEventType(request: WebhookRequestData): string | undefined {
        try {
            const body = this.getBodyString(request);
            const payload = JSON.parse(body) as { event_type?: string };
            return payload.event_type;
        } catch {
            return undefined;
        }
    }

    /**
     * Get OAuth configuration
     */
    getAuthConfig(): AuthConfig {
        const oauthConfig: OAuthConfig = {
            authUrl: "https://www.paypal.com/signin/authorize",
            tokenUrl: "https://api-m.paypal.com/v1/oauth2/token",
            scopes: [
                "openid",
                "email",
                "https://uri.paypal.com/services/payments/payment",
                "https://uri.paypal.com/services/payments/refund",
                "https://uri.paypal.com/services/reporting/search/read",
                "https://uri.paypal.com/services/invoicing",
                "https://uri.paypal.com/services/payments/payouts"
            ],
            clientId: appConfig.oauth.paypal.clientId,
            clientSecret: appConfig.oauth.paypal.clientSecret,
            redirectUri: getOAuthRedirectUri("paypal"),
            refreshable: true
        };

        return oauthConfig;
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
            // Orders
            case "createOrder":
                return await executeCreateOrder(client, validatedParams as never);
            case "getOrder":
                return await executeGetOrder(client, validatedParams as never);
            case "captureOrder":
                return await executeCaptureOrder(client, validatedParams as never);

            // Payments / Refunds
            case "refundPayment":
                return await executeRefundPayment(client, validatedParams as never);
            case "getRefund":
                return await executeGetRefund(client, validatedParams as never);

            // Reporting
            case "searchTransactions":
                return await executeSearchTransactions(client, validatedParams as never);

            // Invoicing
            case "createInvoice":
                return await executeCreateInvoice(client, validatedParams as never);
            case "sendInvoice":
                return await executeSendInvoice(client, validatedParams as never);
            case "getInvoice":
                return await executeGetInvoice(client, validatedParams as never);

            // Payouts
            case "createPayout":
                return await executeCreatePayout(client, validatedParams as never);
            case "getPayoutDetails":
                return await executeGetPayoutDetails(client, validatedParams as never);

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
     * Get or create PayPal client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): PaypalClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Get tokens from connection
        const tokens = connection.data as OAuth2TokenData;

        // Create new client
        const client = new PaypalClient({
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
