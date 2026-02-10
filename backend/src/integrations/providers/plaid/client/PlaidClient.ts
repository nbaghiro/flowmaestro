/**
 * Plaid HTTP Client
 *
 * Handles all HTTP communication with Plaid API.
 * Uses client_id + secret authentication sent in request body.
 * All Plaid API calls use POST method.
 *
 * Base URL (Sandbox): https://sandbox.plaid.com
 * Base URL (Production): https://production.plaid.com
 *
 * Rate limit: ~100 requests/minute (conservative composite)
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface PlaidClientConfig {
    clientId: string;
    secret: string;
    connectionId?: string;
    environment?: "sandbox" | "production";
}

// ============================================
// Plaid API Types
// ============================================

export interface PlaidAccount {
    account_id: string;
    name: string;
    official_name?: string;
    type: string;
    subtype?: string;
    mask?: string;
    balances: {
        available?: number;
        current?: number;
        limit?: number;
        iso_currency_code?: string;
        last_updated_datetime?: string;
    };
}

export interface PlaidTransaction {
    transaction_id: string;
    account_id: string;
    amount: number;
    iso_currency_code?: string;
    date: string;
    name: string;
    merchant_name?: string;
    category?: string[];
    pending: boolean;
    payment_channel?: string;
    location?: {
        address?: string;
        city?: string;
        region?: string;
        postal_code?: string;
        country?: string;
    };
}

export interface PlaidInstitution {
    institution_id: string;
    name: string;
    products?: string[];
    country_codes?: string[];
    url?: string;
    logo?: string;
    primary_color?: string;
}

export interface PlaidIdentityOwner {
    names: string[];
    emails: Array<{
        data: string;
        primary: boolean;
        type: string;
    }>;
    phone_numbers: Array<{
        data: string;
        primary: boolean;
        type: string;
    }>;
    addresses: Array<{
        data: {
            street?: string;
            city?: string;
            region?: string;
            postal_code?: string;
            country?: string;
        };
        primary: boolean;
    }>;
}

export interface PlaidAccountsResponse {
    accounts: PlaidAccount[];
    request_id: string;
}

export interface PlaidTransactionsResponse {
    accounts: PlaidAccount[];
    transactions: PlaidTransaction[];
    total_transactions: number;
    request_id: string;
}

export interface PlaidInstitutionResponse {
    institution: PlaidInstitution;
    request_id: string;
}

export interface PlaidIdentityResponse {
    accounts: Array<{
        account_id: string;
        owners: PlaidIdentityOwner[];
    }>;
    request_id: string;
}

export interface PlaidLinkTokenResponse {
    link_token: string;
    expiration: string;
    request_id: string;
}

interface PlaidErrorResponse {
    error_type?: string;
    error_code?: string;
    error_message?: string;
    display_message?: string;
    request_id?: string;
}

export class PlaidClient extends BaseAPIClient {
    private clientId: string;
    private secret: string;

    constructor(config: PlaidClientConfig) {
        const baseURL =
            config.environment === "production"
                ? "https://production.plaid.com"
                : "https://sandbox.plaid.com";

        const clientConfig: BaseAPIClientConfig = {
            baseURL,
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                retryableErrors: ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND"],
                backoffStrategy: "exponential",
                initialDelay: 1000,
                maxDelay: 30000
            },
            connectionPool: {
                keepAlive: true,
                maxSockets: 50,
                maxFreeSockets: 10,
                keepAliveMsecs: 60000
            }
        };

        super(clientConfig);

        this.clientId = config.clientId;
        this.secret = config.secret;

        // Add content type header
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Content-Type"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Override to handle Plaid-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: PlaidErrorResponse };
            };
            const response = errorWithResponse.response;

            if (response?.data?.error_message) {
                throw new Error(
                    `Plaid API error: ${response.data.error_message}${
                        response.data.error_code ? ` (${response.data.error_code})` : ""
                    }`
                );
            }

            if (response?.status === 401) {
                throw new Error(
                    "Plaid authentication failed. Please check your client ID and secret."
                );
            }

            if (response?.status === 400) {
                throw new Error(
                    response?.data?.display_message ||
                        "Plaid request failed. Please check your parameters."
                );
            }

            if (response?.status === 429) {
                throw new Error("Plaid rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    /**
     * Helper to add auth credentials to request body
     */
    private withAuth(body: Record<string, unknown>): Record<string, unknown> {
        return {
            client_id: this.clientId,
            secret: this.secret,
            ...body
        };
    }

    // ============================================
    // Account Operations
    // ============================================

    /**
     * Get accounts for an access token
     */
    async getAccounts(accessToken: string): Promise<PlaidAccountsResponse> {
        return this.post("/accounts/get", this.withAuth({ access_token: accessToken }));
    }

    /**
     * Get account balances
     */
    async getBalances(accessToken: string): Promise<PlaidAccountsResponse> {
        return this.post("/accounts/balance/get", this.withAuth({ access_token: accessToken }));
    }

    // ============================================
    // Transaction Operations
    // ============================================

    /**
     * Get transactions
     */
    async getTransactions(
        accessToken: string,
        startDate: string,
        endDate: string,
        count: number = 100,
        offset: number = 0
    ): Promise<PlaidTransactionsResponse> {
        return this.post(
            "/transactions/get",
            this.withAuth({
                access_token: accessToken,
                start_date: startDate,
                end_date: endDate,
                options: {
                    count,
                    offset
                }
            })
        );
    }

    // ============================================
    // Institution Operations
    // ============================================

    /**
     * Get institution by ID
     */
    async getInstitution(
        institutionId: string,
        countryCodes: string[] = ["US"]
    ): Promise<PlaidInstitutionResponse> {
        return this.post(
            "/institutions/get_by_id",
            this.withAuth({
                institution_id: institutionId,
                country_codes: countryCodes
            })
        );
    }

    // ============================================
    // Identity Operations
    // ============================================

    /**
     * Get identity information
     */
    async getIdentity(accessToken: string): Promise<PlaidIdentityResponse> {
        return this.post("/identity/get", this.withAuth({ access_token: accessToken }));
    }

    // ============================================
    // Link Operations
    // ============================================

    /**
     * Create a link token for initializing Plaid Link
     */
    async createLinkToken(
        userId: string,
        products: string[] = ["transactions"],
        countryCodes: string[] = ["US"],
        language: string = "en",
        clientName: string = "FlowMaestro"
    ): Promise<PlaidLinkTokenResponse> {
        return this.post(
            "/link/token/create",
            this.withAuth({
                user: { client_user_id: userId },
                client_name: clientName,
                products,
                country_codes: countryCodes,
                language
            })
        );
    }
}
