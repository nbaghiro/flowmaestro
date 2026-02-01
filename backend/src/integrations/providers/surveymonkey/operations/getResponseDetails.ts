import { z } from "zod";
import { SurveyMonkeyClient } from "../client/SurveyMonkeyClient";
import { GetResponseDetailsSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SurveyMonkeyResponsePage, SurveyMonkeyResponseQuestion } from "../types";

export const getResponseDetailsSchema = GetResponseDetailsSchema;

export type GetResponseDetailsParams = z.infer<typeof getResponseDetailsSchema>;

export const getResponseDetailsOperation: OperationDefinition = {
    id: "getResponseDetails",
    name: "Get Response Details",
    description:
        "Get full response details with all answers. Note: This operation requires the responses_read_detail scope, which requires a paid SurveyMonkey plan.",
    category: "responses",
    inputSchema: getResponseDetailsSchema,
    retryable: true,
    timeout: 60000
};

export async function executeGetResponseDetails(
    client: SurveyMonkeyClient,
    params: GetResponseDetailsParams
): Promise<OperationResult> {
    try {
        const response = await client.getResponseDetails(params.surveyId, params.responseId);

        return {
            success: true,
            data: {
                id: response.id,
                surveyId: response.survey_id,
                collectorId: response.collector_id,
                recipientId: response.recipient_id,
                totalTime: response.total_time,
                status: response.response_status,
                dateCreated: response.date_created,
                dateModified: response.date_modified,
                editUrl: response.edit_url,
                analyzeUrl: response.analyze_url,
                ipAddress: response.ip_address,
                customVariables: response.custom_variables,
                collectionMode: response.collection_mode,
                pages: response.pages?.map((page) => mapResponsePage(page))
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get response details";

        if (message.includes("not found")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `Response with ID "${params.responseId}" not found in survey "${params.surveyId}"`,
                    retryable: false
                }
            };
        }

        // Handle permission errors for paid features
        if (message.includes("permission") || message.includes("paid")) {
            return {
                success: false,
                error: {
                    type: "permission",
                    message:
                        "Getting response details requires a paid SurveyMonkey plan. " +
                        "Please upgrade your account or use listResponses for basic response info.",
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

/**
 * Map a response page to a simplified structure
 */
function mapResponsePage(page: SurveyMonkeyResponsePage) {
    return {
        id: page.id,
        questions: page.questions?.map((q) => mapResponseQuestion(q))
    };
}

/**
 * Map a response question to a simplified structure
 */
function mapResponseQuestion(question: SurveyMonkeyResponseQuestion) {
    return {
        id: question.id,
        variableId: question.variable_id,
        answers: question.answers?.map((a) => ({
            choiceId: a.choice_id,
            rowId: a.row_id,
            colId: a.col_id,
            otherId: a.other_id,
            text: a.text,
            tagData: a.tag_data
        }))
    };
}
