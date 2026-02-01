import { z } from "zod";
import type { VercelDeploymentOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { VercelClient } from "../client/VercelClient";

export const listDeploymentsSchema = z.object({
    projectId: z.string().optional().describe("Filter deployments by project ID"),
    limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Maximum number of deployments to return (1-100)"),
    target: z.enum(["production", "staging"]).optional().describe("Filter by deployment target")
});

export type ListDeploymentsParams = z.infer<typeof listDeploymentsSchema>;

export const listDeploymentsOperation: OperationDefinition = {
    id: "listDeployments",
    name: "List Deployments",
    description: "List deployments for a Vercel project or all projects",
    category: "deployments",
    inputSchema: listDeploymentsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListDeployments(
    client: VercelClient,
    params: ListDeploymentsParams
): Promise<OperationResult> {
    try {
        const deployments = await client.listDeployments({
            projectId: params.projectId,
            limit: params.limit,
            target: params.target
        });

        const formattedDeployments: VercelDeploymentOutput[] = deployments.map((d) => ({
            uid: d.uid,
            name: d.name,
            url: d.url,
            state: d.state,
            target: d.target || undefined,
            created: d.created,
            ready: d.ready,
            creator: {
                uid: d.creator.uid,
                email: d.creator.email,
                username: d.creator.username
            },
            inspectorUrl: d.inspectorUrl
        }));

        return {
            success: true,
            data: {
                deployments: formattedDeployments,
                count: formattedDeployments.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list deployments",
                retryable: true
            }
        };
    }
}
