/**
 * Sage HTTP Client
 *
 * Handles all HTTP communication with Sage Business Cloud Accounting API.
 * Uses OAuth2 Bearer token authentication.
 *
 * Base URL: https://api.accounting.sage.com/v3.1
 *
 * Rate limit: 200 requests/minute per business
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface SageClientConfig {
    accessToken: string;
    connectionId?: string;
}

// ============================================
// Sage API Types
// ============================================

export interface SageBusiness {
    name?: string;
    country_code?: string;
    default_currency?: string;
    industry_type?: string;
    telephone?: string;
    email?: string;
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    region?: string;
    postal_code?: string;
    country?: string;
    created_at?: string;
    updated_at?: string;
}

export interface SageContact {
    id: string;
    displayed_as?: string;
    name?: string;
    contact_type_name?: string;
    reference?: string;
    email?: string;
    telephone?: string;
    mobile?: string;
    main_address?: {
        address_line_1?: string;
        address_line_2?: string;
        city?: string;
        region?: string;
        postal_code?: string;
        country?: string;
    };
    credit_limit?: number;
    credit_days?: number;
    currency?: string;
    created_at?: string;
    updated_at?: string;
}

export interface SageSalesInvoice {
    id: string;
    displayed_as?: string;
    invoice_number?: string;
    status?: {
        id?: string;
        displayed_as?: string;
    };
    contact: {
        id: string;
        displayed_as?: string;
    };
    date?: string;
    due_date?: string;
    invoice_lines?: Array<{
        id?: string;
        description?: string;
        quantity?: number;
        unit_price?: number;
        total_amount?: number;
        ledger_account?: {
            id?: string;
            displayed_as?: string;
        };
        tax_rate?: {
            id?: string;
            displayed_as?: string;
        };
    }>;
    net_amount?: number;
    tax_amount?: number;
    total_amount?: number;
    outstanding_amount?: number;
    currency?: {
        id?: string;
        displayed_as?: string;
    };
    reference?: string;
    created_at?: string;
    updated_at?: string;
}

export interface SageListResponse<T> {
    $items: T[];
    $total?: number;
    $page?: number;
    $next?: string;
}

interface SageErrorResponse {
    $severity?: string;
    $dataCode?: string;
    $message?: string;
    $source?: string;
}

export class SageClient extends BaseAPIClient {
    constructor(config: SageClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.accounting.sage.com/v3.1",
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

        // Add authorization headers
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${config.accessToken}`;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Override to handle Sage-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: SageErrorResponse | SageErrorResponse[] };
            };
            const response = errorWithResponse.response;

            // Sage can return an array of errors or a single error object
            const errorData = Array.isArray(response?.data) ? response?.data[0] : response?.data;

            if (errorData?.$message) {
                throw new Error(
                    `Sage API error: ${errorData.$message}${
                        errorData.$dataCode ? ` (code: ${errorData.$dataCode})` : ""
                    }`
                );
            }

            if (response?.status === 401) {
                throw new Error("Sage authentication failed. Please reconnect your Sage account.");
            }

            if (response?.status === 403) {
                throw new Error(
                    "Sage permission denied. Your account may not have access to this resource."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in Sage.");
            }

            if (response?.status === 429) {
                throw new Error("Sage rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // Business Operations
    // ============================================

    /**
     * Get business information
     */
    async getBusiness(): Promise<SageBusiness> {
        return this.get("/business");
    }

    // ============================================
    // Contact Operations
    // ============================================

    /**
     * List contacts with pagination
     */
    async listContacts(
        page: number = 1,
        itemsPerPage: number = 20
    ): Promise<SageListResponse<SageContact>> {
        return this.get(`/contacts?page=${page}&items_per_page=${itemsPerPage}`);
    }

    /**
     * Get a single contact by ID
     */
    async getContact(contactId: string): Promise<SageContact> {
        return this.get(`/contacts/${contactId}`);
    }

    /**
     * Create a new contact
     */
    async createContact(data: {
        contact: {
            name: string;
            contact_type_ids: string[];
            reference?: string;
            email?: string;
            telephone?: string;
            mobile?: string;
            main_address?: {
                address_line_1?: string;
                city?: string;
                region?: string;
                postal_code?: string;
                country?: string;
            };
        };
    }): Promise<SageContact> {
        return this.post("/contacts", data);
    }

    // ============================================
    // Sales Invoice Operations
    // ============================================

    /**
     * List sales invoices with pagination
     */
    async listSalesInvoices(
        page: number = 1,
        itemsPerPage: number = 20
    ): Promise<SageListResponse<SageSalesInvoice>> {
        return this.get(`/sales_invoices?page=${page}&items_per_page=${itemsPerPage}`);
    }

    /**
     * Get a single sales invoice by ID
     */
    async getSalesInvoice(invoiceId: string): Promise<SageSalesInvoice> {
        return this.get(`/sales_invoices/${invoiceId}`);
    }

    /**
     * Create a new sales invoice
     */
    async createSalesInvoice(data: {
        sales_invoice: {
            contact_id: string;
            date: string;
            due_date?: string;
            reference?: string;
            invoice_lines: Array<{
                description: string;
                quantity?: number;
                unit_price: number;
                ledger_account_id?: string;
                tax_rate_id?: string;
            }>;
        };
    }): Promise<SageSalesInvoice> {
        return this.post("/sales_invoices", data);
    }
}
