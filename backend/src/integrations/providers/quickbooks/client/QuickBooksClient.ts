/**
 * QuickBooks HTTP Client
 *
 * Handles all HTTP communication with QuickBooks API.
 * Uses OAuth2 Bearer token authentication.
 *
 * Base URL (Production): https://quickbooks.api.intuit.com/v3/company/{realmId}
 * Base URL (Sandbox): https://sandbox-quickbooks.api.intuit.com/v3/company/{realmId}
 *
 * Rate limit: 500 requests/minute
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface QuickBooksClientConfig {
    accessToken: string;
    realmId: string;
    connectionId?: string;
    sandbox?: boolean;
}

// ============================================
// QuickBooks API Types
// ============================================

export interface QuickBooksCustomer {
    Id: string;
    DisplayName: string;
    GivenName?: string;
    FamilyName?: string;
    CompanyName?: string;
    PrimaryEmailAddr?: { Address: string };
    PrimaryPhone?: { FreeFormNumber: string };
    BillAddr?: {
        Line1?: string;
        City?: string;
        CountrySubDivisionCode?: string;
        PostalCode?: string;
    };
    Balance?: number;
    Active?: boolean;
    MetaData?: {
        CreateTime: string;
        LastUpdatedTime: string;
    };
}

export interface QuickBooksInvoice {
    Id: string;
    DocNumber?: string;
    TxnDate?: string;
    DueDate?: string;
    CustomerRef: { value: string; name?: string };
    Line: Array<{
        Id?: string;
        LineNum?: number;
        Description?: string;
        Amount: number;
        DetailType: string;
        SalesItemLineDetail?: {
            ItemRef?: { value: string; name?: string };
            Qty?: number;
            UnitPrice?: number;
        };
    }>;
    TotalAmt: number;
    Balance?: number;
    BillEmail?: { Address: string };
    EmailStatus?: string;
    MetaData?: {
        CreateTime: string;
        LastUpdatedTime: string;
    };
}

export interface QuickBooksCompanyInfo {
    Id: string;
    CompanyName: string;
    LegalName?: string;
    CompanyAddr?: {
        Line1?: string;
        City?: string;
        CountrySubDivisionCode?: string;
        PostalCode?: string;
        Country?: string;
    };
    CustomerCommunicationAddr?: {
        Line1?: string;
        City?: string;
        CountrySubDivisionCode?: string;
        PostalCode?: string;
    };
    PrimaryPhone?: { FreeFormNumber: string };
    Email?: { Address: string };
    WebAddr?: { URI: string };
    FiscalYearStartMonth?: string;
    Country?: string;
}

export interface QuickBooksQueryResponse<T> {
    QueryResponse: {
        Customer?: T[];
        Invoice?: T[];
        startPosition?: number;
        maxResults?: number;
        totalCount?: number;
    };
}

export interface QuickBooksSingleResponse<T> {
    [key: string]: T;
}

interface QuickBooksErrorResponse {
    Fault?: {
        Error?: Array<{
            Message?: string;
            Detail?: string;
            code?: string;
        }>;
        type?: string;
    };
}

export class QuickBooksClient extends BaseAPIClient {
    private realmId: string;

    constructor(config: QuickBooksClientConfig) {
        const baseURL = config.sandbox
            ? `https://sandbox-quickbooks.api.intuit.com/v3/company/${config.realmId}`
            : `https://quickbooks.api.intuit.com/v3/company/${config.realmId}`;

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

        this.realmId = config.realmId;

        // Add authorization header
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
     * Override to handle QuickBooks-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: QuickBooksErrorResponse };
            };
            const response = errorWithResponse.response;

            if (response?.data?.Fault?.Error && response.data.Fault.Error.length > 0) {
                const qbError = response.data.Fault.Error[0];
                throw new Error(
                    `QuickBooks API error: ${qbError.Message || "Unknown error"}${
                        qbError.Detail ? ` - ${qbError.Detail}` : ""
                    }${qbError.code ? ` (code: ${qbError.code})` : ""}`
                );
            }

            if (response?.status === 401) {
                throw new Error(
                    "QuickBooks authentication failed. Please reconnect your QuickBooks account."
                );
            }

            if (response?.status === 403) {
                throw new Error(
                    "QuickBooks permission denied. Your account may not have access to this resource."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in QuickBooks.");
            }

            if (response?.status === 429) {
                throw new Error("QuickBooks rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // Customer Operations
    // ============================================

    /**
     * List customers with pagination
     */
    async listCustomers(
        maxResults: number = 100,
        startPosition: number = 1
    ): Promise<QuickBooksQueryResponse<QuickBooksCustomer>> {
        const query = `SELECT * FROM Customer STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;
        return this.get(`/query?query=${encodeURIComponent(query)}&minorversion=73`);
    }

    /**
     * Get a single customer by ID
     */
    async getCustomer(customerId: string): Promise<QuickBooksSingleResponse<QuickBooksCustomer>> {
        return this.get(`/customer/${customerId}?minorversion=73`);
    }

    /**
     * Create a new customer
     */
    async createCustomer(data: {
        DisplayName: string;
        GivenName?: string;
        FamilyName?: string;
        CompanyName?: string;
        PrimaryEmailAddr?: { Address: string };
        PrimaryPhone?: { FreeFormNumber: string };
    }): Promise<QuickBooksSingleResponse<QuickBooksCustomer>> {
        return this.post("/customer?minorversion=73", data);
    }

    // ============================================
    // Invoice Operations
    // ============================================

    /**
     * List invoices with pagination
     */
    async listInvoices(
        maxResults: number = 100,
        startPosition: number = 1
    ): Promise<QuickBooksQueryResponse<QuickBooksInvoice>> {
        const query = `SELECT * FROM Invoice STARTPOSITION ${startPosition} MAXRESULTS ${maxResults}`;
        return this.get(`/query?query=${encodeURIComponent(query)}&minorversion=73`);
    }

    /**
     * Get a single invoice by ID
     */
    async getInvoice(invoiceId: string): Promise<QuickBooksSingleResponse<QuickBooksInvoice>> {
        return this.get(`/invoice/${invoiceId}?minorversion=73`);
    }

    /**
     * Create a new invoice
     */
    async createInvoice(data: {
        CustomerRef: { value: string };
        Line: Array<{
            Amount: number;
            DetailType: string;
            Description?: string;
            SalesItemLineDetail?: {
                ItemRef?: { value: string };
                Qty?: number;
                UnitPrice?: number;
            };
        }>;
        DueDate?: string;
        DocNumber?: string;
        BillEmail?: { Address: string };
    }): Promise<QuickBooksSingleResponse<QuickBooksInvoice>> {
        return this.post("/invoice?minorversion=73", data);
    }

    // ============================================
    // Company Operations
    // ============================================

    /**
     * Get company information
     */
    async getCompanyInfo(): Promise<QuickBooksSingleResponse<QuickBooksCompanyInfo>> {
        return this.get(`/companyinfo/${this.realmId}?minorversion=73`);
    }
}
