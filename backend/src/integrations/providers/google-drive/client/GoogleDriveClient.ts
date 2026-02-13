import { GoogleBaseClient } from "../../../core/google";

export interface GoogleDriveClientConfig {
    accessToken: string;
    connectionId?: string;
}

/**
 * Google Drive API v3 Client with connection pooling and error handling
 *
 * API Documentation: https://developers.google.com/drive/api/reference/rest/v3
 * Base URL: https://www.googleapis.com
 */
export class GoogleDriveClient extends GoogleBaseClient {
    constructor(config: GoogleDriveClientConfig) {
        super({
            accessToken: config.accessToken,
            baseURL: "https://www.googleapis.com",
            serviceName: "Google Drive"
        });
    }

    /**
     * Override to provide service-specific not found message
     */
    protected getNotFoundMessage(): string {
        return "File or folder not found.";
    }

    // ==================== File Operations ====================

    /**
     * Get file metadata
     */
    async getFile(fileId: string, fields?: string): Promise<unknown> {
        const params: Record<string, string> = {};
        if (fields) {
            params.fields = fields;
        }

        return this.get(`/drive/v3/files/${fileId}`, { params });
    }

    /**
     * List files with optional query
     */
    async listFiles(params: {
        q?: string;
        pageSize?: number;
        pageToken?: string;
        orderBy?: string;
        fields?: string;
    }): Promise<unknown> {
        const queryParams: Record<string, string> = {};

        if (params.q) queryParams.q = params.q;
        if (params.pageSize) queryParams.pageSize = params.pageSize.toString();
        if (params.pageToken) queryParams.pageToken = params.pageToken;
        if (params.orderBy) queryParams.orderBy = params.orderBy;
        if (params.fields) queryParams.fields = params.fields;

        return this.get("/drive/v3/files", { params: queryParams });
    }

    /**
     * Create file (metadata only or folder)
     */
    async createFile(metadata: {
        name: string;
        mimeType?: string;
        parents?: string[];
        description?: string;
    }): Promise<unknown> {
        return this.post("/drive/v3/files", metadata);
    }

    /**
     * Update file metadata
     */
    async updateFile(
        fileId: string,
        metadata: {
            name?: string;
            description?: string;
            trashed?: boolean;
        }
    ): Promise<unknown> {
        return this.patch(`/drive/v3/files/${fileId}`, metadata);
    }

    /**
     * Delete file permanently
     */
    async deleteFile(fileId: string): Promise<void> {
        await this.delete(`/drive/v3/files/${fileId}`);
    }

    /**
     * Copy file
     */
    async copyFile(
        fileId: string,
        metadata: {
            name?: string;
            parents?: string[];
        }
    ): Promise<unknown> {
        return this.post(`/drive/v3/files/${fileId}/copy`, metadata);
    }

    /**
     * Move file (change parents)
     */
    async moveFile(fileId: string, addParents: string, removeParents: string): Promise<unknown> {
        const url = `/drive/v3/files/${fileId}?addParents=${encodeURIComponent(addParents)}&removeParents=${encodeURIComponent(removeParents)}`;
        return this.patch(url, {});
    }

    /**
     * Download file content
     * Note: Only works for binary files, not Google Workspace documents
     */
    async downloadFile(fileId: string): Promise<Blob> {
        const response = (await this.client.get(`/drive/v3/files/${fileId}`, {
            params: { alt: "media" }
        })) as { data: Blob };

        // Return the response data as-is (it will be binary content)
        return response.data as Blob;
    }

    /**
     * Export Google Workspace document to another format
     */
    async exportDocument(fileId: string, mimeType: string): Promise<Blob> {
        const response = (await this.client.get(`/drive/v3/files/${fileId}/export`, {
            params: { mimeType }
        })) as { data: Blob };

        return response.data as Blob;
    }

    /**
     * Upload file (multipart upload for files < 5MB)
     */
    async uploadFile(params: {
        fileName: string;
        fileContent: string; // Base64 encoded or raw content
        mimeType: string;
        folderId?: string;
        description?: string;
    }): Promise<unknown> {
        const metadata = {
            name: params.fileName,
            mimeType: params.mimeType,
            ...(params.folderId && { parents: [params.folderId] }),
            ...(params.description && { description: params.description })
        };

        // Create multipart body
        const boundary = "boundary_string_" + Date.now();
        const metadataPart = JSON.stringify(metadata);

        // Decode base64 content if needed
        let fileContent = params.fileContent;
        if (params.fileContent.includes("base64,")) {
            fileContent = params.fileContent.split("base64,")[1];
        }

        const multipartBody = [
            `--${boundary}`,
            "Content-Type: application/json; charset=UTF-8",
            "",
            metadataPart,
            "",
            `--${boundary}`,
            `Content-Type: ${params.mimeType}`,
            "Content-Transfer-Encoding: base64",
            "",
            fileContent,
            `--${boundary}--`
        ].join("\r\n");

        // Use the underlying fetch client directly for multipart upload
        const url = "/upload/drive/v3/files?uploadType=multipart";
        const response = await this.client.request({
            method: "POST",
            url,
            data: multipartBody,
            headers: {
                "Content-Type": `multipart/related; boundary=${boundary}`
            }
        });

        return response as unknown;
    }

    // ==================== Permission Operations ====================

    /**
     * Create permission (share file/folder)
     */
    async createPermission(
        fileId: string,
        permission: {
            type: "user" | "group" | "domain" | "anyone";
            role: "owner" | "organizer" | "fileOrganizer" | "writer" | "commenter" | "reader";
            emailAddress?: string;
            domain?: string;
        }
    ): Promise<unknown> {
        return this.post(`/drive/v3/files/${fileId}/permissions`, permission);
    }

    /**
     * List permissions for a file
     */
    async listPermissions(fileId: string): Promise<unknown> {
        return this.get(`/drive/v3/files/${fileId}/permissions`);
    }

    /**
     * Delete permission (revoke access)
     */
    async deletePermission(fileId: string, permissionId: string): Promise<void> {
        await this.delete(`/drive/v3/files/${fileId}/permissions/${permissionId}`);
    }

    // ==================== About Operations ====================

    /**
     * Get information about the user's Drive
     */
    async getAbout(fields: string = "user,storageQuota"): Promise<unknown> {
        return this.get("/drive/v3/about", {
            params: { fields }
        });
    }
}
