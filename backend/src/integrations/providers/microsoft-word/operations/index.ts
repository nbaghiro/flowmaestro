import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftWordClient } from "../client/MicrosoftWordClient";

// ============================================================================
// Get Document Operation
// ============================================================================

export const getDocumentSchema = z
    .object({
        itemId: z.string().optional().describe("OneDrive item ID of the Word document"),
        filePath: z.string().optional().describe("File path (e.g., 'Documents/report.docx')")
    })
    .refine((data) => data.itemId || data.filePath, {
        message: "Either itemId or filePath must be provided"
    });

export type GetDocumentParams = z.infer<typeof getDocumentSchema>;

export const getDocumentOperation: OperationDefinition = {
    id: "getDocument",
    name: "Get Document",
    description: "Get metadata for a Word document",
    category: "documents",
    inputSchema: getDocumentSchema,
    retryable: true
};

export async function executeGetDocument(
    client: MicrosoftWordClient,
    params: GetDocumentParams
): Promise<OperationResult> {
    try {
        let result;
        if (params.itemId) {
            result = await client.getDocument(params.itemId);
        } else if (params.filePath) {
            result = await client.getDocumentByPath(params.filePath);
        } else {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: "Either itemId or filePath must be provided",
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
                message: error instanceof Error ? error.message : "Failed to get document",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Download Document Operation
// ============================================================================

export const downloadDocumentSchema = z.object({
    itemId: z.string().describe("OneDrive item ID of the Word document")
});

export type DownloadDocumentParams = z.infer<typeof downloadDocumentSchema>;

export const downloadDocumentOperation: OperationDefinition = {
    id: "downloadDocument",
    name: "Download Document",
    description: "Download a Word document as base64 content",
    category: "documents",
    inputSchema: downloadDocumentSchema,
    retryable: true
};

export async function executeDownloadDocument(
    client: MicrosoftWordClient,
    params: DownloadDocumentParams
): Promise<OperationResult> {
    try {
        const content = await client.downloadDocument(params.itemId);
        return {
            success: true,
            data: {
                content,
                encoding: "base64"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to download document",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Convert Document Operation
// ============================================================================

export const convertDocumentSchema = z.object({
    itemId: z.string().describe("OneDrive item ID of the Word document"),
    format: z.enum(["pdf", "html"]).describe("Target format for conversion")
});

export type ConvertDocumentParams = z.infer<typeof convertDocumentSchema>;

export const convertDocumentOperation: OperationDefinition = {
    id: "convertDocument",
    name: "Convert Document",
    description: "Convert a Word document to PDF or HTML format",
    category: "documents",
    inputSchema: convertDocumentSchema,
    retryable: true
};

export async function executeConvertDocument(
    client: MicrosoftWordClient,
    params: ConvertDocumentParams
): Promise<OperationResult> {
    try {
        const content = await client.convertDocument(params.itemId, params.format);
        return {
            success: true,
            data: {
                content,
                encoding: "base64",
                format: params.format,
                mimeType: params.format === "pdf" ? "application/pdf" : "text/html"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to convert document",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Upload Document Operation
// ============================================================================

export const uploadDocumentSchema = z.object({
    fileName: z.string().describe("Name of the file to create (should end with .docx)"),
    content: z.string().describe("Document content (base64 encoded)"),
    folderId: z.string().optional().describe("Parent folder ID"),
    conflictBehavior: z
        .enum(["rename", "replace", "fail"])
        .optional()
        .describe("Behavior on conflict")
});

export type UploadDocumentParams = z.infer<typeof uploadDocumentSchema>;

export const uploadDocumentOperation: OperationDefinition = {
    id: "uploadDocument",
    name: "Upload Document",
    description: "Upload a new Word document to OneDrive",
    category: "documents",
    inputSchema: uploadDocumentSchema,
    retryable: true
};

export async function executeUploadDocument(
    client: MicrosoftWordClient,
    params: UploadDocumentParams
): Promise<OperationResult> {
    try {
        const result = await client.uploadDocument(
            params.fileName,
            params.content,
            params.folderId,
            params.conflictBehavior
        );
        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to upload document",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Replace Document Operation
// ============================================================================

export const replaceDocumentSchema = z.object({
    itemId: z.string().describe("OneDrive item ID of the Word document"),
    content: z.string().describe("New document content (base64 encoded)")
});

export type ReplaceDocumentParams = z.infer<typeof replaceDocumentSchema>;

export const replaceDocumentOperation: OperationDefinition = {
    id: "replaceDocument",
    name: "Replace Document",
    description: "Replace the content of an existing Word document",
    category: "documents",
    inputSchema: replaceDocumentSchema,
    retryable: true
};

export async function executeReplaceDocument(
    client: MicrosoftWordClient,
    params: ReplaceDocumentParams
): Promise<OperationResult> {
    try {
        const result = await client.replaceDocument(params.itemId, params.content);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to replace document",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Search Documents Operation
// ============================================================================

export const searchDocumentsSchema = z.object({
    query: z.string().describe("Search query"),
    top: z.number().min(1).max(1000).optional().describe("Maximum number of results")
});

export type SearchDocumentsParams = z.infer<typeof searchDocumentsSchema>;

export const searchDocumentsOperation: OperationDefinition = {
    id: "searchDocuments",
    name: "Search Documents",
    description: "Search for Word documents in OneDrive",
    category: "documents",
    inputSchema: searchDocumentsSchema,
    retryable: true
};

export async function executeSearchDocuments(
    client: MicrosoftWordClient,
    params: SearchDocumentsParams
): Promise<OperationResult> {
    try {
        const result = await client.searchDocuments(params.query, params.top);
        return {
            success: true,
            data: {
                documents: result.value,
                hasMore: !!result["@odata.nextLink"]
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search documents",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Copy Document Operation
// ============================================================================

export const copyDocumentSchema = z.object({
    itemId: z.string().describe("OneDrive item ID of the Word document"),
    newName: z.string().describe("Name for the copy"),
    destinationFolderId: z.string().optional().describe("Destination folder ID")
});

export type CopyDocumentParams = z.infer<typeof copyDocumentSchema>;

export const copyDocumentOperation: OperationDefinition = {
    id: "copyDocument",
    name: "Copy Document",
    description: "Create a copy of a Word document",
    category: "documents",
    inputSchema: copyDocumentSchema,
    retryable: true
};

export async function executeCopyDocument(
    client: MicrosoftWordClient,
    params: CopyDocumentParams
): Promise<OperationResult> {
    try {
        const result = await client.copyDocument(
            params.itemId,
            params.newName,
            params.destinationFolderId
        );
        return {
            success: true,
            data: {
                copyInProgress: true,
                monitorUrl: result.monitorUrl,
                message: "Copy operation started. Use the monitorUrl to check status."
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to copy document",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Delete Document Operation
// ============================================================================

export const deleteDocumentSchema = z.object({
    itemId: z.string().describe("OneDrive item ID of the Word document to delete")
});

export type DeleteDocumentParams = z.infer<typeof deleteDocumentSchema>;

export const deleteDocumentOperation: OperationDefinition = {
    id: "deleteDocument",
    name: "Delete Document",
    description: "Delete a Word document from OneDrive",
    category: "documents",
    inputSchema: deleteDocumentSchema,
    retryable: false
};

export async function executeDeleteDocument(
    client: MicrosoftWordClient,
    params: DeleteDocumentParams
): Promise<OperationResult> {
    try {
        await client.deleteDocument(params.itemId);
        return {
            success: true,
            data: { deleted: true }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete document",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Create Sharing Link Operation
// ============================================================================

export const createSharingLinkSchema = z.object({
    itemId: z.string().describe("OneDrive item ID of the Word document"),
    type: z.enum(["view", "edit", "embed"]).describe("Type of link to create"),
    scope: z.enum(["anonymous", "organization"]).optional().describe("Scope of the link")
});

export type CreateSharingLinkParams = z.infer<typeof createSharingLinkSchema>;

export const createSharingLinkOperation: OperationDefinition = {
    id: "createSharingLink",
    name: "Create Sharing Link",
    description: "Create a sharing link for a Word document",
    category: "sharing",
    inputSchema: createSharingLinkSchema,
    retryable: true
};

export async function executeCreateSharingLink(
    client: MicrosoftWordClient,
    params: CreateSharingLinkParams
): Promise<OperationResult> {
    try {
        const result = await client.createSharingLink(params.itemId, params.type, params.scope);
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

// ============================================================================
// Get Preview URL Operation
// ============================================================================

export const getPreviewUrlSchema = z.object({
    itemId: z.string().describe("OneDrive item ID of the Word document")
});

export type GetPreviewUrlParams = z.infer<typeof getPreviewUrlSchema>;

export const getPreviewUrlOperation: OperationDefinition = {
    id: "getPreviewUrl",
    name: "Get Preview URL",
    description: "Get an embeddable preview URL for a Word document",
    category: "documents",
    inputSchema: getPreviewUrlSchema,
    retryable: true
};

export async function executeGetPreviewUrl(
    client: MicrosoftWordClient,
    params: GetPreviewUrlParams
): Promise<OperationResult> {
    try {
        const result = await client.getPreviewUrl(params.itemId);
        return {
            success: true,
            data: {
                previewUrl: result.getUrl
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get preview URL",
                retryable: true
            }
        };
    }
}
