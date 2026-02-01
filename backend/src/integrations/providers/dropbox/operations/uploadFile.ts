import { z } from "zod";
import { DropboxClient } from "../client/DropboxClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const uploadFileSchema = z.object({
    path: z
        .string()
        .describe(
            'Full path where the file will be saved in Dropbox (e.g., "/Documents/report.pdf")'
        ),
    content: z.string().describe("File content as a base64 encoded string"),
    mode: z
        .enum(["add", "overwrite"])
        .optional()
        .default("add")
        .describe(
            "Upload mode: 'add' creates new file (fails if exists), 'overwrite' replaces existing file"
        ),
    autorename: z
        .boolean()
        .optional()
        .default(false)
        .describe(
            "Automatically rename the file if a conflict exists (e.g., file.pdf becomes file (1).pdf)"
        )
});

export type UploadFileParams = z.infer<typeof uploadFileSchema>;

export const uploadFileOperation: OperationDefinition = {
    id: "uploadFile",
    name: "Upload File",
    description:
        "Upload a file to Dropbox. The file content should be base64 encoded. Returns the uploaded file metadata.",
    category: "files",
    inputSchema: uploadFileSchema,
    retryable: true,
    timeout: 60000 // Longer timeout for uploads
};

interface DropboxFileMetadata {
    ".tag": "file";
    name: string;
    path_lower: string;
    path_display: string;
    id: string;
    client_modified: string;
    server_modified: string;
    size: number;
    content_hash: string;
    is_downloadable: boolean;
}

export async function executeUploadFile(
    client: DropboxClient,
    params: UploadFileParams
): Promise<OperationResult> {
    try {
        // Decode base64 content to buffer
        const contentBuffer = Buffer.from(params.content, "base64");

        const response = (await client.uploadFile({
            path: params.path,
            content: contentBuffer,
            mode: params.mode,
            autorename: params.autorename
        })) as DropboxFileMetadata;

        return {
            success: true,
            data: {
                id: response.id,
                name: response.name,
                path: response.path_display,
                size: response.size,
                modifiedAt: response.server_modified,
                contentHash: response.content_hash,
                isDownloadable: response.is_downloadable
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
