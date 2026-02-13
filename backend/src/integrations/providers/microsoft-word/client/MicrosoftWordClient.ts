/**
 * Microsoft Word Client
 *
 * REST API client for Microsoft Graph Word document endpoints.
 * Uses Microsoft Graph API v1.0 for document operations.
 *
 * Note: Word documents in Microsoft Graph are accessed through the Drive API
 * since they are stored as files in OneDrive/SharePoint.
 */

import { MicrosoftGraphClient } from "../../../core/microsoft";

export interface WordClientConfig {
    accessToken: string;
}

export interface DriveItemInfo {
    id: string;
    name: string;
    size: number;
    file?: {
        mimeType: string;
        hashes?: {
            quickXorHash?: string;
            sha1Hash?: string;
            sha256Hash?: string;
        };
    };
    folder?: {
        childCount: number;
    };
    parentReference?: {
        driveId: string;
        driveType: string;
        id: string;
        path: string;
    };
    createdDateTime: string;
    lastModifiedDateTime: string;
    webUrl: string;
    createdBy?: {
        user?: {
            displayName: string;
            id: string;
        };
    };
    lastModifiedBy?: {
        user?: {
            displayName: string;
            id: string;
        };
    };
}

export interface SearchResult {
    value: DriveItemInfo[];
    "@odata.nextLink"?: string;
}

const WORD_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export class MicrosoftWordClient extends MicrosoftGraphClient {
    constructor(config: WordClientConfig) {
        super({
            accessToken: config.accessToken,
            serviceName: "Microsoft Word"
        });
    }

    /**
     * Get document metadata
     */
    async getDocument(itemId: string): Promise<DriveItemInfo> {
        return this.get(`/me/drive/items/${itemId}`);
    }

    /**
     * Get document by path
     */
    async getDocumentByPath(path: string): Promise<DriveItemInfo> {
        const encodedPath = encodeURIComponent(path).replace(/%2F/g, "/");
        return this.get(`/me/drive/root:/${encodedPath}`);
    }

    /**
     * Download document content as base64
     */
    async downloadDocument(itemId: string): Promise<string> {
        const arrayBuffer = await this.downloadBinary(`/me/drive/items/${itemId}/content`);
        return Buffer.from(arrayBuffer).toString("base64");
    }

    /**
     * Convert document to another format (PDF or HTML)
     */
    async convertDocument(itemId: string, format: "pdf" | "html"): Promise<string> {
        const arrayBuffer = await this.downloadBinary(
            `/me/drive/items/${itemId}/content?format=${format}`
        );
        return Buffer.from(arrayBuffer).toString("base64");
    }

    /**
     * Upload a new Word document
     */
    async uploadDocument(
        fileName: string,
        content: Buffer | string,
        folderId?: string,
        conflictBehavior: "rename" | "replace" | "fail" = "rename"
    ): Promise<DriveItemInfo> {
        const contentBuffer =
            typeof content === "string" ? Buffer.from(content, "base64") : content;

        let uploadUrl: string;
        if (folderId) {
            uploadUrl = `/me/drive/items/${folderId}:/${fileName}:/content?@microsoft.graph.conflictBehavior=${conflictBehavior}`;
        } else {
            uploadUrl = `/me/drive/root:/${fileName}:/content?@microsoft.graph.conflictBehavior=${conflictBehavior}`;
        }

        return this.requestBinary(uploadUrl, {
            method: "PUT",
            body: contentBuffer,
            contentType: WORD_MIME_TYPE
        });
    }

    /**
     * Replace document content
     */
    async replaceDocument(itemId: string, content: Buffer | string): Promise<DriveItemInfo> {
        const contentBuffer =
            typeof content === "string" ? Buffer.from(content, "base64") : content;

        return this.requestBinary(`/me/drive/items/${itemId}/content`, {
            method: "PUT",
            body: contentBuffer,
            contentType: WORD_MIME_TYPE
        });
    }

    /**
     * Search for Word documents
     */
    async searchDocuments(query: string, top?: number): Promise<SearchResult> {
        // Search for .docx files
        const searchQuery = `${query} AND filetype:docx`;
        let url = `/me/drive/root/search(q='${encodeURIComponent(searchQuery)}')`;

        if (top) {
            url += `?$top=${top}`;
        }

        return this.get(url);
    }

    /**
     * Create a copy of a document
     */
    async copyDocument(
        itemId: string,
        newName: string,
        destinationFolderId?: string
    ): Promise<{ monitorUrl: string }> {
        const body: Record<string, unknown> = {
            name: newName
        };

        if (destinationFolderId) {
            body.parentReference = { id: destinationFolderId };
        }

        return this.post(`/me/drive/items/${itemId}/copy`, body);
    }

    /**
     * Delete a document
     */
    async deleteDocument(itemId: string): Promise<void> {
        await this.delete(`/me/drive/items/${itemId}`);
    }

    /**
     * Create a sharing link for a document
     */
    async createSharingLink(
        itemId: string,
        type: "view" | "edit" | "embed",
        scope?: "anonymous" | "organization"
    ): Promise<{ link: { webUrl: string; type: string; scope: string } }> {
        const body: Record<string, unknown> = { type };
        if (scope) {
            body.scope = scope;
        }

        return this.post(`/me/drive/items/${itemId}/createLink`, body);
    }

    /**
     * Get document preview URL
     */
    async getPreviewUrl(itemId: string): Promise<{ getUrl: string }> {
        return this.post(`/me/drive/items/${itemId}/preview`, {});
    }
}
