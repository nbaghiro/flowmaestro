import { z } from "zod";
import { DatabaseIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * List Database Backups operation schema
 */
export const listBackupsSchema = z.object({
    databaseId: DatabaseIdSchema
});

export type ListBackupsParams = z.infer<typeof listBackupsSchema>;

/**
 * List Database Backups operation definition
 */
export const listBackupsOperation: OperationDefinition = {
    id: "databases_listBackups",
    name: "List Database Backups",
    description: "List all backups for a managed database cluster",
    category: "databases",
    inputSchema: listBackupsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list backups operation
 */
export async function executeListBackups(
    client: DigitalOceanClient,
    params: ListBackupsParams
): Promise<OperationResult> {
    try {
        const response = await client.listDatabaseBackups(params.databaseId);

        return {
            success: true,
            data: {
                backups: response.backups.map((backup) => ({
                    createdAt: backup.created_at,
                    sizeGigabytes: backup.size_gigabytes
                })),
                databaseId: params.databaseId
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list database backups",
                retryable: true
            }
        };
    }
}
