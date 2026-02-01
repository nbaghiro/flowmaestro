/**
 * FreshBooks HTTP Client
 *
 * Handles all HTTP communication with FreshBooks API.
 * Uses OAuth2 Bearer token authentication.
 *
 * Base URL: https://api.freshbooks.com
 * Accounting API: https://api.freshbooks.com/accounting/account/{accountId}/...
 *
 * Rate limit: 1000 requests/minute
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface FreshBooksClientConfig {
    accessToken: string;
    accountId: string;
    connectionId?: string;
}

// ============================================
// FreshBooks API Types
// ============================================

export interface FreshBooksUser {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    confirmed_at: string;
    created_at: string;
    unconfirmed_email: string | null;
    setup_complete: boolean;
    business_memberships?: Array<{
        id: number;
        role: string;
        unread_notifications: number;
        business: {
            id: number;
            name: string;
            account_id: string;
            date_format: string;
            address: {
                id: number;
                city: string;
                code: string;
                country: string;
                province: string;
                street: string;
                street2: string | null;
            };
            phone_number: string | null;
            business_uuid: string;
        };
    }>;
}

export interface FreshBooksClient {
    id: number;
    accounting_systemid: string;
    userid: number;
    email: string;
    fname: string;
    lname: string;
    organization: string;
    vat_name: string | null;
    vat_number: string | null;
    p_street: string;
    p_street2: string;
    p_city: string;
    p_code: string;
    p_province: string;
    p_country: string;
    bus_phone: string;
    fax: string;
    mob_phone: string;
    home_phone: string;
    note: string;
    updated: string;
    vis_state: number;
    currency_code: string;
}

export interface FreshBooksInvoice {
    id: number;
    invoiceid: number;
    accounting_systemid: string;
    customerid: number;
    create_date: string;
    generation_date: string;
    due_date: string;
    due_offset_days: number;
    invoice_number: string;
    po_number: string | null;
    currency_code: string;
    status: number;
    v3_status: string;
    display_status: string;
    amount: {
        amount: string;
        code: string;
    };
    outstanding: {
        amount: string;
        code: string;
    };
    paid: {
        amount: string;
        code: string;
    };
    discount_value: string;
    discount_description: string;
    notes: string;
    terms: string;
    lines?: Array<{
        lineid: number;
        invoiceid: number;
        name: string;
        description: string;
        qty: string;
        unit_cost: {
            amount: string;
            code: string;
        };
        amount: {
            amount: string;
            code: string;
        };
        type: number;
        taxName1: string;
        taxAmount1: number;
        taxName2: string;
        taxAmount2: number;
    }>;
    updated: string;
}

export interface FreshBooksExpense {
    id: number;
    expenseid: number;
    accounting_systemid: string;
    staffid: number;
    categoryid: number;
    clientid: number;
    projectid: number;
    vendor: string;
    date: string;
    notes: string;
    amount: {
        amount: string;
        code: string;
    };
    taxPercent1: string;
    taxName1: string;
    taxAmount1: {
        amount: string;
        code: string;
    };
    taxPercent2: string;
    taxName2: string;
    taxAmount2: {
        amount: string;
        code: string;
    };
    vis_state: number;
    status: number;
    updated: string;
}

export interface FreshBooksListResponse<T> {
    response: {
        result: {
            clients?: T[];
            invoices?: T[];
            expenses?: T[];
            page: number;
            pages: number;
            per_page: number;
            total: number;
        };
    };
}

export interface FreshBooksSingleResponse<T> {
    response: {
        result: {
            [key: string]: T;
        };
    };
}

export interface FreshBooksUserResponse {
    response: FreshBooksUser;
}

interface FreshBooksErrorResponse {
    response?: {
        errors?: Array<{
            message?: string;
            errno?: number;
            field?: string;
        }>;
    };
}

export class FreshBooksHttpClient extends BaseAPIClient {
    private accountId: string;

    constructor(config: FreshBooksClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.freshbooks.com",
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

        this.accountId = config.accountId;

        // Add authorization header
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${config.accessToken}`;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            requestConfig.headers["Api-Version"] = "alpha";
            return requestConfig;
        });
    }

    /**
     * Override to handle FreshBooks-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: FreshBooksErrorResponse };
            };
            const response = errorWithResponse.response;

            if (response?.data?.response?.errors && response.data.response.errors.length > 0) {
                const fbError = response.data.response.errors[0];
                throw new Error(
                    `FreshBooks API error: ${fbError.message || "Unknown error"}${
                        fbError.field ? ` (field: ${fbError.field})` : ""
                    }${fbError.errno ? ` (errno: ${fbError.errno})` : ""}`
                );
            }

            if (response?.status === 401) {
                throw new Error(
                    "FreshBooks authentication failed. Please reconnect your FreshBooks account."
                );
            }

            if (response?.status === 403) {
                throw new Error(
                    "FreshBooks permission denied. Your account may not have access to this resource."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in FreshBooks.");
            }

            if (response?.status === 429) {
                throw new Error("FreshBooks rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // User Operations
    // ============================================

    /**
     * Get authenticated user details
     */
    async getMe(): Promise<FreshBooksUserResponse> {
        return this.get("/auth/api/v1/users/me");
    }

    // ============================================
    // Client Operations
    // ============================================

    /**
     * List clients with pagination
     */
    async listClients(
        page: number = 1,
        perPage: number = 25,
        search?: string
    ): Promise<FreshBooksListResponse<FreshBooksClient>> {
        let url = `/accounting/account/${this.accountId}/users/clients?page=${page}&per_page=${perPage}`;
        if (search) {
            url += `&search[email_like]=${encodeURIComponent(search)}`;
        }
        return this.get(url);
    }

    /**
     * Create a new client
     */
    async createClient(data: {
        email: string;
        fname?: string;
        lname?: string;
        organization?: string;
        bus_phone?: string;
    }): Promise<FreshBooksSingleResponse<FreshBooksClient>> {
        return this.post(`/accounting/account/${this.accountId}/users/clients`, {
            client: data
        });
    }

    // ============================================
    // Invoice Operations
    // ============================================

    /**
     * List invoices with pagination
     */
    async listInvoices(
        page: number = 1,
        perPage: number = 25,
        status?: string
    ): Promise<FreshBooksListResponse<FreshBooksInvoice>> {
        let url = `/accounting/account/${this.accountId}/invoices/invoices?page=${page}&per_page=${perPage}`;
        if (status) {
            url += `&search[v3_status]=${encodeURIComponent(status)}`;
        }
        return this.get(url);
    }

    /**
     * Get a single invoice by ID
     */
    async getInvoice(invoiceId: string): Promise<FreshBooksSingleResponse<FreshBooksInvoice>> {
        return this.get(
            `/accounting/account/${this.accountId}/invoices/invoices/${invoiceId}?include[]=lines`
        );
    }

    /**
     * Create a new invoice
     */
    async createInvoice(data: {
        customerid: number;
        lines: Array<{
            name: string;
            amount: { amount: string; code: string };
            qty: number;
        }>;
        due_offset_days?: number;
        notes?: string;
        create_date?: string;
    }): Promise<FreshBooksSingleResponse<FreshBooksInvoice>> {
        return this.post(`/accounting/account/${this.accountId}/invoices/invoices`, {
            invoice: data
        });
    }

    // ============================================
    // Expense Operations
    // ============================================

    /**
     * List expenses with pagination
     */
    async listExpenses(
        page: number = 1,
        perPage: number = 25
    ): Promise<FreshBooksListResponse<FreshBooksExpense>> {
        return this.get(
            `/accounting/account/${this.accountId}/expenses/expenses?page=${page}&per_page=${perPage}`
        );
    }
}
