import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { SurveyMonkeyClient } from "../client/SurveyMonkeyClient";
import { GetSurveyDetailsSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SurveyMonkeyPage, SurveyMonkeyQuestion } from "../types";

export const getSurveyDetailsSchema = GetSurveyDetailsSchema;

export type GetSurveyDetailsParams = z.infer<typeof getSurveyDetailsSchema>;

export const getSurveyDetailsOperation: OperationDefinition = {
    id: "getSurveyDetails",
    name: "Get Survey Details",
    description:
        "Get full survey details including all pages and questions. Returns the complete survey structure.",
    category: "surveys",
    inputSchema: getSurveyDetailsSchema,
    inputSchemaJSON: toJSONSchema(getSurveyDetailsSchema),
    retryable: true,
    timeout: 60000 // Survey details can be large
};

export async function executeGetSurveyDetails(
    client: SurveyMonkeyClient,
    params: GetSurveyDetailsParams
): Promise<OperationResult> {
    try {
        const survey = await client.getSurveyDetails(params.surveyId);

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
                pages: survey.pages?.map((page) => mapPage(page))
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get survey details";

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

/**
 * Map a SurveyMonkey page to a simplified structure
 */
function mapPage(page: SurveyMonkeyPage) {
    return {
        id: page.id,
        title: page.title,
        description: page.description,
        position: page.position,
        questionCount: page.question_count,
        questions: page.questions?.map((q) => mapQuestion(q))
    };
}

/**
 * Map a SurveyMonkey question to a simplified structure
 */
function mapQuestion(question: SurveyMonkeyQuestion) {
    const heading = question.headings?.[0]?.heading || "";

    return {
        id: question.id,
        family: question.family,
        subtype: question.subtype,
        heading,
        position: question.position,
        required: question.required !== null,
        choices: question.answers?.choices?.map((c) => ({
            id: c.id,
            text: c.text,
            position: c.position
        })),
        rows: question.answers?.rows?.map((r) => ({
            id: r.id,
            text: r.text,
            position: r.position
        })),
        columns: question.answers?.cols?.map((c) => ({
            id: c.id,
            text: c.text,
            position: c.position
        }))
    };
}
