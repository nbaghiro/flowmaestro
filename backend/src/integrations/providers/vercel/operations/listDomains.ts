import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import type { VercelDomainOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { VercelClient } from "../client/VercelClient";

export const listDomainsSchema = z.object({
    projectId: z.string().min(1).describe("Project ID or name"),
    limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Maximum number of domains to return (1-100)")
});

export type ListDomainsParams = z.infer<typeof listDomainsSchema>;

export const listDomainsOperation: OperationDefinition = {
    id: "listDomains",
    name: "List Domains",
    description: "List all domains configured for a Vercel project",
    category: "domains",
    inputSchema: listDomainsSchema,
    inputSchemaJSON: toJSONSchema(listDomainsSchema),
    retryable: true,
    timeout: 30000
};

export async function executeListDomains(
    client: VercelClient,
    params: ListDomainsParams
): Promise<OperationResult> {
    try {
        const domains = await client.listDomains(params.projectId, { limit: params.limit });

        const formattedDomains: VercelDomainOutput[] = domains.map((d) => ({
            name: d.name,
            apexName: d.apexName,
            verified: d.verified,
            createdAt: d.createdAt,
            gitBranch: d.gitBranch,
            redirect: d.redirect
        }));

        return {
            success: true,
            data: {
                domains: formattedDomains,
                count: formattedDomains.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list domains",
                retryable: true
            }
        };
    }
}
