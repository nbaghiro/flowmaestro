import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { BoxClient } from "../client/BoxClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const createFolderSchema = z.object({
    name: z.string().min(1).describe("Name for the new folder"),
    parentId: z.string().default("0").describe('Parent folder ID (use "0" for root folder)')
});

export type CreateFolderParams = z.infer<typeof createFolderSchema>;

export const createFolderOperation: OperationDefinition = {
    id: "createFolder",
    name: "Create Folder",
    description: "Create a new folder in Box.",
    category: "folders",
    inputSchema: createFolderSchema,
    inputSchemaJSON: toJSONSchema(createFolderSchema),
    retryable: false, // Don't retry to avoid duplicate folders
    timeout: 30000
};

interface BoxFolderResponse {
    type: string;
    id: string;
    name: string;
    created_at: string;
    modified_at: string;
    parent?: {
        id: string;
        name: string;
    };
    path_collection?: {
        total_count: number;
        entries: Array<{ id: string; name: string }>;
    };
}

export async function executeCreateFolder(
    client: BoxClient,
    params: CreateFolderParams
): Promise<OperationResult> {
    try {
        const response = (await client.createFolder(
            params.name,
            params.parentId
        )) as BoxFolderResponse;

        return {
            success: true,
            data: {
                id: response.id,
                name: response.name,
                createdAt: response.created_at,
                modifiedAt: response.modified_at,
                parentId: response.parent?.id,
                parentName: response.parent?.name,
                path:
                    response.path_collection?.entries
                        .map((p) => p.name)
                        .concat(response.name)
                        .join("/") || response.name
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create folder";

        // Check for conflict error (folder already exists)
        if (message.includes("conflict") || message.includes("409")) {
            return {
                success: false,
                error: {
                    type: "validation",
                    message: `A folder named "${params.name}" already exists in this location.`,
                    retryable: false
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: true
            }
        };
    }
}
