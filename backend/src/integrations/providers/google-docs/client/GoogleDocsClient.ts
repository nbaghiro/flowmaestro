import { GoogleBaseClient } from "../../../core/google";

export interface GoogleDocsClientConfig {
    accessToken: string;
    connectionId?: string;
}

/**
 * Google Docs API v1 Client with connection pooling and error handling
 *
 * API Documentation: https://developers.google.com/docs/api/reference/rest
 * Base URL: https://docs.googleapis.com
 */
export class GoogleDocsClient extends GoogleBaseClient {
    private driveBaseURL = "https://www.googleapis.com/drive/v3";

    constructor(config: GoogleDocsClientConfig) {
        super({
            accessToken: config.accessToken,
            baseURL: "https://docs.googleapis.com",
            serviceName: "Google Docs"
        });
    }

    /**
     * Override to provide service-specific not found message
     */
    protected getNotFoundMessage(): string {
        return "Document not found.";
    }

    // ==================== Document Operations ====================

    /**
     * Create a new document
     */
    async createDocument(title: string): Promise<unknown> {
        return this.post("/v1/documents", { title });
    }

    /**
     * Get document by ID
     */
    async getDocument(documentId: string): Promise<unknown> {
        return this.get(`/v1/documents/${documentId}`);
    }

    /**
     * Batch update document (formatting, content, etc.)
     * All requests are applied atomically
     */
    async batchUpdate(documentId: string, requests: unknown[]): Promise<unknown> {
        return this.post(`/v1/documents/${documentId}:batchUpdate`, {
            requests
        });
    }

    // ==================== Drive Operations (for folder management) ====================

    /**
     * Delete a document (uses Drive API)
     */
    async deleteDocument(documentId: string): Promise<void> {
        const response = await fetch(`${this.driveBaseURL}/files/${documentId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("Document not found.");
            }
            throw new Error(`Failed to delete document: HTTP ${response.status}`);
        }
    }

    /**
     * Move document to a folder (uses Drive API)
     */
    async moveToFolder(documentId: string, folderId: string): Promise<void> {
        // First, get the current parents
        const fileResponse = await fetch(
            `${this.driveBaseURL}/files/${documentId}?fields=parents`,
            {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`
                }
            }
        );

        if (!fileResponse.ok) {
            if (fileResponse.status === 404) {
                throw new Error("Document not found.");
            }
            throw new Error(`Failed to get document info: HTTP ${fileResponse.status}`);
        }

        const fileData = (await fileResponse.json()) as { parents?: string[] };
        const previousParents = fileData.parents?.join(",") || "";

        // Move the file to the new folder
        const moveResponse = await fetch(
            `${this.driveBaseURL}/files/${documentId}?addParents=${folderId}&removeParents=${previousParents}`,
            {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    "Content-Type": "application/json"
                }
            }
        );

        if (!moveResponse.ok) {
            if (moveResponse.status === 404) {
                throw new Error("Document or folder not found.");
            }
            throw new Error(`Failed to move document: HTTP ${moveResponse.status}`);
        }
    }
}
