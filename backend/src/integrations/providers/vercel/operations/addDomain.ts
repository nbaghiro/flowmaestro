import { z } from "zod";
import type { VercelDomainOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { VercelClient } from "../client/VercelClient";

export const addDomainSchema = z.object({
    projectId: z.string().min(1).describe("Project ID or name"),
    name: z
        .string()
        .min(1)
        .describe("Domain name to add (e.g., 'example.com' or 'www.example.com')"),
    redirect: z.string().optional().describe("Redirect target domain"),
    redirectStatusCode: z
        .enum(["301", "302", "307", "308"])
        .optional()
        .describe("HTTP redirect status code"),
    gitBranch: z
        .string()
        .optional()
        .describe("Git branch for this domain (for preview deployments)")
});

export type AddDomainParams = z.infer<typeof addDomainSchema>;

export const addDomainOperation: OperationDefinition = {
    id: "addDomain",
    name: "Add Domain",
    description: "Add a custom domain to a Vercel project",
    category: "domains",
    actionType: "write",
    inputSchema: addDomainSchema,
    retryable: false,
    timeout: 30000
};

export async function executeAddDomain(
    client: VercelClient,
    params: AddDomainParams
): Promise<OperationResult> {
    try {
        const domain = await client.addDomain(params.projectId, {
            name: params.name,
            redirect: params.redirect,
            redirectStatusCode: params.redirectStatusCode
                ? (parseInt(params.redirectStatusCode) as 301 | 302 | 307 | 308)
                : undefined,
            gitBranch: params.gitBranch
        });

        const formattedDomain: VercelDomainOutput = {
            name: domain.name,
            apexName: domain.apexName,
            verified: domain.verified,
            createdAt: domain.createdAt,
            gitBranch: domain.gitBranch,
            redirect: domain.redirect
        };

        return {
            success: true,
            data: {
                domain: formattedDomain,
                message: `Domain ${domain.name} added successfully`
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to add domain",
                retryable: false
            }
        };
    }
}
