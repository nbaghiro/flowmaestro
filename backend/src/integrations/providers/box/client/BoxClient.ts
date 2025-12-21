import { BaseAPIClient, BaseAPIClientConfig } from "../../../core/BaseAPIClient";

export interface BoxClientConfig {
    accessToken: string;
}

/**
 * Box API Client
 *
 * Note: Box uses different base URLs for different operations:
 * - api.box.com/2.0 for metadata operations
 * - upload.box.com/api/2.0 for file uploads
 *
 * Documentation: https://developer.box.com/reference
 */
export class BoxClient extends BaseAPIClient {
    private accessToken: string;

    constructor(config: BoxClientConfig) {
        const clientConfig: BaseAPIClientConfig = {
            baseURL: "https://api.box.com/2.0",
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
     * Handle Box-specific errors
     */
    protected async handleError(
        error: Error & {
            response?: { status?: number; data?: unknown; headers?: Record<string, string> };
        }
    ): Promise<never> {
        if (error.response) {
            const { status, data } = error.response;

            if (status === 401) {
                throw new Error("Box authentication failed. Please reconnect.");
            }

            if (status === 403) {
                throw new Error("You don't have permission to access this Box resource.");
            }

            if (status === 404) {
                throw new Error("Box resource not found.");
            }

            if (status === 409) {
                // Box uses 409 for conflicts (e.g., item with same name exists)
                if (data && typeof data === "object") {
                    const errorData = data as { message?: string; code?: string };
                    if (errorData.message) {
                        throw new Error(`Box conflict: ${errorData.message}`);
                    }
                }
                throw new Error("Box resource conflict.");
            }

            if (status === 429) {
                const retryAfter = error.response.headers?.["retry-after"];
                throw new Error(
                    `Box rate limit exceeded. Retry after ${retryAfter || "a few"} seconds.`
                );
            }

            // Handle error response body
            if (data && typeof data === "object") {
                const errorData = data as { message?: string; code?: string };
                if (errorData.message) {
                    throw new Error(`Box API error: ${errorData.message}`);
                }
            }
        }

        throw error;
    }

    /**
     * List folder contents
     * @param folderId Folder ID (use "0" for root)
     * @param limit Max items to return (default 100, max 1000)
     * @param offset Pagination offset
     */
    async listFolder(
        folderId: string = "0",
        limit: number = 100,
        offset: number = 0
    ): Promise<{
        total_count: number;
        entries: unknown[];
        offset: number;
        limit: number;
    }> {
        const params = new URLSearchParams({
            limit: limit.toString(),
            offset: offset.toString(),
            fields: "id,type,name,size,modified_at,created_at,path_collection,shared_link"
        });

        return this.get(`/folders/${folderId}/items?${params.toString()}`);
    }

    /**
     * Get folder information
     */
    async getFolder(folderId: string): Promise<unknown> {
        return this.get(`/folders/${folderId}`);
    }

    /**
     * Create a new folder
     */
    async createFolder(name: string, parentId: string = "0"): Promise<unknown> {
        return this.post("/folders", {
            name,
            parent: { id: parentId }
        });
    }

    /**
     * Delete a folder
     * @param folderId Folder ID
     * @param recursive Whether to delete contents recursively
     */
    async deleteFolder(folderId: string, recursive: boolean = false): Promise<void> {
        const params = recursive ? "?recursive=true" : "";
        await this.delete(`/folders/${folderId}${params}`);
    }

    /**
     * Get file information
     */
    async getFile(fileId: string): Promise<unknown> {
        return this.get(
            `/files/${fileId}?fields=id,type,name,size,modified_at,created_at,path_collection,shared_link`
        );
    }

    /**
     * Delete a file
     */
    async deleteFile(fileId: string): Promise<void> {
        await this.delete(`/files/${fileId}`);
    }

    /**
     * Upload a file to Box
     * Uses the upload.box.com endpoint with multipart/form-data
     * @param fileName File name
     * @param content File content as Buffer
     * @param parentId Parent folder ID (default "0" for root)
     */
    async uploadFile(fileName: string, content: Buffer, parentId: string = "0"): Promise<unknown> {
        const attributes = JSON.stringify({
            name: fileName,
            parent: { id: parentId }
        });

        // Create form boundary
        const boundary = `----BoxFormBoundary${Date.now()}`;

        // Build multipart body manually
        // IMPORTANT: attributes MUST come before file in Box API
        const parts: Buffer[] = [];

        // Attributes part
        parts.push(
            Buffer.from(
                `--${boundary}\r\n` +
                    'Content-Disposition: form-data; name="attributes"\r\n\r\n' +
                    `${attributes}\r\n`
            )
        );

        // File part
        parts.push(
            Buffer.from(
                `--${boundary}\r\n` +
                    `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
                    "Content-Type: application/octet-stream\r\n\r\n"
            )
        );
        parts.push(content);
        parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

        const body = Buffer.concat(parts);

        const response = await fetch("https://upload.box.com/api/2.0/files/content", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                "Content-Type": `multipart/form-data; boundary=${boundary}`
            },
            body
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = (errorData as { message?: string }).message || response.statusText;
            throw new Error(`Box upload failed: ${errorMessage}`);
        }

        return response.json();
    }

    /**
     * Download file content
     * Returns file content as base64 string
     */
    async downloadFile(fileId: string): Promise<{ content: string; metadata: unknown }> {
        // First get file metadata
        const metadata = await this.getFile(fileId);

        // Then download content
        const response = await fetch(`https://api.box.com/2.0/files/${fileId}/content`, {
            headers: {
                Authorization: `Bearer ${this.accessToken}`
            },
            redirect: "follow" // Box returns a redirect to the actual content
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = (errorData as { message?: string }).message || response.statusText;
            throw new Error(`Box download failed: ${errorMessage}`);
        }

        // Get file content as buffer then convert to base64
        const arrayBuffer = await response.arrayBuffer();
        const content = Buffer.from(arrayBuffer).toString("base64");

        return { content, metadata };
    }

    /**
     * Copy a file
     */
    async copyFile(fileId: string, parentId: string, newName?: string): Promise<unknown> {
        const body: { parent: { id: string }; name?: string } = {
            parent: { id: parentId }
        };

        if (newName) {
            body.name = newName;
        }

        return this.post(`/files/${fileId}/copy`, body);
    }

    /**
     * Move a file to a different folder
     */
    async moveFile(fileId: string, parentId: string, newName?: string): Promise<unknown> {
        const body: { parent: { id: string }; name?: string } = {
            parent: { id: parentId }
        };

        if (newName) {
            body.name = newName;
        }

        return this.put(`/files/${fileId}`, body);
    }

    /**
     * Create or update a shared link for a file
     */
    async createSharedLink(
        fileId: string,
        access: "open" | "company" | "collaborators" = "open",
        password?: string
    ): Promise<unknown> {
        const sharedLink: {
            access: string;
            password?: string;
        } = { access };

        if (password) {
            sharedLink.password = password;
        }

        return this.put(`/files/${fileId}?fields=shared_link`, {
            shared_link: sharedLink
        });
    }

    /**
     * Copy a folder
     */
    async copyFolder(folderId: string, parentId: string, newName?: string): Promise<unknown> {
        const body: { parent: { id: string }; name?: string } = {
            parent: { id: parentId }
        };

        if (newName) {
            body.name = newName;
        }

        return this.post(`/folders/${folderId}/copy`, body);
    }

    /**
     * Move a folder to a different parent folder
     */
    async moveFolder(folderId: string, parentId: string, newName?: string): Promise<unknown> {
        const body: { parent: { id: string }; name?: string } = {
            parent: { id: parentId }
        };

        if (newName) {
            body.name = newName;
        }

        return this.put(`/folders/${folderId}`, body);
    }
}
