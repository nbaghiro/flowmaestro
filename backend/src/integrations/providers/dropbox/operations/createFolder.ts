import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { DropboxClient } from "../client/DropboxClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const createFolderSchema = z.object({
    path: z
        .string()
        .describe('Full path for the new folder (e.g., "/Documents/Projects/NewFolder")'),
    autorename: z
        .boolean()
        .optional()
        .default(false)
        .describe(
            "Automatically rename the folder if a conflict exists (e.g., Folder becomes Folder (1))"
        )
});

export type CreateFolderParams = z.infer<typeof createFolderSchema>;

export const createFolderOperation: OperationDefinition = {
    id: "createFolder",
    name: "Create Folder",
    description: "Create a new folder in Dropbox. Returns the created folder metadata.",
    category: "folders",
    inputSchema: createFolderSchema,
    inputSchemaJSON: toJSONSchema(createFolderSchema),
    retryable: true,
    timeout: 10000
};

interface DropboxFolderMetadata {
    metadata: {
        ".tag": "folder";
        name: string;
        path_lower: string;
        path_display: string;
        id: string;
    };
}

export async function executeCreateFolder(
    client: DropboxClient,
    params: CreateFolderParams
): Promise<OperationResult> {
    try {
        const response = (await client.createFolder(
            params.path,
            params.autorename
        )) as DropboxFolderMetadata;

        return {
            success: true,
            data: {
                id: response.metadata.id,
                name: response.metadata.name,
                path: response.metadata.path_display
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create folder",
                retryable: false
            }
        };
    }
}
