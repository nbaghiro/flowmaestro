import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { GoogleDriveClient } from "../client/GoogleDriveClient";

/**
 * Revoke permission input schema
 */
export const revokePermissionSchema = z.object({
    fileId: z.string().min(1).describe("File or folder ID"),
    permissionId: z
        .string()
        .min(1)
        .describe("Permission ID to revoke (get from listPermissions operation)")
});

export type RevokePermissionParams = z.infer<typeof revokePermissionSchema>;

/**
 * Revoke permission operation definition
 */
export const revokePermissionOperation: OperationDefinition = {
    id: "revokePermission",
    name: "Revoke File Permission",
    description: "Revoke (remove) a specific permission from a file or folder",
    category: "sharing",
    retryable: true,
    inputSchema: revokePermissionSchema
};

/**
 * Execute revoke permission operation
 */
export async function executeRevokePermission(
    client: GoogleDriveClient,
    params: RevokePermissionParams
): Promise<OperationResult> {
    try {
        await client.deletePermission(params.fileId, params.permissionId);

        return {
            success: true,
            data: {
                fileId: params.fileId,
                permissionId: params.permissionId,
                revoked: true
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to revoke permission",
                retryable: true
            }
        };
    }
}
