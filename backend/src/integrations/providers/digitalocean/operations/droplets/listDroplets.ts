import { z } from "zod";
import { PaginationSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * List Droplets operation schema
 */
export const listDropletsSchema = PaginationSchema.extend({
    tag_name: z.string().optional().describe("Filter by tag name")
});

export type ListDropletsParams = z.infer<typeof listDropletsSchema>;

/**
 * List Droplets operation definition
 */
export const listDropletsOperation: OperationDefinition = {
    id: "droplets_listDroplets",
    name: "List Droplets",
    description: "List all Droplets in the account",
    category: "droplets",
    inputSchema: listDropletsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list droplets operation
 */
export async function executeListDroplets(
    client: DigitalOceanClient,
    params: ListDropletsParams
): Promise<OperationResult> {
    try {
        const response = await client.listDroplets(params);

        return {
            success: true,
            data: {
                droplets: response.droplets.map((droplet) => ({
                    id: droplet.id,
                    name: droplet.name,
                    status: droplet.status,
                    memory: droplet.memory,
                    vcpus: droplet.vcpus,
                    disk: droplet.disk,
                    region: droplet.region?.slug,
                    image: droplet.image?.name,
                    sizeSlug: droplet.size_slug,
                    networks: {
                        v4: droplet.networks?.v4?.map((n) => ({
                            ipAddress: n.ip_address,
                            type: n.type
                        })),
                        v6: droplet.networks?.v6?.map((n) => ({
                            ipAddress: n.ip_address,
                            type: n.type
                        }))
                    },
                    tags: droplet.tags,
                    createdAt: droplet.created_at
                })),
                meta: response.meta,
                links: response.links
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list Droplets",
                retryable: true
            }
        };
    }
}
