import { isFetchError } from "../../../../core/utils/fetch-client";
import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";
import type { RequestConfig } from "../../../core/types";
import type {
    ClickUpTeamsResponse,
    ClickUpSpacesResponse,
    ClickUpListsResponse,
    ClickUpTasksResponse,
    ClickUpTask,
    ClickUpCommentsResponse,
    ClickUpComment,
    ClickUpUserResponse
} from "../operations/types";

export interface ClickUpClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

/**
 * ClickUp API error response format
 */
interface ClickUpErrorResponse {
    err?: string;
    ECODE?: string;
}

/**
 * ClickUp API Client with connection pooling and error handling
 *
 * API Base URL: https://api.clickup.com/api/v2
 * Authentication: Access token in Authorization header (no Bearer prefix)
 */
export class ClickUpClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: ClickUpClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.clickup.com/api/v2",
            timeout: 30000,
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

        // Add request interceptor to add Authorization header
        // Note: ClickUp uses raw access token, not "Bearer" prefix
        this.client.addRequestInterceptor((reqConfig) => {
            if (!reqConfig.headers) {
                reqConfig.headers = {};
            }
            reqConfig.headers["Authorization"] = this.accessToken;
            reqConfig.headers["Content-Type"] = "application/json";
            return reqConfig;
        });
    }

    /**
     * Override request to handle ClickUp-specific response format
     */
    async request<T = unknown>(config: RequestConfig): Promise<T> {
        return super.request<T>(config);
    }

    /**
     * Handle ClickUp-specific errors
     */
    protected async handleError(error: unknown): Promise<never> {
        if (isFetchError(error) && error.response) {
            const data = error.response.data as ClickUpErrorResponse;

            // Handle authentication errors
            if (error.response.status === 401) {
                throw new Error("ClickUp authentication failed. Please reconnect.");
            }

            // Handle forbidden errors
            if (error.response.status === 403) {
                throw new Error("You do not have permission to access this resource.");
            }

            // Handle not found errors
            if (error.response.status === 404) {
                throw new Error("The requested resource was not found.");
            }

            // Handle rate limiting
            if (error.response.status === 429) {
                throw new Error("Rate limited. Please try again later.");
            }

            // Handle ClickUp-specific error format
            if (data.err) {
                throw new Error(`ClickUp API error: ${data.err}`);
            }

            if (data.ECODE) {
                throw new Error(`ClickUp API error (${data.ECODE})`);
            }
        }

        throw error;
    }

    // =========================================================================
    // User Methods
    // =========================================================================

    /**
     * Get the current authenticated user
     */
    async getCurrentUser(): Promise<ClickUpUserResponse> {
        return this.get("/user");
    }

    // =========================================================================
    // Workspace (Team) Methods
    // =========================================================================

    /**
     * Get all authorized workspaces (teams)
     */
    async getWorkspaces(): Promise<ClickUpTeamsResponse> {
        return this.get("/team");
    }

    // =========================================================================
    // Space Methods
    // =========================================================================

    /**
     * Get all spaces in a workspace
     */
    async getSpaces(workspaceId: string, archived?: boolean): Promise<ClickUpSpacesResponse> {
        const params: Record<string, unknown> = {};
        if (archived !== undefined) {
            params.archived = archived;
        }
        return this.get(`/team/${workspaceId}/space`, params);
    }

    // =========================================================================
    // List Methods
    // =========================================================================

    /**
     * Get folderless lists in a space
     */
    async getFolderlessLists(spaceId: string, archived?: boolean): Promise<ClickUpListsResponse> {
        const params: Record<string, unknown> = {};
        if (archived !== undefined) {
            params.archived = archived;
        }
        return this.get(`/space/${spaceId}/list`, params);
    }

    /**
     * Get lists in a folder
     */
    async getListsInFolder(folderId: string, archived?: boolean): Promise<ClickUpListsResponse> {
        const params: Record<string, unknown> = {};
        if (archived !== undefined) {
            params.archived = archived;
        }
        return this.get(`/folder/${folderId}/list`, params);
    }

    // =========================================================================
    // Task Methods
    // =========================================================================

    /**
     * Get tasks from a list
     */
    async getTasks(
        listId: string,
        params?: {
            archived?: boolean;
            page?: number;
            subtasks?: boolean;
            statuses?: string[];
            assignees?: string[];
            include_closed?: boolean;
        }
    ): Promise<ClickUpTasksResponse> {
        const queryParams: Record<string, unknown> = {};

        if (params) {
            if (params.archived !== undefined) queryParams.archived = params.archived;
            if (params.page !== undefined) queryParams.page = params.page;
            if (params.subtasks !== undefined) queryParams.subtasks = params.subtasks;
            if (params.include_closed !== undefined)
                queryParams.include_closed = params.include_closed;
            if (params.statuses && params.statuses.length > 0) {
                queryParams["statuses[]"] = params.statuses;
            }
            if (params.assignees && params.assignees.length > 0) {
                queryParams["assignees[]"] = params.assignees;
            }
        }

        return this.get(`/list/${listId}/task`, queryParams);
    }

    /**
     * Get a specific task
     */
    async getTask(taskId: string): Promise<ClickUpTask> {
        return this.get(`/task/${taskId}`);
    }

    /**
     * Create a new task
     */
    async createTask(
        listId: string,
        data: {
            name: string;
            description?: string;
            assignees?: number[];
            priority?: number;
            due_date?: number;
            start_date?: number;
            status?: string;
            tags?: string[];
        }
    ): Promise<ClickUpTask> {
        return this.post(`/list/${listId}/task`, data);
    }

    /**
     * Update a task
     */
    async updateTask(
        taskId: string,
        data: {
            name?: string;
            description?: string;
            assignees?: { add?: number[]; rem?: number[] };
            priority?: number;
            due_date?: number;
            start_date?: number;
            status?: string;
        }
    ): Promise<ClickUpTask> {
        return this.put(`/task/${taskId}`, data);
    }

    /**
     * Delete a task
     */
    async deleteTask(taskId: string): Promise<void> {
        await this.delete(`/task/${taskId}`);
    }

    // =========================================================================
    // Comment Methods
    // =========================================================================

    /**
     * Get comments on a task
     */
    async getTaskComments(taskId: string): Promise<ClickUpCommentsResponse> {
        return this.get(`/task/${taskId}/comment`);
    }

    /**
     * Create a comment on a task
     */
    async createTaskComment(
        taskId: string,
        data: {
            comment_text: string;
            assignee?: number;
            notify_all?: boolean;
        }
    ): Promise<ClickUpComment> {
        return this.post(`/task/${taskId}/comment`, data);
    }
}
