import { z } from "zod";
import { DropletIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * Power Off Droplet operation schema
 */
export const powerOffDropletSchema = z.object({
    dropletId: DropletIdSchema
});

export type PowerOffDropletParams = z.infer<typeof powerOffDropletSchema>;

/**
 * Power Off Droplet operation definition
 */
export const powerOffDropletOperation: OperationDefinition = {
    id: "droplets_powerOffDroplet",
    name: "Power Off Droplet",
    description: "Power off a Droplet (hard shutdown)",
    category: "droplets",
    inputSchema: powerOffDropletSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute power off droplet operation
 */
export async function executePowerOffDroplet(
    client: DigitalOceanClient,
    params: PowerOffDropletParams
): Promise<OperationResult> {
    try {
        const result = await client.performDropletAction(params.dropletId, { type: "power_off" });

        return {
            success: true,
            data: {
                dropletId: params.dropletId,
                actionId: result.action.id,
                actionStatus: result.action.status,
                actionType: result.action.type,
                startedAt: result.action.started_at,
                message: "Power off action initiated"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to power off Droplet",
                retryable: false
            }
        };
    }
}
