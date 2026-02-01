import { z } from "zod";
import type { VercelProjectOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { VercelClient } from "../client/VercelClient";

export const listProjectsSchema = z.object({
    limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Maximum number of projects to return (1-100)")
});

export type ListProjectsParams = z.infer<typeof listProjectsSchema>;

export const listProjectsOperation: OperationDefinition = {
    id: "listProjects",
    name: "List Projects",
    description: "List all Vercel projects accessible to the authenticated user or team",
    category: "projects",
    inputSchema: listProjectsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListProjects(
    client: VercelClient,
    params: ListProjectsParams
): Promise<OperationResult> {
    try {
        const projects = await client.listProjects({ limit: params.limit });

        const formattedProjects: VercelProjectOutput[] = projects.map((p) => ({
            id: p.id,
            name: p.name,
            framework: p.framework,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            link: p.link
                ? {
                      type: p.link.type,
                      repo: p.link.repo,
                      org: p.link.org
                  }
                : undefined
        }));

        return {
            success: true,
            data: {
                projects: formattedProjects,
                count: formattedProjects.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list projects",
                retryable: true
            }
        };
    }
}
