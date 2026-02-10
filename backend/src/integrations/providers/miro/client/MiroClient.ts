import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";
import type { OAuth2TokenData } from "../../../../storage/models/Connection";

export interface MiroClientConfig {
    accessToken: string;
    connectionId?: string;
    onTokenRefresh?: (tokens: OAuth2TokenData) => Promise<void>;
}

/**
 * Miro REST API Client with connection pooling and error handling
 *
 * Note: Token URL uses /v1/ while API uses /v2/
 */
export class MiroClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: MiroClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.miro.com/v2",
            timeout: 30000,
            retryConfig: {
                maxRetries: 3,
                retryableStatuses: [429, 500, 502, 503],
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
            return config;
        });
    }

    /**
     * Handle Miro-specific errors
     */
    protected async handleError(
        error: Error & {
            response?: { status?: number; data?: unknown; headers?: Record<string, string> };
        }
    ): Promise<never> {
        if (error.response) {
            const { status, data, headers } = error.response;

            if (status === 401) {
                throw new Error("Miro authentication failed. Please reconnect.");
            }

            if (status === 403) {
                throw new Error("You don't have permission to access this Miro resource.");
            }

            if (status === 404) {
                throw new Error("Miro resource not found.");
            }

            if (status === 429) {
                const retryAfter = headers?.["retry-after"] || "unknown";
                throw new Error(`Miro rate limit exceeded. Retry after ${retryAfter} seconds.`);
            }

            // Handle Miro error responses
            if (typeof data === "object" && data !== null) {
                const errorData = data as { message?: string; code?: string; type?: string };
                if (errorData.message) {
                    throw new Error(`Miro API error: ${errorData.message}`);
                }
            }
        }

        throw error;
    }

    /**
     * List boards
     */
    async listBoards(options?: {
        query?: string;
        limit?: number;
        offset?: string;
        sort?: "default" | "last_modified" | "last_opened" | "last_created" | "alphabetically";
    }): Promise<unknown> {
        const params: Record<string, unknown> = {};
        if (options?.query) params.query = options.query;
        if (options?.limit) params.limit = options.limit;
        if (options?.offset) params.offset = options.offset;
        if (options?.sort) params.sort = options.sort;

        return this.get("/boards", params);
    }

    /**
     * Get a specific board
     */
    async getBoard(boardId: string): Promise<unknown> {
        return this.get(`/boards/${boardId}`);
    }

    /**
     * Create a new board
     */
    async createBoard(params: {
        name: string;
        description?: string;
        team_id?: string;
    }): Promise<unknown> {
        return this.post("/boards", params);
    }

    /**
     * Create a sticky note on a board
     */
    async createStickyNote(
        boardId: string,
        params: {
            data: { content: string };
            position?: { x: number; y: number; origin?: string };
            style?: { fillColor?: string; textAlign?: string; textAlignVertical?: string };
        }
    ): Promise<unknown> {
        return this.post(`/boards/${boardId}/sticky_notes`, params);
    }

    /**
     * Create a card on a board
     */
    async createCard(
        boardId: string,
        params: {
            data: { title: string; description?: string };
            position?: { x: number; y: number; origin?: string };
            style?: { cardTheme?: string };
        }
    ): Promise<unknown> {
        return this.post(`/boards/${boardId}/cards`, params);
    }

    /**
     * Create a shape on a board
     */
    async createShape(
        boardId: string,
        params: {
            data: { content?: string; shape: string };
            position?: { x: number; y: number; origin?: string };
            style?: { fillColor?: string; borderColor?: string; borderWidth?: string };
        }
    ): Promise<unknown> {
        return this.post(`/boards/${boardId}/shapes`, params);
    }

    /**
     * Get items on a board
     */
    async getItems(
        boardId: string,
        options?: {
            type?: string;
            limit?: number;
            cursor?: string;
        }
    ): Promise<unknown> {
        const params: Record<string, unknown> = {};
        if (options?.type) params.type = options.type;
        if (options?.limit) params.limit = options.limit;
        if (options?.cursor) params.cursor = options.cursor;

        return this.get(`/boards/${boardId}/items`, params);
    }

    /**
     * Create a tag on a board
     */
    async createTag(
        boardId: string,
        params: {
            title: string;
            fillColor?: string;
        }
    ): Promise<unknown> {
        return this.post(`/boards/${boardId}/tags`, params);
    }
}
