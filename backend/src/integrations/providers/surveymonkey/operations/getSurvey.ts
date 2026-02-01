import { z } from "zod";
import { SurveyMonkeyClient } from "../client/SurveyMonkeyClient";
import { GetSurveySchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const getSurveySchema = GetSurveySchema;

export type GetSurveyParams = z.infer<typeof getSurveySchema>;

export const getSurveyOperation: OperationDefinition = {
    id: "getSurvey",
    name: "Get Survey",
    description: "Get a specific survey by ID. Returns basic survey metadata without questions.",
    category: "surveys",
    inputSchema: getSurveySchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetSurvey(
    client: SurveyMonkeyClient,
    params: GetSurveyParams
): Promise<OperationResult> {
    try {
        const survey = await client.getSurvey(params.surveyId);

        return {
            success: true,
            data: {
                id: survey.id,
                title: survey.title,
                nickname: survey.nickname,
                language: survey.language,
                questionCount: survey.question_count,
                pageCount: survey.page_count,
                responseCount: survey.response_count,
                dateCreated: survey.date_created,
                dateModified: survey.date_modified,
                previewUrl: survey.preview_url,
                collectUrl: survey.collect_url,
                analyzeUrl: survey.analyze_url,
                editUrl: survey.edit_url,
                summaryUrl: survey.summary_url,
                folderId: survey.folder_id,
                customVariables: survey.custom_variables
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get survey";

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
