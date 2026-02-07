import { config, getOAuthRedirectUri } from "../../../core/config";
import { BaseProvider } from "../../core/BaseProvider";
import { BillComClient } from "./client/BillComClient";
import { BillComMCPAdapter } from "./mcp/BillComMCPAdapter";
// Vendor operations
// Bill operations
import {
    listBillsOperation,
    executeListBills,
    getBillOperation,
    executeGetBill,
    createBillOperation,
    executeCreateBill
} from "./operations/bills";
// Payment operations
import { createPaymentOperation, executeCreatePayment } from "./operations/payments";
import {
    listVendorsOperation,
    executeListVendors,
    getVendorOperation,
    executeGetVendor,
    createVendorOperation,
    executeCreateVendor
} from "./operations/vendors";
import type { ConnectionWithData, OAuth2TokenData } from "../../../storage/models/Connection";
import type {
    AuthConfig,
    ExecutionContext,
    MCPTool,
    OperationResult,
    OAuthConfig,
    ProviderCapabilities
} from "../../core/types";

/**
 * Bill.com Provider - implements OAuth2 authentication with AP/AR operations
 *
 * Bill.com uses OAuth2 with session-based token:
 * - Authorization URL: https://app.bill.com/oauth/authorize
 * - Token URL: https://api.bill.com/oauth/token
 *
 * Rate limit: 100 requests/minute
 */
export class BillComProvider extends BaseProvider {
    readonly name = "bill-com";
    readonly displayName = "Bill.com";
    readonly authMethod = "oauth2" as const;
    readonly capabilities: ProviderCapabilities = {
        rateLimit: {
            tokensPerMinute: 100
        }
    };

    private mcpAdapter: BillComMCPAdapter;
    private clientPool: Map<string, BillComClient> = new Map();

    constructor() {
        super();

        // Register Vendor operations
        this.registerOperation(listVendorsOperation);
        this.registerOperation(getVendorOperation);
        this.registerOperation(createVendorOperation);

        // Register Bill operations
        this.registerOperation(listBillsOperation);
        this.registerOperation(getBillOperation);
        this.registerOperation(createBillOperation);

        // Register Payment operations
        this.registerOperation(createPaymentOperation);

        // Initialize MCP adapter
        this.mcpAdapter = new BillComMCPAdapter(this.operations);
    }

    /**
     * Get OAuth2 configuration
     */
    getAuthConfig(): AuthConfig {
        const oauthConfig: OAuthConfig = {
            authUrl: "https://app.bill.com/oauth/authorize",
            tokenUrl: "https://api.bill.com/oauth/token",
            clientId: config.oauth.billCom.clientId,
            clientSecret: config.oauth.billCom.clientSecret,
            redirectUri: getOAuthRedirectUri("bill-com"),
            scopes: ["read", "write", "admin"],
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
            // Vendor operations
            case "listVendors":
                return await executeListVendors(client, validatedParams as never);
            case "getVendor":
                return await executeGetVendor(client, validatedParams as never);
            case "createVendor":
                return await executeCreateVendor(client, validatedParams as never);
            // Bill operations
            case "listBills":
                return await executeListBills(client, validatedParams as never);
            case "getBill":
                return await executeGetBill(client, validatedParams as never);
            case "createBill":
                return await executeCreateBill(client, validatedParams as never);
            // Payment operations
            case "createPayment":
                return await executeCreatePayment(client, validatedParams as never);
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
     * Get or create Bill.com client (with connection pooling)
     */
    private getOrCreateClient(connection: ConnectionWithData): BillComClient {
        const poolKey = connection.id;

        // Return cached client if exists
        if (this.clientPool.has(poolKey)) {
            return this.clientPool.get(poolKey)!;
        }

        // Create new client
        const data = connection.data as OAuth2TokenData;
        const metadata = connection.metadata as { organizationId?: string } | undefined;
        const client = new BillComClient({
            accessToken: data.access_token,
            organizationId: metadata?.organizationId
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
