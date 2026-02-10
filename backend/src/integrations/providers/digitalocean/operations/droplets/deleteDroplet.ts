import { z } from "zod";
import { DropletIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * Delete Droplet operation schema
 */
export const deleteDropletSchema = z.object({
    dropletId: DropletIdSchema
});

export type DeleteDropletParams = z.infer<typeof deleteDropletSchema>;

/**
 * Delete Droplet operation definition
 */
export const deleteDropletOperation: OperationDefinition = {
    id: "droplets_deleteDroplet",
    name: "Delete Droplet",
    description: "Delete a Droplet",
    category: "droplets",
    inputSchema: deleteDropletSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute delete droplet operation
 */
export async function executeDeleteDroplet(
    client: DigitalOceanClient,
    params: DeleteDropletParams
): Promise<OperationResult> {
    try {
        await client.deleteDroplet(params.dropletId);

        return {
            success: true,
            data: {
                dropletId: params.dropletId,
                message: "Droplet deleted successfully"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete Droplet",
                retryable: false
            }
        };
    }
}
