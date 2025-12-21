import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { DropboxClient } from "../client/DropboxClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const downloadFileSchema = z.object({
    path: z.string().describe('Full path to the file in Dropbox (e.g., "/Documents/report.pdf")')
});

export type DownloadFileParams = z.infer<typeof downloadFileSchema>;

export const downloadFileOperation: OperationDefinition = {
    id: "downloadFile",
    name: "Download File",
    description:
        "Download a file from Dropbox. Returns the file content as a base64 encoded string along with file metadata.",
    category: "files",
    inputSchema: downloadFileSchema,
    inputSchemaJSON: toJSONSchema(downloadFileSchema),
    retryable: true,
    timeout: 60000 // Longer timeout for downloads
};

interface DropboxFileMetadata {
    name: string;
    path_lower: string;
    path_display: string;
    id: string;
    client_modified: string;
    server_modified: string;
    size: number;
    content_hash?: string;
}

export async function executeDownloadFile(
    client: DropboxClient,
    params: DownloadFileParams
): Promise<OperationResult> {
    try {
        const response = await client.downloadFile(params.path);
        const metadata = response.metadata as DropboxFileMetadata;

        return {
            success: true,
            data: {
                content: response.content, // base64 encoded
                contentEncoding: "base64",
                metadata: {
                    id: metadata.id,
                    name: metadata.name,
                    path: metadata.path_display,
                    size: metadata.size,
                    modifiedAt: metadata.server_modified,
                    contentHash: metadata.content_hash
                }
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
