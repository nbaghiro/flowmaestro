import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";

export interface PowerBIClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

interface PowerBIErrorResponse {
    error: {
        code: string;
        message: string;
        details?: unknown[];
    };
}

/**
 * Power BI REST API Client
 *
 * API Documentation: https://learn.microsoft.com/en-us/rest/api/power-bi/
 * Base URL: https://api.powerbi.com/v1.0/myorg
 */
export class PowerBIClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: PowerBIClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.powerbi.com/v1.0/myorg",
            timeout: 60000, // Power BI operations can take longer
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503, 504],
                backoffStrategy: "exponential"
            },
            connectionPool: {
                maxSockets: 50,
                maxFreeSockets: 10,
                keepAlive: true
            }
        };

        super(clientConfig);
        this.accessToken = config.accessToken;

        // Add request interceptor for auth header
        this.client.addRequestInterceptor((config) => {
            if (!config.headers) {
                config.headers = {};
            }
            config.headers["Authorization"] = `Bearer ${this.accessToken}`;
            config.headers["Content-Type"] = "application/json";
            return config;
        });
    }

    /**
     * Handle Power BI API-specific errors
     */
    protected async handleError(
        error: Error & {
            response?: { status?: number; data?: unknown; headers?: Record<string, string> };
        }
    ): Promise<never> {
        if (error.response) {
            const { status, data } = error.response;

            if (status === 401) {
                throw new Error("Power BI authentication failed. Please reconnect.");
            }

            if (status === 403) {
                const errorData = data as PowerBIErrorResponse;
                throw new Error(
                    `Permission denied: ${errorData?.error?.message || "You don't have permission to access this resource."}`
                );
            }

            if (status === 404) {
                throw new Error("Resource not found.");
            }

            if (status === 429) {
                const retryAfter = error.response.headers?.["retry-after"];
                throw new Error(
                    `Power BI rate limit exceeded. Retry after ${retryAfter || "60"} seconds.`
                );
            }

            if (status === 400) {
                const errorData = data as PowerBIErrorResponse;
                throw new Error(`Invalid request: ${errorData?.error?.message || "Bad request"}`);
            }

            if ((data as PowerBIErrorResponse)?.error) {
                const errorData = data as PowerBIErrorResponse;
                throw new Error(`Power BI API error: ${errorData.error.message}`);
            }
        }

        throw error;
    }

    // ==================== Workspace Operations ====================

    /**
     * List all workspaces (groups)
     */
    async listWorkspaces(params?: {
        filter?: string;
        top?: number;
        skip?: number;
    }): Promise<unknown> {
        const queryParams: Record<string, string> = {};
        if (params?.filter) queryParams["$filter"] = params.filter;
        if (params?.top) queryParams["$top"] = params.top.toString();
        if (params?.skip) queryParams["$skip"] = params.skip.toString();

        const query = new URLSearchParams(queryParams).toString();
        return this.get(`/groups${query ? `?${query}` : ""}`);
    }

    // ==================== Report Operations ====================

    /**
     * List reports in a workspace
     */
    async listReports(workspaceId?: string): Promise<unknown> {
        if (workspaceId) {
            return this.get(`/groups/${workspaceId}/reports`);
        }
        // My Workspace
        return this.get("/reports");
    }

    /**
     * Get report details
     */
    async getReport(reportId: string, workspaceId?: string): Promise<unknown> {
        if (workspaceId) {
            return this.get(`/groups/${workspaceId}/reports/${reportId}`);
        }
        return this.get(`/reports/${reportId}`);
    }

    /**
     * Export report to file
     */
    async exportReport(params: {
        reportId: string;
        workspaceId?: string;
        format: "PDF" | "PPTX" | "PNG";
        pages?: string[];
    }): Promise<unknown> {
        const body: Record<string, unknown> = {
            format: params.format
        };

        if (params.pages && params.pages.length > 0) {
            body.powerBIReportConfiguration = {
                pages: params.pages.map((pageName) => ({ pageName }))
            };
        }

        if (params.workspaceId) {
            return this.post(
                `/groups/${params.workspaceId}/reports/${params.reportId}/ExportTo`,
                body
            );
        }
        return this.post(`/reports/${params.reportId}/ExportTo`, body);
    }

    // ==================== Dataset Operations ====================

    /**
     * List datasets in a workspace
     */
    async listDatasets(workspaceId?: string): Promise<unknown> {
        if (workspaceId) {
            return this.get(`/groups/${workspaceId}/datasets`);
        }
        return this.get("/datasets");
    }

    /**
     * Get dataset details
     */
    async getDataset(datasetId: string, workspaceId?: string): Promise<unknown> {
        if (workspaceId) {
            return this.get(`/groups/${workspaceId}/datasets/${datasetId}`);
        }
        return this.get(`/datasets/${datasetId}`);
    }

    /**
     * Trigger dataset refresh
     */
    async refreshDataset(params: {
        datasetId: string;
        workspaceId?: string;
        notifyOption?: "MailOnCompletion" | "MailOnFailure" | "NoNotification";
    }): Promise<unknown> {
        const body: Record<string, unknown> = {};
        if (params.notifyOption) {
            body.notifyOption = params.notifyOption;
        }

        if (params.workspaceId) {
            return this.post(
                `/groups/${params.workspaceId}/datasets/${params.datasetId}/refreshes`,
                body
            );
        }
        return this.post(`/datasets/${params.datasetId}/refreshes`, body);
    }

    // ==================== Dashboard Operations ====================

    /**
     * List dashboards in a workspace
     */
    async listDashboards(workspaceId?: string): Promise<unknown> {
        if (workspaceId) {
            return this.get(`/groups/${workspaceId}/dashboards`);
        }
        return this.get("/dashboards");
    }

    /**
     * Get dashboard details
     */
    async getDashboard(dashboardId: string, workspaceId?: string): Promise<unknown> {
        if (workspaceId) {
            return this.get(`/groups/${workspaceId}/dashboards/${dashboardId}`);
        }
        return this.get(`/dashboards/${dashboardId}`);
    }
}
