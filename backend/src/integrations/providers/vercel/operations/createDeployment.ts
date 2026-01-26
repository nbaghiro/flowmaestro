import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { VercelDeploymentOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { VercelClient } from "../client/VercelClient";

export const createDeploymentSchema = z.object({
    name: z.string().min(1).describe("Project name to deploy"),
    target: z.enum(["production", "staging"]).optional().describe("Deployment target environment"),
    gitSource: z
        .object({
            type: z.enum(["github", "gitlab", "bitbucket"]).describe("Git provider type"),
            ref: z.string().describe("Git branch, tag, or commit SHA"),
            repoId: z
                .union([z.string(), z.number()])
                .describe("Repository ID from the git provider")
        })
        .optional()
        .describe("Git source configuration for the deployment")
});

export type CreateDeploymentParams = z.infer<typeof createDeploymentSchema>;

export const createDeploymentOperation: OperationDefinition = {
    id: "createDeployment",
    name: "Create Deployment",
    description: "Trigger a new deployment for a Vercel project",
    category: "deployments",
    actionType: "write",
    inputSchema: createDeploymentSchema,
    inputSchemaJSON: toJSONSchema(createDeploymentSchema),
    retryable: false,
    timeout: 60000
};

export async function executeCreateDeployment(
    client: VercelClient,
    params: CreateDeploymentParams
): Promise<OperationResult> {
    try {
        const deployment = await client.createDeployment({
            name: params.name,
            target: params.target,
            gitSource: params.gitSource
                ? {
                      type: params.gitSource.type,
                      ref: params.gitSource.ref,
                      repoId: params.gitSource.repoId
                  }
                : undefined
        });

        const formattedDeployment: VercelDeploymentOutput = {
            uid: deployment.uid,
            name: deployment.name,
            url: deployment.url,
            state: deployment.state,
            target: deployment.target || undefined,
            created: deployment.created,
            ready: deployment.ready,
            creator: {
                uid: deployment.creator.uid,
                email: deployment.creator.email,
                username: deployment.creator.username
            },
            inspectorUrl: deployment.inspectorUrl
        };

        return {
            success: true,
            data: {
                deployment: formattedDeployment,
                message: `Deployment ${deployment.uid} created successfully`
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create deployment",
                retryable: false
            }
        };
    }
}
