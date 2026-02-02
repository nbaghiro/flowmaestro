import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { AzureStorageClient } from "../client/AzureStorageClient";

/**
 * Set blob tier input schema
 */
export const setBlobTierSchema = z.object({
    container: z.string().min(3).max(63).describe("Container name"),
    blob: z.string().min(1).max(1024).describe("Blob name (path in container)"),
    tier: z
        .enum(["Hot", "Cool", "Cold", "Archive"])
        .describe(
            "Access tier: Hot (frequent access), Cool (infrequent), Cold (rare), Archive (offline)"
        )
});

export type SetBlobTierParams = z.infer<typeof setBlobTierSchema>;

/**
 * Set blob tier operation definition
 */
export const setBlobTierOperation: OperationDefinition = {
    id: "setBlobTier",
    name: "Set Blob Tier",
    description: "Change the access tier of a blob (Hot/Cool/Cold/Archive)",
    category: "blobs",
    retryable: true,
    inputSchema: setBlobTierSchema
};

/**
 * Execute set blob tier operation
 */
export async function executeSetBlobTier(
    client: AzureStorageClient,
    params: SetBlobTierParams
): Promise<OperationResult> {
    try {
        await client.setBlobTier({
            container: params.container,
            blob: params.blob,
            tier: params.tier
        });

        return {
            success: true,
            data: {
                container: params.container,
                blob: params.blob,
                tier: params.tier,
                updated: true
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to set blob tier";
        const isNotFound = message.includes("BlobNotFound");

        return {
            success: false,
            error: {
                type: isNotFound ? "not_found" : "server_error",
                message,
                retryable: !isNotFound
            }
        };
    }
}
