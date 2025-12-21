import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface DropboxClientConfig {
    accessToken: string;
}

/**
 * Dropbox API Client
 *
 * Note: Dropbox uses POST for most endpoints and sends metadata via Dropbox-API-Arg header
 * for content endpoints. The API base is split between:
 * - api.dropboxapi.com/2 for metadata operations
 * - content.dropboxapi.com/2 for file content operations
 */
export class DropboxClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: DropboxClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.dropboxapi.com/2",
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
        this.client.addRequestInterceptor((requestConfig) => {
            if (!requestConfig.headers) {
                requestConfig.headers = {};
            }
            requestConfig.headers["Authorization"] = `Bearer ${this.accessToken}`;
            return requestConfig;
        });
    }

    /**
     * Handle Dropbox-specific errors
     */
    protected async handleError(
        error: Error & {
            response?: { status?: number; data?: unknown; headers?: Record<string, string> };
        }
    ): Promise<never> {
        if (error.response) {
            const { status, data } = error.response;

            if (status === 401) {
                throw new Error("Dropbox authentication failed. Please reconnect.");
            }

            if (status === 403) {
                throw new Error("You don't have permission to access this Dropbox resource.");
            }

            if (status === 404) {
                throw new Error("Dropbox resource not found.");
            }

            if (status === 409) {
                // Dropbox uses 409 for path conflicts and other logical errors
                if (data && typeof data === "object") {
                    const errorData = data as { error_summary?: string };
                    if (errorData.error_summary) {
                        throw new Error(`Dropbox error: ${errorData.error_summary}`);
                    }
                }
                throw new Error("Dropbox path conflict or resource error.");
            }

            if (status === 429) {
                const retryAfter = error.response.headers?.["retry-after"];
                throw new Error(
                    `Dropbox rate limit exceeded. Retry after ${retryAfter || "a few"} seconds.`
                );
            }

            // Handle error response body
            if (data && typeof data === "object") {
                const errorData = data as { error_summary?: string; user_message?: string };
                if (errorData.error_summary) {
                    throw new Error(`Dropbox API error: ${errorData.error_summary}`);
                }
                if (errorData.user_message) {
                    throw new Error(`Dropbox error: ${errorData.user_message}`);
                }
            }
        }

        throw error;
    }

    /**
     * Upload file to Dropbox
     * Uses content upload endpoint with Dropbox-API-Arg header for metadata
     */
    async uploadFile(params: {
        path: string;
        content: Buffer | string;
        mode?: "add" | "overwrite";
        autorename?: boolean;
    }): Promise<unknown> {
        const dropboxApiArg = JSON.stringify({
            path: params.path,
            mode: params.mode || "add",
            autorename: params.autorename ?? false,
            mute: false
        });

        const response = await fetch("https://content.dropboxapi.com/2/files/upload", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                "Dropbox-API-Arg": dropboxApiArg,
                "Content-Type": "application/octet-stream"
            },
            body: params.content
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorSummary =
                (errorData as { error_summary?: string }).error_summary || response.statusText;
            throw new Error(`Dropbox upload failed: ${errorSummary}`);
        }

        return response.json();
    }

    /**
     * Download file from Dropbox
     * Returns file content as base64 string
     */
    async downloadFile(path: string): Promise<{ content: string; metadata: unknown }> {
        const dropboxApiArg = JSON.stringify({ path });

        const response = await fetch("https://content.dropboxapi.com/2/files/download", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                "Dropbox-API-Arg": dropboxApiArg
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorSummary =
                (errorData as { error_summary?: string }).error_summary || response.statusText;
            throw new Error(`Dropbox download failed: ${errorSummary}`);
        }

        // Get metadata from response header
        const metadataHeader = response.headers.get("Dropbox-API-Result");
        const metadata = metadataHeader ? JSON.parse(metadataHeader) : {};

        // Get file content as buffer then convert to base64
        const arrayBuffer = await response.arrayBuffer();
        const content = Buffer.from(arrayBuffer).toString("base64");

        return { content, metadata };
    }

    /**
     * List folder contents
     */
    async listFolder(
        path: string,
        recursive?: boolean
    ): Promise<{
        entries: unknown[];
        cursor: string;
        has_more: boolean;
    }> {
        return this.post("/files/list_folder", {
            path: path === "/" ? "" : path, // Dropbox uses empty string for root
            recursive: recursive || false,
            include_media_info: false,
            include_deleted: false,
            include_has_explicit_shared_members: false
        });
    }

    /**
     * Continue listing folder contents (for pagination)
     */
    async listFolderContinue(cursor: string): Promise<{
        entries: unknown[];
        cursor: string;
        has_more: boolean;
    }> {
        return this.post("/files/list_folder/continue", { cursor });
    }

    /**
     * Create a new folder
     */
    async createFolder(path: string, autorename?: boolean): Promise<unknown> {
        return this.post("/files/create_folder_v2", {
            path,
            autorename: autorename ?? false
        });
    }

    /**
     * Delete a file or folder
     */
    async deleteFile(path: string): Promise<unknown> {
        return this.post("/files/delete_v2", { path });
    }

    /**
     * Get file or folder metadata
     */
    async getMetadata(path: string): Promise<unknown> {
        return this.post("/files/get_metadata", {
            path,
            include_media_info: false,
            include_deleted: false,
            include_has_explicit_shared_members: false
        });
    }

    /**
     * Create a shared link for a file or folder
     */
    async createSharedLink(
        path: string,
        settings?: {
            requested_visibility?: "public" | "team_only" | "password";
            link_password?: string;
            expires?: string;
        }
    ): Promise<unknown> {
        return this.post("/sharing/create_shared_link_with_settings", {
            path,
            settings: settings || {}
        });
    }

    /**
     * Get existing shared links for a file or folder
     */
    async listSharedLinks(path?: string): Promise<unknown> {
        return this.post("/sharing/list_shared_links", {
            path,
            direct_only: true
        });
    }
}
