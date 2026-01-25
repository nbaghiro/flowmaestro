/**
 * SendGrid HTTP Client
 *
 * Handles all HTTP communication with SendGrid API.
 * Uses Bearer token authentication with API key.
 *
 * Base URL: https://api.sendgrid.com/v3
 *
 * Rate limit: 600 requests/minute
 */

import { BaseAPIClient, type BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface SendGridClientConfig {
    apiKey: string;
    connectionId?: string;
}

// ============================================
// SendGrid API Types
// ============================================

export interface SendGridContact {
    id?: string;
    email: string;
    first_name?: string;
    last_name?: string;
    alternate_emails?: string[];
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    state_province_region?: string;
    postal_code?: string;
    country?: string;
    phone_number?: string;
    whatsapp?: string;
    line?: string;
    facebook?: string;
    unique_name?: string;
    custom_fields?: Record<string, string>;
    created_at?: string;
    updated_at?: string;
}

export interface SendGridList {
    id: string;
    name: string;
    contact_count: number;
    _metadata?: {
        self?: string;
    };
}

export interface SendGridTemplate {
    id: string;
    name: string;
    generation: "legacy" | "dynamic";
    updated_at?: string;
    versions?: Array<{
        id: string;
        name: string;
        active: number;
        updated_at?: string;
    }>;
}

export interface SendGridEmailPersonalization {
    to: Array<{ email: string; name?: string }>;
    cc?: Array<{ email: string; name?: string }>;
    bcc?: Array<{ email: string; name?: string }>;
    subject?: string;
    dynamic_template_data?: Record<string, unknown>;
    custom_args?: Record<string, string>;
    send_at?: number;
}

export interface SendGridEmailRequest {
    personalizations: SendGridEmailPersonalization[];
    from: { email: string; name?: string };
    reply_to?: { email: string; name?: string };
    subject?: string;
    content?: Array<{ type: string; value: string }>;
    template_id?: string;
    attachments?: Array<{
        content: string; // Base64 encoded
        type?: string;
        filename: string;
        disposition?: "attachment" | "inline";
        content_id?: string;
    }>;
    categories?: string[];
    send_at?: number;
    batch_id?: string;
    asm?: {
        group_id: number;
        groups_to_display?: number[];
    };
    tracking_settings?: {
        click_tracking?: { enable: boolean };
        open_tracking?: { enable: boolean };
        subscription_tracking?: { enable: boolean };
    };
}

export interface SendGridStats {
    date: string;
    stats: Array<{
        metrics: {
            blocks?: number;
            bounce_drops?: number;
            bounces?: number;
            clicks?: number;
            deferred?: number;
            delivered?: number;
            invalid_emails?: number;
            opens?: number;
            processed?: number;
            requests?: number;
            spam_report_drops?: number;
            spam_reports?: number;
            unique_clicks?: number;
            unique_opens?: number;
            unsubscribe_drops?: number;
            unsubscribes?: number;
        };
    }>;
}

export interface SendGridValidationResult {
    result: {
        email: string;
        verdict: "Valid" | "Risky" | "Invalid";
        score: number;
        local: string;
        host: string;
        suggestion?: string;
        checks: {
            domain: {
                has_valid_address_syntax: boolean;
                has_mx_or_a_record: boolean;
                is_suspected_disposable_address: boolean;
            };
            local_part: {
                is_suspected_role_address: boolean;
            };
            additional: {
                has_known_bounces: boolean;
                has_suspected_bounces: boolean;
            };
        };
        ip_address?: string;
    };
}

interface SendGridErrorResponse {
    errors?: Array<{
        message?: string;
        field?: string;
        help?: string;
    }>;
}

export class SendGridClient extends BaseAPIClient {
    constructor(config: SendGridClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.sendgrid.com/v3",
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

        // Add authorization header using API key
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${config.apiKey}`;
            requestConfig.headers["Content-Type"] = "application/json";
            requestConfig.headers["Accept"] = "application/json";
            return requestConfig;
        });
    }

    /**
     * Override request to handle SendGrid-specific error formats
     */
    protected override async handleError(error: unknown): Promise<never> {
        if (error && typeof error === "object" && "response" in error) {
            const errorWithResponse = error as {
                response?: { status?: number; data?: SendGridErrorResponse };
            };
            const response = errorWithResponse.response;

            if (response?.data?.errors && response.data.errors.length > 0) {
                const sendgridError = response.data.errors[0];
                throw new Error(
                    `SendGrid API error: ${sendgridError.message || "Unknown error"}${
                        sendgridError.field ? ` (field: ${sendgridError.field})` : ""
                    }`
                );
            }

            if (response?.status === 401) {
                throw new Error("SendGrid authentication failed. Please check your API key.");
            }

            if (response?.status === 403) {
                throw new Error(
                    "SendGrid permission denied. Your API key may not have access to this resource."
                );
            }

            if (response?.status === 404) {
                throw new Error("Resource not found in SendGrid.");
            }

            if (response?.status === 429) {
                throw new Error("SendGrid rate limit exceeded. Please try again later.");
            }
        }

        throw error;
    }

    // ============================================
    // Email Operations
    // ============================================

    /**
     * Send an email
     */
    async sendEmail(request: SendGridEmailRequest): Promise<void> {
        await this.post("/mail/send", request);
    }

    // ============================================
    // Contact Operations
    // ============================================

    /**
     * Get contacts with optional search
     */
    async getContacts(params?: { page_size?: number; page_token?: string }): Promise<{
        result: SendGridContact[];
        _metadata?: {
            next?: string;
            self?: string;
        };
        contact_count?: number;
    }> {
        return this.get("/marketing/contacts", params);
    }

    /**
     * Get a single contact by ID
     */
    async getContact(contactId: string): Promise<SendGridContact> {
        return this.get(`/marketing/contacts/${contactId}`);
    }

    /**
     * Add or update contacts (upsert)
     * Returns a job ID for async processing
     */
    async addContacts(
        contacts: SendGridContact[],
        listIds?: string[]
    ): Promise<{ job_id: string }> {
        return this.put("/marketing/contacts", {
            contacts,
            list_ids: listIds
        });
    }

    /**
     * Delete contacts by IDs
     * Returns a job ID for async processing
     */
    async deleteContacts(
        contactIds: string[],
        deleteAllContacts?: boolean
    ): Promise<{ job_id: string }> {
        const params: Record<string, string> = {};
        if (deleteAllContacts) {
            params.delete_all_contacts = "true";
        } else {
            params.ids = contactIds.join(",");
        }
        return this.request({ method: "DELETE", url: "/marketing/contacts", params });
    }

    /**
     * Search contacts using SGQL query
     */
    async searchContacts(query: string): Promise<{
        result: SendGridContact[];
        contact_count: number;
    }> {
        return this.post("/marketing/contacts/search", { query });
    }

    /**
     * Get contact count
     */
    async getContactCount(): Promise<{ contact_count: number; billable_count: number }> {
        return this.get("/marketing/contacts/count");
    }

    // ============================================
    // List Operations
    // ============================================

    /**
     * Get all lists
     */
    async getLists(params?: { page_size?: number; page_token?: string }): Promise<{
        result: SendGridList[];
        _metadata?: {
            next?: string;
            self?: string;
        };
    }> {
        return this.get("/marketing/lists", params);
    }

    /**
     * Get a single list by ID
     */
    async getList(listId: string, contactSample?: boolean): Promise<SendGridList> {
        return this.get(`/marketing/lists/${listId}`, {
            contact_sample: contactSample ? "true" : undefined
        });
    }

    /**
     * Create a new list
     */
    async createList(name: string): Promise<SendGridList> {
        return this.post("/marketing/lists", { name });
    }

    /**
     * Update a list name
     */
    async updateList(listId: string, name: string): Promise<SendGridList> {
        return this.patch(`/marketing/lists/${listId}`, { name });
    }

    /**
     * Delete a list
     */
    async deleteList(listId: string, deleteContacts?: boolean): Promise<void> {
        await this.request({
            method: "DELETE",
            url: `/marketing/lists/${listId}`,
            params: { delete_contacts: deleteContacts ? "true" : "false" }
        });
    }

    /**
     * Add contacts to a list
     */
    async addContactsToList(listId: string, contactIds: string[]): Promise<{ job_id: string }> {
        return this.put("/marketing/contacts", {
            list_ids: [listId],
            contacts: contactIds.map((id) => ({ id }))
        });
    }

    /**
     * Remove contacts from a list
     */
    async removeContactsFromList(
        listId: string,
        contactIds: string[]
    ): Promise<{ job_id: string }> {
        return this.request({
            method: "DELETE",
            url: `/marketing/lists/${listId}/contacts`,
            params: { contact_ids: contactIds.join(",") }
        });
    }

    // ============================================
    // Template Operations
    // ============================================

    /**
     * Get all templates
     */
    async getTemplates(params?: {
        generations?: "legacy" | "dynamic" | "legacy,dynamic";
        page_size?: number;
        page_token?: string;
    }): Promise<{
        result: SendGridTemplate[];
        _metadata?: {
            count?: number;
            self?: string;
            next?: string;
        };
    }> {
        return this.get("/templates", params);
    }

    /**
     * Get a single template by ID
     */
    async getTemplate(templateId: string): Promise<SendGridTemplate> {
        return this.get(`/templates/${templateId}`);
    }

    // ============================================
    // Validation Operations
    // ============================================

    /**
     * Validate an email address
     */
    async validateEmail(email: string, source?: string): Promise<SendGridValidationResult> {
        return this.post("/validations/email", { email, source });
    }

    // ============================================
    // Stats Operations
    // ============================================

    /**
     * Get global email stats
     */
    async getStats(params: {
        start_date: string;
        end_date?: string;
        aggregated_by?: "day" | "week" | "month";
    }): Promise<SendGridStats[]> {
        return this.get("/stats", params);
    }
}
