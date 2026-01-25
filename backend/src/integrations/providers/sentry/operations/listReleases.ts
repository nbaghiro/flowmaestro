import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { SentryReleaseOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SentryClient } from "../client/SentryClient";

export const listReleasesSchema = z.object({
    organizationSlug: z.string().min(1).describe("Organization identifier"),
    projectSlug: z.string().optional().describe("Optional project filter"),
    query: z.string().optional().describe("Search query")
});

export type ListReleasesParams = z.infer<typeof listReleasesSchema>;

export const listReleasesOperation: OperationDefinition = {
    id: "listReleases",
    name: "List Releases",
    description: "List releases for an organization",
    category: "releases",
    inputSchema: listReleasesSchema,
    inputSchemaJSON: toJSONSchema(listReleasesSchema),
    retryable: true,
    timeout: 30000
};

export async function executeListReleases(
    client: SentryClient,
    params: ListReleasesParams
): Promise<OperationResult> {
    try {
        const releases = await client.listReleases(params.organizationSlug, {
            projectSlug: params.projectSlug,
            query: params.query
        });

        const formattedReleases: SentryReleaseOutput[] = releases.map((r) => ({
            version: r.version,
            shortVersion: r.shortVersion,
            ref: r.ref,
            url: r.url,
            dateCreated: r.dateCreated,
            dateReleased: r.dateReleased,
            projects: r.projects
        }));

        return {
            success: true,
            data: {
                releases: formattedReleases,
                count: formattedReleases.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list releases",
                retryable: true
            }
        };
    }
}
