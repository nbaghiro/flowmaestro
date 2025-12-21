import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { BoxClient } from "../client/BoxClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const listFilesSchema = z.object({
    folderId: z
        .string()
        .default("0")
        .describe('Folder ID to list contents from (use "0" for root folder)'),
    limit: z
        .number()
        .optional()
        .default(100)
        .describe("Maximum number of items to return (1-1000)"),
    offset: z
        .number()
        .optional()
        .default(0)
        .describe("Pagination offset for retrieving additional items")
});

export type ListFilesParams = z.infer<typeof listFilesSchema>;

export const listFilesOperation: OperationDefinition = {
    id: "listFiles",
    name: "List Files",
    description:
        "List files and folders in a Box directory. Returns file metadata including names, paths, sizes, and modification dates.",
    category: "files",
    inputSchema: listFilesSchema,
    inputSchemaJSON: toJSONSchema(listFilesSchema),
    retryable: true,
    timeout: 30000
};

interface BoxEntry {
    type: "file" | "folder" | "web_link";
    id: string;
    name: string;
    size?: number;
    modified_at?: string;
    created_at?: string;
    path_collection?: {
        total_count: number;
        entries: Array<{ id: string; name: string }>;
    };
    shared_link?: {
        url: string;
        access: string;
    } | null;
}

interface BoxListResponse {
    total_count: number;
    entries: BoxEntry[];
    offset: number;
    limit: number;
}

export async function executeListFiles(
    client: BoxClient,
    params: ListFilesParams
): Promise<OperationResult> {
    try {
        const response = (await client.listFolder(
            params.folderId,
            params.limit,
            params.offset
        )) as BoxListResponse;

        // Transform entries to a cleaner format
        const items = response.entries.map((entry) => ({
            type: entry.type,
            id: entry.id,
            name: entry.name,
            ...(entry.type === "file" && {
                size: entry.size,
                modifiedAt: entry.modified_at,
                createdAt: entry.created_at
            }),
            path:
                entry.path_collection?.entries
                    .map((p) => p.name)
                    .concat(entry.name)
                    .join("/") || entry.name,
            sharedLink: entry.shared_link?.url || null
        }));

        return {
            success: true,
            data: {
                folderId: params.folderId,
                totalCount: response.total_count,
                offset: response.offset,
                limit: response.limit,
                hasMore: response.offset + response.entries.length < response.total_count,
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
