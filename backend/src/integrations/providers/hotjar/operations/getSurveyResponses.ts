import { z } from "zod";
import { HotjarClient } from "../client/HotjarClient";
import {
    HotjarSiteIdSchema,
    HotjarSurveyIdSchema,
    HotjarLimitSchema,
    HotjarCursorSchema
} from "../schemas";
import type { HotjarSurveyResponse, HotjarPaginatedResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

/**
 * Get Survey Responses operation schema
 */
export const getSurveyResponsesSchema = z.object({
    site_id: HotjarSiteIdSchema,
    survey_id: HotjarSurveyIdSchema,
    limit: HotjarLimitSchema,
    cursor: HotjarCursorSchema
});

export type GetSurveyResponsesParams = z.infer<typeof getSurveyResponsesSchema>;

/**
 * Get Survey Responses operation definition
 */
export const getSurveyResponsesOperation: OperationDefinition = {
    id: "getSurveyResponses",
    name: "Get Survey Responses",
    description: "Get responses for a specific Hotjar survey",
    category: "data",
    actionType: "read",
    inputSchema: getSurveyResponsesSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute get survey responses operation
 */
export async function executeGetSurveyResponses(
    client: HotjarClient,
    params: GetSurveyResponsesParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {};
        if (params.limit !== undefined) {
            queryParams.limit = params.limit;
        }
        if (params.cursor !== undefined) {
            queryParams.cursor = params.cursor;
        }

        const response = await client.get<HotjarPaginatedResponse<HotjarSurveyResponse>>(
            `/v1/sites/${params.site_id}/surveys/${params.survey_id}/responses`,
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
                message: error instanceof Error ? error.message : "Failed to get survey responses",
                retryable: true
            }
        };
    }
}
