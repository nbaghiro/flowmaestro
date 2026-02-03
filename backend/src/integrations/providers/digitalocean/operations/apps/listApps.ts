import { z } from "zod";
import { PaginationSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * List Apps operation schema
 */
export const listAppsSchema = PaginationSchema;

export type ListAppsParams = z.infer<typeof listAppsSchema>;

/**
 * List Apps operation definition
 */
export const listAppsOperation: OperationDefinition = {
    id: "apps_listApps",
    name: "List Apps",
    description: "List all App Platform apps in the account",
    category: "apps",
    inputSchema: listAppsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute list apps operation
 */
export async function executeListApps(
    client: DigitalOceanClient,
    params: ListAppsParams
): Promise<OperationResult> {
    try {
        const response = await client.listApps(params);

        return {
            success: true,
            data: {
                apps: response.apps.map((app) => ({
                    id: app.id,
                    name: app.spec.name,
                    region: app.region?.slug,
                    tierSlug: app.tier_slug,
                    liveUrl: app.live_url,
                    defaultIngress: app.default_ingress,
                    activeDeployment: app.active_deployment
                        ? {
                              id: app.active_deployment.id,
                              phase: app.active_deployment.phase,
                              createdAt: app.active_deployment.created_at
                          }
                        : undefined,
                    inProgressDeployment: app.in_progress_deployment
                        ? {
                              id: app.in_progress_deployment.id,
                              phase: app.in_progress_deployment.phase
                          }
                        : undefined,
                    createdAt: app.created_at,
                    updatedAt: app.updated_at
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
                message: error instanceof Error ? error.message : "Failed to list apps",
                retryable: true
            }
        };
    }
}
