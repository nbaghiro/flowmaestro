import { z } from "zod";
import type { HubspotMarketingFormSubmissionOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { HubspotMarketingClient } from "../client/HubspotMarketingClient";

export const getFormSubmissionsSchema = z.object({
    formId: z.string().describe("The ID of the form to get submissions for"),
    limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe("Number of submissions to return (max 50)"),
    after: z.string().optional().describe("Pagination cursor from previous response")
});

export type GetFormSubmissionsParams = z.infer<typeof getFormSubmissionsSchema>;

export const getFormSubmissionsOperation: OperationDefinition = {
    id: "getFormSubmissions",
    name: "Get Form Submissions",
    description: "Get submissions for a specific form from HubSpot Marketing",
    category: "forms",
    inputSchema: getFormSubmissionsSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetFormSubmissions(
    client: HubspotMarketingClient,
    params: GetFormSubmissionsParams
): Promise<OperationResult> {
    try {
        const response = await client.getFormSubmissions(params.formId, {
            limit: params.limit,
            after: params.after
        });

        const submissions: HubspotMarketingFormSubmissionOutput[] = response.results.map(
            (submission) => ({
                submittedAt: new Date(submission.submittedAt).toISOString(),
                values: Object.fromEntries(submission.values.map((v) => [v.name, v.value])),
                pageUrl: submission.pageUrl,
                pageName: submission.pageName
            })
        );

        return {
            success: true,
            data: {
                submissions,
                hasMore: !!response.paging?.next?.after,
                nextCursor: response.paging?.next?.after
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get form submissions";
        return {
            success: false,
            error: {
                type: message.includes("not found") ? "not_found" : "server_error",
                message,
                retryable: !message.includes("not found")
            }
        };
    }
}
