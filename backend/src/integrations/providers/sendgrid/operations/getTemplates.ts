import { z } from "zod";
import type { SendGridTemplateOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SendGridClient } from "../client/SendGridClient";

export const getTemplatesSchema = z.object({
    generations: z
        .enum(["legacy", "dynamic", "legacy,dynamic"])
        .optional()
        .describe("Filter by template generation type"),
    pageSize: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .describe("Number of templates per page (max 200)"),
    pageToken: z.string().optional().describe("Page token for pagination")
});

export type GetTemplatesParams = z.infer<typeof getTemplatesSchema>;

export const getTemplatesOperation: OperationDefinition = {
    id: "getTemplates",
    name: "Get Templates",
    description: "Get all email templates from SendGrid",
    category: "templates",
    inputSchema: getTemplatesSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetTemplates(
    client: SendGridClient,
    params: GetTemplatesParams
): Promise<OperationResult> {
    try {
        const response = await client.getTemplates({
            generations: params.generations,
            page_size: params.pageSize,
            page_token: params.pageToken
        });

        const templates: SendGridTemplateOutput[] = response.result.map((t) => ({
            id: t.id,
            name: t.name,
            generation: t.generation,
            updatedAt: t.updated_at,
            versions: t.versions?.map((v) => ({
                id: v.id,
                name: v.name,
                active: v.active === 1,
                updatedAt: v.updated_at
            }))
        }));

        // Extract next page token from metadata
        let nextPageToken: string | undefined;
        if (response._metadata?.next) {
            const url = new URL(response._metadata.next, "https://api.sendgrid.com");
            nextPageToken = url.searchParams.get("page_token") || undefined;
        }

        return {
            success: true,
            data: {
                templates,
                totalCount: response._metadata?.count,
                nextPageToken,
                hasMore: !!response._metadata?.next
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get templates",
                retryable: true
            }
        };
    }
}
