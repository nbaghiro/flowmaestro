import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SentryClient } from "../client/SentryClient";

export const createReleaseSchema = z.object({
    organizationSlug: z.string().min(1).describe("Organization identifier"),
    version: z.string().min(1).describe("Release version (e.g., '1.0.0')"),
    projects: z.array(z.string()).min(1).describe("Projects to associate"),
    dateReleased: z.string().optional().describe("ISO 8601 timestamp"),
    ref: z.string().optional().describe("Git ref (commit SHA or branch)"),
    url: z.string().url().optional().describe("URL to release")
});

export type CreateReleaseParams = z.infer<typeof createReleaseSchema>;

export const createReleaseOperation: OperationDefinition = {
    id: "createRelease",
    name: "Create Release",
    description: "Create a new release in Sentry",
    category: "releases",
    inputSchema: createReleaseSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCreateRelease(
    client: SentryClient,
    params: CreateReleaseParams
): Promise<OperationResult> {
    try {
        const release = await client.createRelease(params.organizationSlug, {
            version: params.version,
            projects: params.projects,
            dateReleased: params.dateReleased,
            ref: params.ref,
            url: params.url
        });

        return {
            success: true,
            data: {
                version: release.version,
                shortVersion: release.shortVersion,
                ref: release.ref,
                url: release.url,
                dateCreated: release.dateCreated,
                dateReleased: release.dateReleased,
                projects: release.projects
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create release",
                retryable: false
            }
        };
    }
}
