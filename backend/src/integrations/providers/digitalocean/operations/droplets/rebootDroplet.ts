import { z } from "zod";
import { DropletIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * Reboot Droplet operation schema
 */
export const rebootDropletSchema = z.object({
    dropletId: DropletIdSchema
});

export type RebootDropletParams = z.infer<typeof rebootDropletSchema>;

/**
 * Reboot Droplet operation definition
 */
export const rebootDropletOperation: OperationDefinition = {
    id: "droplets_rebootDroplet",
    name: "Reboot Droplet",
    description: "Reboot a Droplet (graceful restart)",
    category: "droplets",
    inputSchema: rebootDropletSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute reboot droplet operation
 */
export async function executeRebootDroplet(
    client: DigitalOceanClient,
    params: RebootDropletParams
): Promise<OperationResult> {
    try {
        const result = await client.performDropletAction(params.dropletId, { type: "reboot" });

        return {
            success: true,
            data: {
                dropletId: params.dropletId,
                actionId: result.action.id,
                actionStatus: result.action.status,
                actionType: result.action.type,
                startedAt: result.action.started_at,
                message: "Reboot action initiated"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to reboot Droplet",
                retryable: false
            }
        };
    }
}
