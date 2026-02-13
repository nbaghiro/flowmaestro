/**
 * Microsoft PowerPoint Client
 *
 * REST API client for Microsoft Graph PowerPoint presentation endpoints.
 * Uses Microsoft Graph API v1.0 for presentation operations.
 *
 * Note: PowerPoint presentations in Microsoft Graph are accessed through the Drive API
 * since they are stored as files in OneDrive/SharePoint.
 */

import { MicrosoftGraphClient } from "../../../core/microsoft";

export interface PowerPointClientConfig {
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

const POWERPOINT_MIME_TYPE =
    "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export class MicrosoftPowerPointClient extends MicrosoftGraphClient {
    constructor(config: PowerPointClientConfig) {
        super({
            accessToken: config.accessToken,
            serviceName: "Microsoft PowerPoint"
        });
    }

    /**
     * Get presentation metadata
     */
    async getPresentation(itemId: string): Promise<DriveItemInfo> {
        return this.get(`/me/drive/items/${itemId}`);
    }

    /**
     * Get presentation by path
     */
    async getPresentationByPath(path: string): Promise<DriveItemInfo> {
        const encodedPath = encodeURIComponent(path).replace(/%2F/g, "/");
        return this.get(`/me/drive/root:/${encodedPath}`);
    }

    /**
     * Download presentation content as base64
     */
    async downloadPresentation(itemId: string): Promise<string> {
        const arrayBuffer = await this.downloadBinary(`/me/drive/items/${itemId}/content`);
        return Buffer.from(arrayBuffer).toString("base64");
    }

    /**
     * Convert presentation to another format (PDF)
     */
    async convertPresentation(itemId: string, format: "pdf"): Promise<string> {
        const arrayBuffer = await this.downloadBinary(
            `/me/drive/items/${itemId}/content?format=${format}`
        );
        return Buffer.from(arrayBuffer).toString("base64");
    }

    /**
     * Upload a new PowerPoint presentation
     */
    async uploadPresentation(
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
            contentType: POWERPOINT_MIME_TYPE
        });
    }

    /**
     * Replace presentation content
     */
    async replacePresentation(itemId: string, content: Buffer | string): Promise<DriveItemInfo> {
        const contentBuffer =
            typeof content === "string" ? Buffer.from(content, "base64") : content;

        return this.requestBinary(`/me/drive/items/${itemId}/content`, {
            method: "PUT",
            body: contentBuffer,
            contentType: POWERPOINT_MIME_TYPE
        });
    }

    /**
     * Search for PowerPoint presentations
     */
    async searchPresentations(query: string, top?: number): Promise<SearchResult> {
        // Search for .pptx files
        const searchQuery = `${query} AND filetype:pptx`;
        let url = `/me/drive/root/search(q='${encodeURIComponent(searchQuery)}')`;

        if (top) {
            url += `?$top=${top}`;
        }

        return this.get(url);
    }

    /**
     * Create a copy of a presentation
     */
    async copyPresentation(
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
     * Delete a presentation
     */
    async deletePresentation(itemId: string): Promise<void> {
        await this.delete(`/me/drive/items/${itemId}`);
    }

    /**
     * Create a sharing link for a presentation
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
     * Get presentation preview URL
     */
    async getPreviewUrl(itemId: string): Promise<{ getUrl: string }> {
        return this.post(`/me/drive/items/${itemId}/preview`, {});
    }
}
