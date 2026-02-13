import { GoogleBaseClient } from "../../../core/google";

export interface GoogleFormsClientConfig {
    accessToken: string;
    connectionId?: string;
}

/**
 * Google Forms API v1 Client with connection pooling and error handling
 *
 * API Documentation: https://developers.google.com/forms/api/reference/rest
 * Base URL: https://forms.googleapis.com
 */
export class GoogleFormsClient extends GoogleBaseClient {
    constructor(config: GoogleFormsClientConfig) {
        super({
            accessToken: config.accessToken,
            baseURL: "https://forms.googleapis.com",
            serviceName: "Google Forms"
        });
    }

    /**
     * Override to provide service-specific not found message
     */
    protected getNotFoundMessage(): string {
        return "Form or resource not found.";
    }

    // ==================== Form Operations ====================

    /**
     * Get form metadata and structure
     */
    async getForm(formId: string): Promise<unknown> {
        return this.get(`/v1/forms/${formId}`);
    }

    /**
     * Create a new form
     */
    async createForm(params: { title: string }): Promise<unknown> {
        return this.post("/v1/forms", {
            info: {
                title: params.title
            }
        });
    }

    /**
     * Batch update a form (add/modify questions, settings, etc.)
     */
    async batchUpdateForm(formId: string, requests: unknown[]): Promise<unknown> {
        return this.post(`/v1/forms/${formId}:batchUpdate`, {
            requests
        });
    }

    // ==================== Response Operations ====================

    /**
     * List all responses for a form
     */
    async listResponses(
        formId: string,
        params?: {
            pageSize?: number;
            pageToken?: string;
            filter?: string;
        }
    ): Promise<unknown> {
        const queryParams: Record<string, string> = {};

        if (params?.pageSize) {
            queryParams.pageSize = params.pageSize.toString();
        }
        if (params?.pageToken) {
            queryParams.pageToken = params.pageToken;
        }
        if (params?.filter) {
            queryParams.filter = params.filter;
        }

        return this.get(`/v1/forms/${formId}/responses`, {
            params: queryParams
        });
    }

    /**
     * Get a single response by ID
     */
    async getResponse(formId: string, responseId: string): Promise<unknown> {
        return this.get(`/v1/forms/${formId}/responses/${responseId}`);
    }
}
