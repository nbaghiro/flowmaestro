import { z } from "zod";
import { HotjarClient } from "../client/HotjarClient";
import { HotjarSiteIdSchema } from "../schemas";
import type { HotjarSurvey, HotjarPaginatedResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * List Surveys operation schema
 */
export const listSurveysSchema = z.object({
    site_id: HotjarSiteIdSchema,
    with_questions: z.boolean().optional().describe("Include survey questions in the response")
});

export type ListSurveysParams = z.infer<typeof listSurveysSchema>;

/**
 * List Surveys operation definition
 */
export const listSurveysOperation: OperationDefinition = {
    id: "listSurveys",
    name: "List Surveys",
    description: "List all surveys for a Hotjar site",
    category: "data",
    actionType: "read",
    inputSchema: listSurveysSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list surveys operation
 */
export async function executeListSurveys(
    client: HotjarClient,
    params: ListSurveysParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};
        if (params.with_questions !== undefined) {
            queryParams.with_questions = params.with_questions;
        }

        const response = await client.get<HotjarPaginatedResponse<HotjarSurvey>>(
            `/v1/sites/${params.site_id}/surveys`,
            queryParams
        );

        return {
            success: true,
            data: {
                results: response.results,
                next_cursor: response.next_cursor
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list surveys",
                retryable: true
            }
        };
    }
}
