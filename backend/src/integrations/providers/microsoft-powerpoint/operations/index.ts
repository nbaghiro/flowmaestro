import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { MicrosoftPowerPointClient } from "../client/MicrosoftPowerPointClient";

// ============================================================================
// Get Presentation Operation
// ============================================================================

export const getPresentationSchema = z
    .object({
        itemId: z.string().optional().describe("OneDrive item ID of the PowerPoint presentation"),
        filePath: z.string().optional().describe("File path (e.g., 'Documents/presentation.pptx')")
    })
    .refine((data) => data.itemId || data.filePath, {
        message: "Either itemId or filePath must be provided"
    });

export type GetPresentationParams = z.infer<typeof getPresentationSchema>;

export const getPresentationOperation: OperationDefinition = {
    id: "getPresentation",
    name: "Get Presentation",
    description: "Get metadata for a PowerPoint presentation",
    category: "presentations",
    inputSchema: getPresentationSchema,
    retryable: true
};

export async function executeGetPresentation(
    client: MicrosoftPowerPointClient,
    params: GetPresentationParams
): Promise<OperationResult> {
    try {
        let result;
        if (params.itemId) {
            result = await client.getPresentation(params.itemId);
        } else if (params.filePath) {
            result = await client.getPresentationByPath(params.filePath);
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
                message: error instanceof Error ? error.message : "Failed to get presentation",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Download Presentation Operation
// ============================================================================

export const downloadPresentationSchema = z.object({
    itemId: z.string().describe("OneDrive item ID of the PowerPoint presentation")
});

export type DownloadPresentationParams = z.infer<typeof downloadPresentationSchema>;

export const downloadPresentationOperation: OperationDefinition = {
    id: "downloadPresentation",
    name: "Download Presentation",
    description: "Download a PowerPoint presentation as base64 content",
    category: "presentations",
    inputSchema: downloadPresentationSchema,
    retryable: true
};

export async function executeDownloadPresentation(
    client: MicrosoftPowerPointClient,
    params: DownloadPresentationParams
): Promise<OperationResult> {
    try {
        const content = await client.downloadPresentation(params.itemId);
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
                message: error instanceof Error ? error.message : "Failed to download presentation",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Convert Presentation Operation
// ============================================================================

export const convertPresentationSchema = z.object({
    itemId: z.string().describe("OneDrive item ID of the PowerPoint presentation"),
    format: z.literal("pdf").describe("Target format for conversion (PDF)")
});

export type ConvertPresentationParams = z.infer<typeof convertPresentationSchema>;

export const convertPresentationOperation: OperationDefinition = {
    id: "convertPresentation",
    name: "Convert Presentation",
    description: "Convert a PowerPoint presentation to PDF format",
    category: "presentations",
    inputSchema: convertPresentationSchema,
    retryable: true
};

export async function executeConvertPresentation(
    client: MicrosoftPowerPointClient,
    params: ConvertPresentationParams
): Promise<OperationResult> {
    try {
        const content = await client.convertPresentation(params.itemId, params.format);
        return {
            success: true,
            data: {
                content,
                encoding: "base64",
                format: params.format,
                mimeType: "application/pdf"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to convert presentation",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Upload Presentation Operation
// ============================================================================

export const uploadPresentationSchema = z.object({
    fileName: z.string().describe("Name of the file to create (should end with .pptx)"),
    content: z.string().describe("Presentation content (base64 encoded)"),
    folderId: z.string().optional().describe("Parent folder ID"),
    conflictBehavior: z
        .enum(["rename", "replace", "fail"])
        .optional()
        .describe("Behavior on conflict")
});

export type UploadPresentationParams = z.infer<typeof uploadPresentationSchema>;

export const uploadPresentationOperation: OperationDefinition = {
    id: "uploadPresentation",
    name: "Upload Presentation",
    description: "Upload a new PowerPoint presentation to OneDrive",
    category: "presentations",
    inputSchema: uploadPresentationSchema,
    retryable: true
};

export async function executeUploadPresentation(
    client: MicrosoftPowerPointClient,
    params: UploadPresentationParams
): Promise<OperationResult> {
    try {
        const result = await client.uploadPresentation(
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
                message: error instanceof Error ? error.message : "Failed to upload presentation",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Replace Presentation Operation
// ============================================================================

export const replacePresentationSchema = z.object({
    itemId: z.string().describe("OneDrive item ID of the PowerPoint presentation"),
    content: z.string().describe("New presentation content (base64 encoded)")
});

export type ReplacePresentationParams = z.infer<typeof replacePresentationSchema>;

export const replacePresentationOperation: OperationDefinition = {
    id: "replacePresentation",
    name: "Replace Presentation",
    description: "Replace the content of an existing PowerPoint presentation",
    category: "presentations",
    inputSchema: replacePresentationSchema,
    retryable: true
};

export async function executeReplacePresentation(
    client: MicrosoftPowerPointClient,
    params: ReplacePresentationParams
): Promise<OperationResult> {
    try {
        const result = await client.replacePresentation(params.itemId, params.content);
        return {
            success: true,
            data: result
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to replace presentation",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Search Presentations Operation
// ============================================================================

export const searchPresentationsSchema = z.object({
    query: z.string().describe("Search query"),
    top: z.number().min(1).max(1000).optional().describe("Maximum number of results")
});

export type SearchPresentationsParams = z.infer<typeof searchPresentationsSchema>;

export const searchPresentationsOperation: OperationDefinition = {
    id: "searchPresentations",
    name: "Search Presentations",
    description: "Search for PowerPoint presentations in OneDrive",
    category: "presentations",
    inputSchema: searchPresentationsSchema,
    retryable: true
};

export async function executeSearchPresentations(
    client: MicrosoftPowerPointClient,
    params: SearchPresentationsParams
): Promise<OperationResult> {
    try {
        const result = await client.searchPresentations(params.query, params.top);
        return {
            success: true,
            data: {
                presentations: result.value,
                hasMore: !!result["@odata.nextLink"]
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to search presentations",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Copy Presentation Operation
// ============================================================================

export const copyPresentationSchema = z.object({
    itemId: z.string().describe("OneDrive item ID of the PowerPoint presentation"),
    newName: z.string().describe("Name for the copy"),
    destinationFolderId: z.string().optional().describe("Destination folder ID")
});

export type CopyPresentationParams = z.infer<typeof copyPresentationSchema>;

export const copyPresentationOperation: OperationDefinition = {
    id: "copyPresentation",
    name: "Copy Presentation",
    description: "Create a copy of a PowerPoint presentation",
    category: "presentations",
    inputSchema: copyPresentationSchema,
    retryable: true
};

export async function executeCopyPresentation(
    client: MicrosoftPowerPointClient,
    params: CopyPresentationParams
): Promise<OperationResult> {
    try {
        const result = await client.copyPresentation(
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
                message: error instanceof Error ? error.message : "Failed to copy presentation",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Delete Presentation Operation
// ============================================================================

export const deletePresentationSchema = z.object({
    itemId: z.string().describe("OneDrive item ID of the PowerPoint presentation to delete")
});

export type DeletePresentationParams = z.infer<typeof deletePresentationSchema>;

export const deletePresentationOperation: OperationDefinition = {
    id: "deletePresentation",
    name: "Delete Presentation",
    description: "Delete a PowerPoint presentation from OneDrive",
    category: "presentations",
    inputSchema: deletePresentationSchema,
    retryable: false
};

export async function executeDeletePresentation(
    client: MicrosoftPowerPointClient,
    params: DeletePresentationParams
): Promise<OperationResult> {
    try {
        await client.deletePresentation(params.itemId);
        return {
            success: true,
            data: { deleted: true }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete presentation",
                retryable: true
            }
        };
    }
}

// ============================================================================
// Create Sharing Link Operation
// ============================================================================

export const createSharingLinkSchema = z.object({
    itemId: z.string().describe("OneDrive item ID of the PowerPoint presentation"),
    type: z.enum(["view", "edit", "embed"]).describe("Type of link to create"),
    scope: z.enum(["anonymous", "organization"]).optional().describe("Scope of the link")
});

export type CreateSharingLinkParams = z.infer<typeof createSharingLinkSchema>;

export const createSharingLinkOperation: OperationDefinition = {
    id: "createSharingLink",
    name: "Create Sharing Link",
    description: "Create a sharing link for a PowerPoint presentation",
    category: "sharing",
    inputSchema: createSharingLinkSchema,
    retryable: true
};

export async function executeCreateSharingLink(
    client: MicrosoftPowerPointClient,
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
    itemId: z.string().describe("OneDrive item ID of the PowerPoint presentation")
});

export type GetPreviewUrlParams = z.infer<typeof getPreviewUrlSchema>;

export const getPreviewUrlOperation: OperationDefinition = {
    id: "getPreviewUrl",
    name: "Get Preview URL",
    description: "Get an embeddable preview URL for a PowerPoint presentation",
    category: "presentations",
    inputSchema: getPreviewUrlSchema,
    retryable: true
};

export async function executeGetPreviewUrl(
    client: MicrosoftPowerPointClient,
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
