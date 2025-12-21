import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { BoxClient } from "../client/BoxClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const downloadFileSchema = z.object({
    fileId: z.string().min(1).describe("The Box file ID to download")
});

export type DownloadFileParams = z.infer<typeof downloadFileSchema>;

export const downloadFileOperation: OperationDefinition = {
    id: "downloadFile",
    name: "Download File",
    description:
        "Download a file from Box. Returns the file content as a base64 encoded string along with file metadata.",
    category: "files",
    inputSchema: downloadFileSchema,
    inputSchemaJSON: toJSONSchema(downloadFileSchema),
    retryable: true,
    timeout: 120000 // 2 minutes for larger files
};

interface BoxFileMetadata {
    type: string;
    id: string;
    name: string;
    size: number;
    modified_at: string;
    created_at: string;
    path_collection?: {
        total_count: number;
        entries: Array<{ id: string; name: string }>;
    };
}

export async function executeDownloadFile(
    client: BoxClient,
    params: DownloadFileParams
): Promise<OperationResult> {
    try {
        const { content, metadata } = await client.downloadFile(params.fileId);

        const fileMetadata = metadata as BoxFileMetadata;

        return {
            success: true,
            data: {
                id: fileMetadata.id,
                name: fileMetadata.name,
                size: fileMetadata.size,
                modifiedAt: fileMetadata.modified_at,
                createdAt: fileMetadata.created_at,
                path:
                    fileMetadata.path_collection?.entries
                        .map((p) => p.name)
                        .concat(fileMetadata.name)
                        .join("/") || fileMetadata.name,
                content,
                contentEncoding: "base64"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to download file",
                retryable: true
            }
        };
    }
}
