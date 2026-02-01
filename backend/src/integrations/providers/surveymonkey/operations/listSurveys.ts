import { z } from "zod";
import { SurveyMonkeyClient } from "../client/SurveyMonkeyClient";
import { ListSurveysSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";

export const listSurveysSchema = ListSurveysSchema;

export type ListSurveysParams = z.infer<typeof listSurveysSchema>;

export const listSurveysOperation: OperationDefinition = {
    id: "listSurveys",
    name: "List Surveys",
    description:
        "List all surveys in the SurveyMonkey account. Returns survey metadata including ID, title, creation date, and response count.",
    category: "surveys",
    inputSchema: listSurveysSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListSurveys(
    client: SurveyMonkeyClient,
    params: ListSurveysParams
): Promise<OperationResult> {
    try {
        const response = await client.listSurveys({
            page: params.page,
            perPage: params.perPage
        });

        return {
            success: true,
            data: {
                total: response.total,
                page: response.page,
                perPage: response.per_page,
                surveys: response.data.map((survey) => ({
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
                    collectUrl: survey.collect_url
                }))
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
