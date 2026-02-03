import { z } from "zod";
import { DropletIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * Get Droplet operation schema
 */
export const getDropletSchema = z.object({
    dropletId: DropletIdSchema
});

export type GetDropletParams = z.infer<typeof getDropletSchema>;

/**
 * Get Droplet operation definition
 */
export const getDropletOperation: OperationDefinition = {
    id: "droplets_getDroplet",
    name: "Get Droplet",
    description: "Get details for a specific Droplet by ID",
    category: "droplets",
    inputSchema: getDropletSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get droplet operation
 */
export async function executeGetDroplet(
    client: DigitalOceanClient,
    params: GetDropletParams
): Promise<OperationResult> {
    try {
        const droplet = await client.getDroplet(params.dropletId);

        return {
            success: true,
            data: {
                id: droplet.id,
                name: droplet.name,
                status: droplet.status,
                memory: droplet.memory,
                vcpus: droplet.vcpus,
                disk: droplet.disk,
                locked: droplet.locked,
                region: {
                    slug: droplet.region?.slug,
                    name: droplet.region?.name
                },
                image: {
                    id: droplet.image?.id,
                    name: droplet.image?.name,
                    distribution: droplet.image?.distribution
                },
                size: {
                    slug: droplet.size?.slug,
                    memory: droplet.size?.memory,
                    vcpus: droplet.size?.vcpus,
                    disk: droplet.size?.disk,
                    priceMonthly: droplet.size?.price_monthly,
                    priceHourly: droplet.size?.price_hourly
                },
                sizeSlug: droplet.size_slug,
                networks: {
                    v4: droplet.networks?.v4?.map((n) => ({
                        ipAddress: n.ip_address,
                        netmask: n.netmask,
                        gateway: n.gateway,
                        type: n.type
                    })),
                    v6: droplet.networks?.v6?.map((n) => ({
                        ipAddress: n.ip_address,
                        netmask: n.netmask,
                        gateway: n.gateway,
                        type: n.type
                    }))
                },
                features: droplet.features,
                tags: droplet.tags,
                volumeIds: droplet.volume_ids,
                vpcUuid: droplet.vpc_uuid,
                createdAt: droplet.created_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get Droplet",
                retryable: true
            }
        };
    }
}
