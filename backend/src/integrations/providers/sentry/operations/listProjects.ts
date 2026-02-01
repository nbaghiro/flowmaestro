import { z } from "zod";
import type { SentryProjectOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SentryClient } from "../client/SentryClient";

export const listProjectsSchema = z.object({
    organizationSlug: z.string().min(1).describe("Organization identifier"),
    cursor: z.string().optional().describe("Pagination cursor")
});

export type ListProjectsParams = z.infer<typeof listProjectsSchema>;

export const listProjectsOperation: OperationDefinition = {
    id: "listProjects",
    name: "List Projects",
    description: "List all projects in an organization",
    category: "projects",
    inputSchema: listProjectsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListProjects(
    client: SentryClient,
    params: ListProjectsParams
): Promise<OperationResult> {
    try {
        const projects = await client.listProjects(params.organizationSlug, params.cursor);

        const formattedProjects: SentryProjectOutput[] = projects.map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            platform: p.platform,
            dateCreated: p.dateCreated,
            organization: p.organization
                ? {
                      id: p.organization.id,
                      slug: p.organization.slug,
                      name: p.organization.name
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
