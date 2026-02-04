/**
 * Xero HTTP Client
 *
 * Handles all HTTP communication with Xero API.
 * Uses OAuth2 Bearer token authentication with Xero-Tenant-Id header.
 *
 * Base URL: https://api.xero.com/api.xro/2.0/
 *
 * Rate limit: 60 requests/minute per organisation
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface XeroClientConfig {
    accessToken: string;
    tenantId: string;
    connectionId?: string;
}

// ============================================
// Xero API Types
// ============================================

export interface XeroOrganisation {
    OrganisationID: string;
    Name: string;
    LegalName?: string;
    ShortCode?: string;
    Version?: string;
    OrganisationType?: string;
    BaseCurrency?: string;
    CountryCode?: string;
    IsDemoCompany?: boolean;
    TaxNumber?: string;
    FinancialYearEndDay?: number;
    FinancialYearEndMonth?: number;
    LineOfBusiness?: string;
    RegistrationNumber?: string;
    CreatedDateUTC?: string;
}

export interface XeroContact {
    ContactID: string;
    Name: string;
    FirstName?: string;
    LastName?: string;
    EmailAddress?: string;
    ContactStatus?: string;
    Phones?: Array<{
        PhoneType: string;
        PhoneNumber?: string;
        PhoneAreaCode?: string;
        PhoneCountryCode?: string;
    }>;
    Addresses?: Array<{
        AddressType: string;
        AddressLine1?: string;
        City?: string;
        Region?: string;
        PostalCode?: string;
        Country?: string;
    }>;
    IsSupplier?: boolean;
    IsCustomer?: boolean;
    UpdatedDateUTC?: string;
}

export interface XeroInvoice {
    InvoiceID: string;
    InvoiceNumber?: string;
    Type: string;
    Status: string;
    Contact: {
        ContactID: string;
        Name?: string;
    };
    Date?: string;
    DueDate?: string;
    LineItems: Array<{
        LineItemID?: string;
        Description?: string;
        Quantity?: number;
        UnitAmount?: number;
        LineAmount?: number;
        AccountCode?: string;
        TaxType?: string;
    }>;
    SubTotal?: number;
    TotalTax?: number;
    Total?: number;
    AmountDue?: number;
    AmountPaid?: number;
    CurrencyCode?: string;
    Reference?: string;
    UpdatedDateUTC?: string;
}

export interface XeroResponse<T> {
    Organisations?: T[];
    Contacts?: T[];
    Invoices?: T[];
}

interface XeroErrorResponse {
    ErrorNumber?: number;
    Type?: string;
    Message?: string;
    Elements?: Array<{
        ValidationErrors?: Array<{
            Message?: string;
        }>;
    }>;
}

export class XeroClient extends BaseAPIClient {
    private tenantId: string;

    constructor(config: XeroClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.xero.com/api.xro/2.0",
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

        this.tenantId = config.tenantId;

        // Add authorization and tenant headers
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${config.accessToken}`;
            requestConfig.headers["Xero-Tenant-Id"] = this.tenantId;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Override to handle Xero-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: XeroErrorResponse };
            };
            const response = errorWithResponse.response;

            if (response?.data?.Message) {
                throw new Error(
                    `Xero API error: ${response.data.Message}${
                        response.data.ErrorNumber ? ` (code: ${response.data.ErrorNumber})` : ""
                    }`
                );
            }

            if (
                response?.data?.Elements &&
                response.data.Elements.length > 0 &&
                response.data.Elements[0].ValidationErrors
            ) {
                const validationErrors = response.data.Elements[0].ValidationErrors;
                const message = validationErrors.map((e) => e.Message).join("; ");
                throw new Error(`Xero validation error: ${message}`);
            }

            if (response?.status === 401) {
                throw new Error("Xero authentication failed. Please reconnect your Xero account.");
            }

            if (response?.status === 403) {
                throw new Error(
                    "Xero permission denied. Your account may not have access to this resource."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in Xero.");
            }

            if (response?.status === 429) {
                throw new Error("Xero rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // Organisation Operations
    // ============================================

    /**
     * Get organisation information
     */
    async getOrganisation(): Promise<XeroResponse<XeroOrganisation>> {
        return this.get("/Organisation");
    }

    // ============================================
    // Contact Operations
    // ============================================

    /**
     * List contacts with pagination
     */
    async listContacts(page: number = 1): Promise<XeroResponse<XeroContact>> {
        return this.get(`/Contacts?page=${page}`);
    }

    /**
     * Get a single contact by ID
     */
    async getContact(contactId: string): Promise<XeroResponse<XeroContact>> {
        return this.get(`/Contacts/${contactId}`);
    }

    /**
     * Create a new contact
     */
    async createContact(data: {
        Name: string;
        FirstName?: string;
        LastName?: string;
        EmailAddress?: string;
        Phones?: Array<{
            PhoneType: string;
            PhoneNumber?: string;
            PhoneAreaCode?: string;
        }>;
    }): Promise<XeroResponse<XeroContact>> {
        return this.post("/Contacts", data);
    }

    // ============================================
    // Invoice Operations
    // ============================================

    /**
     * List invoices with pagination
     */
    async listInvoices(page: number = 1): Promise<XeroResponse<XeroInvoice>> {
        return this.get(`/Invoices?page=${page}`);
    }

    /**
     * Get a single invoice by ID
     */
    async getInvoice(invoiceId: string): Promise<XeroResponse<XeroInvoice>> {
        return this.get(`/Invoices/${invoiceId}`);
    }

    /**
     * Create a new invoice
     */
    async createInvoice(data: {
        Type: string;
        Contact: { ContactID: string };
        LineItems: Array<{
            Description: string;
            Quantity?: number;
            UnitAmount?: number;
            AccountCode?: string;
        }>;
        Date?: string;
        DueDate?: string;
        Reference?: string;
        Status?: string;
    }): Promise<XeroResponse<XeroInvoice>> {
        return this.post("/Invoices", data);
    }
}
