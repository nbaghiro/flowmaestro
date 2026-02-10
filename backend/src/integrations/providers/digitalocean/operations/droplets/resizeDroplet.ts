import { z } from "zod";
import { DropletIdSchema, SizeSlugSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * Resize Droplet operation schema
 */
export const resizeDropletSchema = z.object({
    dropletId: DropletIdSchema,
    size: SizeSlugSchema.describe("The slug of the new size for the Droplet"),
    disk: z
        .boolean()
        .optional()
        .default(false)
        .describe(
            "Whether to also resize the disk. Only resizing RAM and CPU is reversible. Disk resize is permanent."
        )
});

export type ResizeDropletParams = z.infer<typeof resizeDropletSchema>;

/**
 * Resize Droplet operation definition
 */
export const resizeDropletOperation: OperationDefinition = {
    id: "droplets_resizeDroplet",
    name: "Resize Droplet",
    description: "Resize a Droplet to a different plan",
    category: "droplets",
    inputSchema: resizeDropletSchema,
    retryable: false,
    timeout: 60000
};

/**
 * Execute resize droplet operation
 */
export async function executeResizeDroplet(
    client: DigitalOceanClient,
    params: ResizeDropletParams
): Promise<OperationResult> {
    try {
        const result = await client.performDropletAction(params.dropletId, {
            type: "resize",
            size: params.size,
            disk: params.disk
        });

        return {
            success: true,
            data: {
                dropletId: params.dropletId,
                newSize: params.size,
                diskResize: params.disk,
                actionId: result.action.id,
                actionStatus: result.action.status,
                actionType: result.action.type,
                startedAt: result.action.started_at,
                message: "Resize action initiated"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to resize Droplet",
                retryable: false
            }
        };
    }
}
