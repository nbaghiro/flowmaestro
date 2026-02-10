import { z } from "zod";
import { RegionSlugSchema, SizeSlugSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * Create Droplet operation schema
 */
export const createDropletSchema = z.object({
    name: z.string().min(1).max(255).describe("The human-readable name for the Droplet"),
    region: RegionSlugSchema,
    size: SizeSlugSchema,
    image: z
        .union([z.string(), z.number().int().positive()])
        .describe("The image ID or slug to use for the Droplet"),
    ssh_keys: z
        .array(z.union([z.string(), z.number().int().positive()]))
        .optional()
        .describe("SSH key IDs or fingerprints to embed in the Droplet"),
    backups: z.boolean().optional().describe("Enable automated backups"),
    ipv6: z.boolean().optional().describe("Enable IPv6"),
    vpc_uuid: z.string().uuid().optional().describe("VPC UUID to deploy in"),
    user_data: z.string().optional().describe("Cloud-init user data script"),
    monitoring: z.boolean().optional().describe("Enable DigitalOcean agent monitoring"),
    volumes: z.array(z.string()).optional().describe("Volume IDs to attach"),
    tags: z.array(z.string()).optional().describe("Tags to apply to the Droplet")
});

export type CreateDropletParams = z.infer<typeof createDropletSchema>;

/**
 * Create Droplet operation definition
 */
export const createDropletOperation: OperationDefinition = {
    id: "droplets_createDroplet",
    name: "Create Droplet",
    description: "Create a new Droplet",
    category: "droplets",
    inputSchema: createDropletSchema,
    retryable: false,
    timeout: 60000
};

/**
 * Execute create droplet operation
 */
export async function executeCreateDroplet(
    client: DigitalOceanClient,
    params: CreateDropletParams
): Promise<OperationResult> {
    try {
        const droplet = await client.createDroplet(params);

        return {
            success: true,
            data: {
                id: droplet.id,
                name: droplet.name,
                status: droplet.status,
                memory: droplet.memory,
                vcpus: droplet.vcpus,
                disk: droplet.disk,
                region: droplet.region?.slug,
                sizeSlug: droplet.size_slug,
                createdAt: droplet.created_at,
                message: "Droplet creation initiated"
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create Droplet",
                retryable: false
            }
        };
    }
}
