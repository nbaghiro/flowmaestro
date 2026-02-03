import { z } from "zod";
import { AppIdSchema } from "../types";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { DigitalOceanClient } from "../../client/DigitalOceanClient";

/**
 * Get App operation schema
 */
export const getAppSchema = z.object({
    appId: AppIdSchema
});

export type GetAppParams = z.infer<typeof getAppSchema>;

/**
 * Get App operation definition
 */
export const getAppOperation: OperationDefinition = {
    id: "apps_getApp",
    name: "Get App",
    description: "Get details for a specific App Platform app",
    category: "apps",
    inputSchema: getAppSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute get app operation
 */
export async function executeGetApp(
    client: DigitalOceanClient,
    params: GetAppParams
): Promise<OperationResult> {
    try {
        const app = await client.getApp(params.appId);

        return {
            success: true,
            data: {
                id: app.id,
                ownerUuid: app.owner_uuid,
                spec: {
                    name: app.spec.name,
                    region: app.spec.region,
                    services: app.spec.services?.map((s) => ({
                        name: s.name,
                        github: s.github,
                        gitlab: s.gitlab,
                        instanceCount: s.instance_count,
                        instanceSizeSlug: s.instance_size_slug,
                        httpPort: s.http_port
                    })),
                    staticSites: app.spec.static_sites?.map((s) => ({
                        name: s.name,
                        github: s.github,
                        gitlab: s.gitlab,
                        buildCommand: s.build_command,
                        outputDir: s.output_dir
                    })),
                    workers: app.spec.workers?.map((w) => ({
                        name: w.name,
                        github: w.github,
                        gitlab: w.gitlab,
                        instanceCount: w.instance_count,
                        instanceSizeSlug: w.instance_size_slug
                    })),
                    databases: app.spec.databases?.map((d) => ({
                        name: d.name,
                        engine: d.engine
                    }))
                },
                region: app.region,
                tierSlug: app.tier_slug,
                defaultIngress: app.default_ingress,
                liveUrl: app.live_url,
                liveDomain: app.live_domain,
                activeDeployment: app.active_deployment
                    ? {
                          id: app.active_deployment.id,
                          phase: app.active_deployment.phase,
                          progress: app.active_deployment.progress,
                          createdAt: app.active_deployment.created_at
                      }
                    : undefined,
                inProgressDeployment: app.in_progress_deployment
                    ? {
                          id: app.in_progress_deployment.id,
                          phase: app.in_progress_deployment.phase,
                          progress: app.in_progress_deployment.progress
                      }
                    : undefined,
                lastDeploymentCreatedAt: app.last_deployment_created_at,
                createdAt: app.created_at,
                updatedAt: app.updated_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get app",
                retryable: true
            }
        };
    }
}
