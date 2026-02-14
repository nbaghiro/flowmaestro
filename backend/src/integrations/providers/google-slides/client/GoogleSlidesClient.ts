import { GoogleBaseClient } from "../../../core/google";

export interface GoogleSlidesClientConfig {
    accessToken: string;
    connectionId?: string;
}

/**
 * Google Slides API v1 Client with connection pooling and error handling
 *
 * API Documentation: https://developers.google.com/slides/api/reference/rest
 * Base URL: https://slides.googleapis.com
 */
export class GoogleSlidesClient extends GoogleBaseClient {
    private driveBaseURL = "https://www.googleapis.com/drive/v3";

    constructor(config: GoogleSlidesClientConfig) {
        super({
            accessToken: config.accessToken,
            baseURL: "https://slides.googleapis.com",
            serviceName: "Google Slides"
        });
    }

    /**
     * Override to provide service-specific not found message
     */
    protected getNotFoundMessage(): string {
        return "Presentation not found.";
    }

    // ==================== Presentation Operations ====================

    /**
     * Create a new presentation
     */
    async createPresentation(title: string): Promise<unknown> {
        return this.post("/v1/presentations", { title });
    }

    /**
     * Get presentation by ID
     */
    async getPresentation(presentationId: string): Promise<unknown> {
        return this.get(`/v1/presentations/${presentationId}`);
    }

    /**
     * Batch update presentation (create slides, add shapes, text, etc.)
     * All requests are applied atomically
     */
    async batchUpdate(presentationId: string, requests: unknown[]): Promise<unknown> {
        return this.post(`/v1/presentations/${presentationId}:batchUpdate`, {
            requests
        });
    }

    /**
     * Get a specific page (slide) from the presentation
     */
    async getPage(presentationId: string, pageObjectId: string): Promise<unknown> {
        return this.get(`/v1/presentations/${presentationId}/pages/${pageObjectId}`);
    }

    /**
     * Get thumbnail for a specific page (slide)
     */
    async getThumbnail(
        presentationId: string,
        pageObjectId: string,
        thumbnailSize?: "LARGE" | "MEDIUM" | "SMALL"
    ): Promise<unknown> {
        let url = `/v1/presentations/${presentationId}/pages/${pageObjectId}/thumbnail`;
        if (thumbnailSize) {
            url += `?thumbnailProperties.thumbnailSize=${thumbnailSize}`;
        }
        return this.get(url);
    }

    // ==================== Drive Operations (for folder management) ====================

    /**
     * Delete a presentation (uses Drive API)
     */
    async deletePresentation(presentationId: string): Promise<void> {
        const response = await fetch(`${this.driveBaseURL}/files/${presentationId}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${this.accessToken}`
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error("Presentation not found.");
            }
            throw new Error(`Failed to delete presentation: HTTP ${response.status}`);
        }
    }

    /**
     * Move presentation to a folder (uses Drive API)
     */
    async moveToFolder(presentationId: string, folderId: string): Promise<void> {
        // First, get the current parents
        const fileResponse = await fetch(
            `${this.driveBaseURL}/files/${presentationId}?fields=parents`,
            {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`
                }
            }
        );

        if (!fileResponse.ok) {
            if (fileResponse.status === 404) {
                throw new Error("Presentation not found.");
            }
            throw new Error(`Failed to get presentation info: HTTP ${fileResponse.status}`);
        }

        const fileData = (await fileResponse.json()) as { parents?: string[] };
        const previousParents = fileData.parents?.join(",") || "";

        // Move the file to the new folder
        const moveResponse = await fetch(
            `${this.driveBaseURL}/files/${presentationId}?addParents=${folderId}&removeParents=${previousParents}`,
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
                throw new Error("Presentation or folder not found.");
            }
            throw new Error(`Failed to move presentation: HTTP ${moveResponse.status}`);
        }
    }
}
