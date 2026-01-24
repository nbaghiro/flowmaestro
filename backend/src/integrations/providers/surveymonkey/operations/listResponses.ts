import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { SurveyMonkeyClient } from "../client/SurveyMonkeyClient";
import { ListResponsesSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const listResponsesSchema = ListResponsesSchema;

export type ListResponsesParams = z.infer<typeof listResponsesSchema>;

export const listResponsesOperation: OperationDefinition = {
    id: "listResponses",
    name: "List Responses",
    description:
        "List responses (submissions) for a specific survey. Supports filtering by date range and completion status. Returns response metadata without full answer details.",
    category: "responses",
    inputSchema: listResponsesSchema,
    inputSchemaJSON: toJSONSchema(listResponsesSchema),
    retryable: true,
    timeout: 60000 // Responses can be large
};

export async function executeListResponses(
    client: SurveyMonkeyClient,
    params: ListResponsesParams
): Promise<OperationResult> {
    try {
        const response = await client.listResponses(params.surveyId, {
            page: params.page,
            perPage: params.perPage,
            startCreatedAt: params.startCreatedAt,
            endCreatedAt: params.endCreatedAt,
            status: params.status
        });

        return {
            success: true,
            data: {
                total: response.total,
                page: response.page,
                perPage: response.per_page,
                responses: response.data.map((item) => ({
                    id: item.id,
                    surveyId: item.survey_id,
                    collectorId: item.collector_id,
                    recipientId: item.recipient_id,
                    totalTime: item.total_time,
                    status: item.response_status,
                    dateCreated: item.date_created,
                    dateModified: item.date_modified,
                    editUrl: item.edit_url,
                    analyzeUrl: item.analyze_url,
                    ipAddress: item.ip_address,
                    customVariables: item.custom_variables,
                    collectionMode: item.collection_mode
                }))
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to list responses";

        if (message.includes("not found")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `Survey with ID "${params.surveyId}" not found`,
                    retryable: false
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message,
                retryable: true
            }
        };
    }
}
