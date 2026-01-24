import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { SurveyMonkeyClient } from "../client/SurveyMonkeyClient";
import { ListCollectorsSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const listCollectorsSchema = ListCollectorsSchema;

export type ListCollectorsParams = z.infer<typeof listCollectorsSchema>;

export const listCollectorsOperation: OperationDefinition = {
    id: "listCollectors",
    name: "List Collectors",
    description:
        "List collectors (distribution channels) for a specific survey. Collectors are how surveys are distributed, such as web links, email invitations, or embedded surveys.",
    category: "collectors",
    inputSchema: listCollectorsSchema,
    inputSchemaJSON: toJSONSchema(listCollectorsSchema),
    retryable: true,
    timeout: 30000
};

export async function executeListCollectors(
    client: SurveyMonkeyClient,
    params: ListCollectorsParams
): Promise<OperationResult> {
    try {
        const response = await client.listCollectors(params.surveyId, {
            page: params.page,
            perPage: params.perPage
        });

        return {
            success: true,
            data: {
                total: response.total,
                page: response.page,
                perPage: response.per_page,
                collectors: response.data.map((collector) => ({
                    id: collector.id,
                    name: collector.name,
                    type: collector.type,
                    status: collector.status,
                    dateCreated: collector.date_created,
                    dateModified: collector.date_modified,
                    responseCount: collector.response_count,
                    url: collector.url,
                    editUrl: collector.edit_url,
                    redirectType: collector.redirect_type,
                    redirectUrl: collector.redirect_url,
                    thankYouMessage: collector.thank_you_message,
                    allowMultipleResponses: collector.allow_multiple_responses,
                    anonymousType: collector.anonymous_type,
                    passwordEnabled: collector.password_enabled,
                    displaySurveyResults: collector.display_survey_results,
                    closeDate: collector.close_date,
                    responseLimit: collector.response_limit
                }))
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to list collectors";

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
