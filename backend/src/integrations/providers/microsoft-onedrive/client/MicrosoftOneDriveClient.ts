/**
 * Microsoft OneDrive Client
 *
 * REST API client for Microsoft Graph OneDrive endpoints.
 * Uses Microsoft Graph API v1.0.
 */

import { MicrosoftGraphClient } from "../../../core/microsoft";

export interface OneDriveClientConfig {
    accessToken: string;
}

export interface DriveItem {
    id: string;
    name: string;
    size?: number;
    createdDateTime?: string;
    lastModifiedDateTime?: string;
    webUrl?: string;
    file?: {
        mimeType?: string;
        hashes?: {
            quickXorHash?: string;
            sha1Hash?: string;
        };
    };
    folder?: {
        childCount?: number;
    };
    parentReference?: {
        driveId?: string;
        id?: string;
        path?: string;
    };
}

export interface DriveItemsResponse {
    value: DriveItem[];
    "@odata.nextLink"?: string;
}

export class MicrosoftOneDriveClient extends MicrosoftGraphClient {
    constructor(config: OneDriveClientConfig) {
        super({
            accessToken: config.accessToken,
            serviceName: "Microsoft OneDrive"
        });
    }

    /**
     * Get current user's drive information
     */
    async getDrive(): Promise<{ id: string; driveType: string; quota: unknown }> {
        return this.get("/me/drive");
    }

    /**
     * List files in a folder
     */
    async listFiles(params: {
        folderId?: string;
        folderPath?: string;
        top?: number;
        orderBy?: string;
    }): Promise<DriveItemsResponse> {
        let endpoint = "/me/drive/root/children";

        if (params.folderId) {
            endpoint = `/me/drive/items/${params.folderId}/children`;
        } else if (params.folderPath) {
            const encodedPath = encodeURIComponent(params.folderPath);
            endpoint = `/me/drive/root:/${encodedPath}:/children`;
        }

        const queryParams: string[] = [];
        if (params.top) {
            queryParams.push(`$top=${params.top}`);
        }
        if (params.orderBy) {
            queryParams.push(`$orderby=${params.orderBy}`);
        }

        if (queryParams.length > 0) {
            endpoint += `?${queryParams.join("&")}`;
        }

        return this.get(endpoint);
    }

    /**
     * Get file metadata by ID
     */
    async getFile(fileId: string): Promise<DriveItem> {
        return this.get(`/me/drive/items/${fileId}`);
    }

    /**
     * Get file metadata by path
     */
    async getFileByPath(filePath: string): Promise<DriveItem> {
        const encodedPath = encodeURIComponent(filePath);
        return this.get(`/me/drive/root:/${encodedPath}`);
    }

    /**
     * Download file content
     */
    async downloadFile(fileId: string): Promise<ArrayBuffer> {
        return this.downloadBinary(`/me/drive/items/${fileId}/content`);
    }

    /**
     * Upload file (small files < 4MB)
     */
    async uploadFile(params: {
        fileName: string;
        content: string | Buffer;
        folderId?: string;
        folderPath?: string;
        conflictBehavior?: "rename" | "replace" | "fail";
    }): Promise<DriveItem> {
        let endpoint: string;

        if (params.folderId) {
            endpoint = `/me/drive/items/${params.folderId}:/${encodeURIComponent(params.fileName)}:/content`;
        } else if (params.folderPath) {
            const fullPath = `${params.folderPath}/${params.fileName}`;
            endpoint = `/me/drive/root:/${encodeURIComponent(fullPath)}:/content`;
        } else {
            endpoint = `/me/drive/root:/${encodeURIComponent(params.fileName)}:/content`;
        }

        if (params.conflictBehavior) {
            endpoint += `?@microsoft.graph.conflictBehavior=${params.conflictBehavior}`;
        }

        return this.requestBinary(endpoint, {
            method: "PUT",
            body: params.content,
            contentType: "application/octet-stream"
        });
    }

    /**
     * Create a folder
     */
    async createFolder(params: {
        name: string;
        parentFolderId?: string;
        parentFolderPath?: string;
    }): Promise<DriveItem> {
        let endpoint = "/me/drive/root/children";

        if (params.parentFolderId) {
            endpoint = `/me/drive/items/${params.parentFolderId}/children`;
        } else if (params.parentFolderPath) {
            const encodedPath = encodeURIComponent(params.parentFolderPath);
            endpoint = `/me/drive/root:/${encodedPath}:/children`;
        }

        return this.post(endpoint, {
            name: params.name,
            folder: {},
            "@microsoft.graph.conflictBehavior": "rename"
        });
    }

    /**
     * Delete a file or folder
     */
    async deleteFile(fileId: string): Promise<void> {
        await this.delete(`/me/drive/items/${fileId}`);
    }

    /**
     * Move a file
     */
    async moveFile(params: {
        fileId: string;
        destinationFolderId: string;
        newName?: string;
    }): Promise<DriveItem> {
        const body: Record<string, unknown> = {
            parentReference: {
                id: params.destinationFolderId
            }
        };

        if (params.newName) {
            body.name = params.newName;
        }

        return this.patch(`/me/drive/items/${params.fileId}`, body);
    }

    /**
     * Copy a file
     */
    async copyFile(params: {
        fileId: string;
        destinationFolderId: string;
        newName?: string;
    }): Promise<{ monitorUrl: string }> {
        const body: Record<string, unknown> = {
            parentReference: {
                id: params.destinationFolderId
            }
        };

        if (params.newName) {
            body.name = params.newName;
        }

        return this.post(`/me/drive/items/${params.fileId}/copy`, body);
    }

    /**
     * Create a sharing link
     */
    async createSharingLink(params: {
        fileId: string;
        type: "view" | "edit" | "embed";
        scope?: "anonymous" | "organization";
    }): Promise<{ link: { webUrl: string; type: string; scope: string } }> {
        return this.post(`/me/drive/items/${params.fileId}/createLink`, {
            type: params.type,
            scope: params.scope || "anonymous"
        });
    }

    /**
     * Search for files
     */
    async searchFiles(query: string, top?: number): Promise<DriveItemsResponse> {
        let endpoint = `/me/drive/root/search(q='${encodeURIComponent(query)}')`;

        if (top) {
            endpoint += `?$top=${top}`;
        }

        return this.get(endpoint);
    }
}
