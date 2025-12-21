import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { DropboxClient } from "../client/DropboxClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const listFilesSchema = z.object({
    path: z
        .string()
        .default("")
        .describe('Folder path to list (empty string or "/" for root, e.g., "/Documents")'),
    recursive: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to list files in subfolders recursively")
});

export type ListFilesParams = z.infer<typeof listFilesSchema>;

export const listFilesOperation: OperationDefinition = {
    id: "listFiles",
    name: "List Files",
    description:
        "List files and folders in a Dropbox directory. Returns file metadata including names, paths, sizes, and modification dates.",
    category: "files",
    inputSchema: listFilesSchema,
    inputSchemaJSON: toJSONSchema(listFilesSchema),
    retryable: true,
    timeout: 30000
};

interface DropboxEntry {
    ".tag": "file" | "folder" | "deleted";
    name: string;
    path_lower: string;
    path_display: string;
    id: string;
    client_modified?: string;
    server_modified?: string;
    size?: number;
    is_downloadable?: boolean;
    content_hash?: string;
}

interface DropboxListResponse {
    entries: DropboxEntry[];
    cursor: string;
    has_more: boolean;
}

export async function executeListFiles(
    client: DropboxClient,
    params: ListFilesParams
): Promise<OperationResult> {
    try {
        // Normalize path - Dropbox uses empty string for root
        const normalizedPath = params.path === "/" ? "" : params.path;

        const response = (await client.listFolder(
            normalizedPath,
            params.recursive
        )) as DropboxListResponse;

        // Collect all entries, handling pagination
        let allEntries = [...response.entries];
        let cursor = response.cursor;
        let hasMore = response.has_more;

        while (hasMore) {
            const continueResponse = (await client.listFolderContinue(
                cursor
            )) as DropboxListResponse;
            allEntries = allEntries.concat(continueResponse.entries);
            cursor = continueResponse.cursor;
            hasMore = continueResponse.has_more;
        }

        // Transform entries to a cleaner format
        const items = allEntries.map((entry) => ({
            type: entry[".tag"],
            name: entry.name,
            path: entry.path_display,
            id: entry.id,
            ...(entry[".tag"] === "file" && {
                size: entry.size,
                modifiedAt: entry.server_modified,
                isDownloadable: entry.is_downloadable
            })
        }));

        return {
            success: true,
            data: {
                path: params.path || "/",
                itemCount: items.length,
                items
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
