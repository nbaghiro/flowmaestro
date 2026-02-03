import { z } from "zod";
import { DropletIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * Power On Droplet operation schema
 */
export const powerOnDropletSchema = z.object({
    dropletId: DropletIdSchema
});

export type PowerOnDropletParams = z.infer<typeof powerOnDropletSchema>;

/**
 * Power On Droplet operation definition
 */
export const powerOnDropletOperation: OperationDefinition = {
    id: "droplets_powerOnDroplet",
    name: "Power On Droplet",
    description: "Power on a Droplet",
    category: "droplets",
    inputSchema: powerOnDropletSchema,
    retryable: false,
    timeout: 30000
};

/**
 * Execute power on droplet operation
 */
export async function executePowerOnDroplet(
    client: DigitalOceanClient,
    params: PowerOnDropletParams
): Promise<OperationResult> {
    try {
        const result = await client.performDropletAction(params.dropletId, { type: "power_on" });

        return {
            success: true,
            data: {
                dropletId: params.dropletId,
                actionId: result.action.id,
                actionStatus: result.action.status,
                actionType: result.action.type,
                startedAt: result.action.started_at,
                message: "Power on action initiated"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to power on Droplet",
                retryable: false
            }
        };
    }
}
