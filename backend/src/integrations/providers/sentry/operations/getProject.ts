import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SentryClient } from "../client/SentryClient";

export const getProjectSchema = z.object({
    organizationSlug: z.string().min(1).describe("Organization identifier"),
    projectSlug: z.string().min(1).describe("Project identifier")
});

export type GetProjectParams = z.infer<typeof getProjectSchema>;

export const getProjectOperation: OperationDefinition = {
    id: "getProject",
    name: "Get Project",
    description: "Get details of a specific project",
    category: "projects",
    inputSchema: getProjectSchema,
    inputSchemaJSON: toJSONSchema(getProjectSchema),
    retryable: true,
    timeout: 30000
};

export async function executeGetProject(
    client: SentryClient,
    params: GetProjectParams
): Promise<OperationResult> {
    try {
        const project = await client.getProject(params.organizationSlug, params.projectSlug);

        return {
            success: true,
            data: {
                id: project.id,
                slug: project.slug,
                name: project.name,
                platform: project.platform,
                dateCreated: project.dateCreated,
                firstEvent: project.firstEvent,
                hasSessions: project.hasSessions,
                hasProfiles: project.hasProfiles,
                hasReplays: project.hasReplays,
                hasMonitors: project.hasMonitors,
                organization: project.organization
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
