import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftOneDriveClient } from "../client/MicrosoftOneDriveClient";

// ============================================================================
// List Files Operation
// ============================================================================

export const listFilesSchema = z.object({
    folderId: z.string().optional().describe("Folder ID to list files from"),
    folderPath: z
        .string()
        .optional()
        .describe("Folder path to list files from (e.g., 'Documents/Reports')"),
    top: z.number().min(1).max(1000).optional().describe("Maximum number of items to return"),
    orderBy: z
        .string()
        .optional()
        .describe("Sort order (e.g., 'name asc', 'lastModifiedDateTime desc')")
});

export type ListFilesParams = z.infer<typeof listFilesSchema>;

export const listFilesOperation: OperationDefinition = {
    id: "listFiles",
    name: "List Files",
    description: "List files and folders in OneDrive",
    category: "files",
    inputSchema: listFilesSchema,
    retryable: true
};

export async function executeListFiles(
    client: MicrosoftOneDriveClient,
    params: ListFilesParams
): Promise<OperationResult> {
    try {
        const result = await client.listFiles(params);
        return {
            success: true,
            data: {
                files: result.value,
                hasMore: !!result["@odata.nextLink"]
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list files",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Get File Operation
// ============================================================================

export const getFileSchema = z
    .object({
        fileId: z.string().optional().describe("File ID"),
        filePath: z.string().optional().describe("File path (e.g., 'Documents/report.pdf')")
    })
    .refine((data) => data.fileId || data.filePath, {
        message: "Either fileId or filePath must be provided"
    });

export type GetFileParams = z.infer<typeof getFileSchema>;

export const getFileOperation: OperationDefinition = {
    id: "getFile",
    name: "Get File",
    description: "Get file metadata from OneDrive",
    category: "files",
    inputSchema: getFileSchema,
    retryable: true
};

export async function executeGetFile(
    client: MicrosoftOneDriveClient,
    params: GetFileParams
): Promise<OperationResult> {
    try {
        let result;
        if (params.fileId) {
            result = await client.getFile(params.fileId);
        } else if (params.filePath) {
            result = await client.getFileByPath(params.filePath);
        } else {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "Either fileId or filePath must be provided",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get file",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Upload File Operation
// ============================================================================

export const uploadFileSchema = z.object({
    fileName: z.string().describe("Name of the file to create"),
    content: z.string().describe("File content (text or base64 encoded)"),
    folderId: z.string().optional().describe("Parent folder ID"),
    folderPath: z.string().optional().describe("Parent folder path"),
    conflictBehavior: z
        .enum(["rename", "replace", "fail"])
        .optional()
        .describe("Behavior on conflict")
});

export type UploadFileParams = z.infer<typeof uploadFileSchema>;

export const uploadFileOperation: OperationDefinition = {
    id: "uploadFile",
    name: "Upload File",
    description: "Upload a file to OneDrive",
    category: "files",
    inputSchema: uploadFileSchema,
    retryable: true
};

export async function executeUploadFile(
    client: MicrosoftOneDriveClient,
    params: UploadFileParams
): Promise<OperationResult> {
    try {
        const result = await client.uploadFile(params);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to upload file",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Create Folder Operation
// ============================================================================

export const createFolderSchema = z.object({
    name: z.string().describe("Name of the folder to create"),
    parentFolderId: z.string().optional().describe("Parent folder ID"),
    parentFolderPath: z.string().optional().describe("Parent folder path")
});

export type CreateFolderParams = z.infer<typeof createFolderSchema>;

export const createFolderOperation: OperationDefinition = {
    id: "createFolder",
    name: "Create Folder",
    description: "Create a new folder in OneDrive",
    category: "folders",
    inputSchema: createFolderSchema,
    retryable: true
};

export async function executeCreateFolder(
    client: MicrosoftOneDriveClient,
    params: CreateFolderParams
): Promise<OperationResult> {
    try {
        const result = await client.createFolder(params);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create folder",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Delete File Operation
// ============================================================================

export const deleteFileSchema = z.object({
    fileId: z.string().describe("ID of the file or folder to delete")
});

export type DeleteFileParams = z.infer<typeof deleteFileSchema>;

export const deleteFileOperation: OperationDefinition = {
    id: "deleteFile",
    name: "Delete File",
    description: "Delete a file or folder from OneDrive",
    category: "files",
    inputSchema: deleteFileSchema,
    retryable: false
};

export async function executeDeleteFile(
    client: MicrosoftOneDriveClient,
    params: DeleteFileParams
): Promise<OperationResult> {
    try {
        await client.deleteFile(params.fileId);
        return {
            success: true,
            data: { deleted: true }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete file",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Search Files Operation
// ============================================================================

export const searchFilesSchema = z.object({
    query: z.string().describe("Search query"),
    top: z.number().min(1).max(1000).optional().describe("Maximum number of results")
});

export type SearchFilesParams = z.infer<typeof searchFilesSchema>;

export const searchFilesOperation: OperationDefinition = {
    id: "searchFiles",
    name: "Search Files",
    description: "Search for files in OneDrive",
    category: "files",
    inputSchema: searchFilesSchema,
    retryable: true
};

export async function executeSearchFiles(
    client: MicrosoftOneDriveClient,
    params: SearchFilesParams
): Promise<OperationResult> {
    try {
        const result = await client.searchFiles(params.query, params.top);
        return {
            success: true,
            data: {
                files: result.value,
                hasMore: !!result["@odata.nextLink"]
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search files",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Create Sharing Link Operation
// ============================================================================

export const createSharingLinkSchema = z.object({
    fileId: z.string().describe("ID of the file to share"),
    type: z.enum(["view", "edit", "embed"]).describe("Type of link to create"),
    scope: z.enum(["anonymous", "organization"]).optional().describe("Scope of the link")
});

export type CreateSharingLinkParams = z.infer<typeof createSharingLinkSchema>;

export const createSharingLinkOperation: OperationDefinition = {
    id: "createSharingLink",
    name: "Create Sharing Link",
    description: "Create a sharing link for a file",
    category: "sharing",
    inputSchema: createSharingLinkSchema,
    retryable: true
};

export async function executeCreateSharingLink(
    client: MicrosoftOneDriveClient,
    params: CreateSharingLinkParams
): Promise<OperationResult> {
    try {
        const result = await client.createSharingLink(params);
        return {
            success: true,
            data: result.link
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create sharing link",
                retryable: true
            }
        };
    }
}
