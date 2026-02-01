import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleDriveClient } from "../client/GoogleDriveClient";

/**
 * List permissions input schema
 */
export const listPermissionsSchema = z.object({
    fileId: z.string().min(1).describe("File or folder ID to list permissions for")
});

export type ListPermissionsParams = z.infer<typeof listPermissionsSchema>;

/**
 * List permissions operation definition
 */
export const listPermissionsOperation: OperationDefinition = {
    id: "listPermissions",
    name: "List File Permissions",
    description: "List all permissions (who has access) for a specific file or folder",
    category: "sharing",
    retryable: true,
    inputSchema: listPermissionsSchema
};

/**
 * Execute list permissions operation
 */
export async function executeListPermissions(
    client: GoogleDriveClient,
    params: ListPermissionsParams
): Promise<OperationResult> {
    try {
        const response = await client.listPermissions(params.fileId);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list permissions",
                retryable: true
            }
        };
    }
}
