import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { BoxClient } from "../client/BoxClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const deleteFileSchema = z.object({
    fileId: z.string().min(1).describe("The Box file ID to delete"),
    type: z
        .enum(["file", "folder"])
        .default("file")
        .describe('Type of item to delete: "file" or "folder"'),
    recursive: z
        .boolean()
        .optional()
        .default(false)
        .describe("For folders only: delete all contents recursively")
});

export type DeleteFileParams = z.infer<typeof deleteFileSchema>;

export const deleteFileOperation: OperationDefinition = {
    id: "deleteFile",
    name: "Delete File or Folder",
    description:
        "Delete a file or folder from Box. Deleted items are moved to trash and can be restored for 30 days.",
    category: "files",
    inputSchema: deleteFileSchema,
    inputSchemaJSON: toJSONSchema(deleteFileSchema),
    retryable: false, // Don't retry deletes
    timeout: 30000
};

export async function executeDeleteFile(
    client: BoxClient,
    params: DeleteFileParams
): Promise<OperationResult> {
    try {
        if (params.type === "folder") {
            await client.deleteFolder(params.fileId, params.recursive);
        } else {
            await client.deleteFile(params.fileId);
        }

        return {
            success: true,
            data: {
                deleted: true,
                id: params.fileId,
                type: params.type,
                message: `${params.type === "folder" ? "Folder" : "File"} moved to trash successfully.`
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete item";

        // Check for not found error
        if (message.includes("not found") || message.includes("404")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `${params.type === "folder" ? "Folder" : "File"} not found.`,
                    retryable: false
                }
            };
        }

        // Check for permission error
        if (message.includes("permission") || message.includes("403")) {
            return {
                success: false,
                error: {
                    type: "permission",
                    message: `You don't have permission to delete this ${params.type}.`,
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
