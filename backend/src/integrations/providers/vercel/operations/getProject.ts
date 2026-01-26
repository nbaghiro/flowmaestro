import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { VercelProjectOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { VercelClient } from "../client/VercelClient";

export const getProjectSchema = z.object({
    projectId: z.string().min(1).describe("Project ID or name")
});

export type GetProjectParams = z.infer<typeof getProjectSchema>;

export const getProjectOperation: OperationDefinition = {
    id: "getProject",
    name: "Get Project",
    description: "Get details of a specific Vercel project by ID or name",
    category: "projects",
    inputSchema: getProjectSchema,
    inputSchemaJSON: toJSONSchema(getProjectSchema),
    retryable: true,
    timeout: 30000
};

export async function executeGetProject(
    client: VercelClient,
    params: GetProjectParams
): Promise<OperationResult> {
    try {
        const project = await client.getProject(params.projectId);

        const formattedProject: VercelProjectOutput = {
            id: project.id,
            name: project.name,
            framework: project.framework,
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
            link: project.link
                ? {
                      type: project.link.type,
                      repo: project.link.repo,
                      org: project.link.org
                  }
                : undefined
        };

        return {
            success: true,
            data: {
                project: formattedProject
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get project",
                retryable: true
            }
        };
    }
}
