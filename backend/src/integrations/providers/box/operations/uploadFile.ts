import { z } from "zod";
import { BoxClient } from "../client/BoxClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const uploadFileSchema = z.object({
    fileName: z.string().min(1).describe("Name for the file (e.g., 'document.pdf')"),
    content: z.string().describe("File content as base64 encoded string"),
    parentId: z.string().default("0").describe('Parent folder ID (use "0" for root folder)')
});

export type UploadFileParams = z.infer<typeof uploadFileSchema>;

export const uploadFileOperation: OperationDefinition = {
    id: "uploadFile",
    name: "Upload File",
    description:
        "Upload a file to Box. Supports files up to 50MB. Content should be base64 encoded.",
    category: "files",
    inputSchema: uploadFileSchema,
    retryable: true,
    timeout: 120000 // 2 minutes for larger files
};

interface BoxFileEntry {
    type: string;
    id: string;
    name: string;
    size: number;
    created_at: string;
    modified_at: string;
    parent?: {
        id: string;
        name: string;
    };
}

interface BoxUploadResponse {
    total_count: number;
    entries: BoxFileEntry[];
}

export async function executeUploadFile(
    client: BoxClient,
    params: UploadFileParams
): Promise<OperationResult> {
    try {
        // Convert base64 to buffer
        const contentBuffer = Buffer.from(params.content, "base64");

        // Check file size (50MB limit for direct upload)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (contentBuffer.length > maxSize) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: `File size (${Math.round(contentBuffer.length / 1024 / 1024)}MB) exceeds the 50MB limit for direct upload.`,
                    retryable: false
                }
            };
        }

        const response = (await client.uploadFile(
            params.fileName,
            contentBuffer,
            params.parentId
        )) as BoxUploadResponse;

        const file = response.entries[0];

        return {
            success: true,
            data: {
                id: file.id,
                name: file.name,
                size: file.size,
                createdAt: file.created_at,
                modifiedAt: file.modified_at,
                parentId: file.parent?.id,
                parentName: file.parent?.name
            }
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
