import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { TypeformClient } from "../client/TypeformClient";
import { ListResponsesSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { TypeformResponsesResponse } from "../types";

export const listResponsesSchema = ListResponsesSchema;

export type ListResponsesParams = z.infer<typeof listResponsesSchema>;

export const listResponsesOperation: OperationDefinition = {
    id: "listResponses",
    name: "List Responses",
    description:
        "Get responses (submissions) for a specific typeform. Supports filtering by date range, completion status, and pagination.",
    category: "responses",
    inputSchema: listResponsesSchema,
    inputSchemaJSON: toJSONSchema(listResponsesSchema),
    retryable: true,
    timeout: 60000 // Responses can be large, allow more time
};

export async function executeListResponses(
    client: TypeformClient,
    params: ListResponsesParams
): Promise<OperationResult> {
    try {
        const response = (await client.listResponses(params.formId, {
            pageSize: params.pageSize,
            since: params.since,
            until: params.until,
            after: params.after,
            before: params.before,
            includedResponseIds: params.includedResponseIds,
            completed: params.completed,
            sort: params.sort,
            query: params.query,
            fields: params.fields
        })) as TypeformResponsesResponse;

        return {
            success: true,
            data: {
                totalItems: response.total_items,
                pageCount: response.page_count,
                responses: response.items.map((item) => ({
                    landingId: item.landing_id,
                    token: item.token,
                    responseId: item.response_id,
                    landedAt: item.landed_at,
                    submittedAt: item.submitted_at,
                    isCompleted: !!item.submitted_at,
                    metadata: item.metadata
                        ? {
                              userAgent: item.metadata.user_agent,
                              platform: item.metadata.platform,
                              referer: item.metadata.referer,
                              browser: item.metadata.browser
                          }
                        : undefined,
                    hiddenFields: item.hidden,
                    calculatedScore: item.calculated?.score,
                    answers: item.answers?.map((answer) => ({
                        fieldId: answer.field.id,
                        fieldType: answer.field.type,
                        fieldRef: answer.field.ref,
                        answerType: answer.type,
                        value: extractAnswerValue(answer)
                    }))
                }))
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to list responses";

        // Check for 404
        if (message.includes("not found")) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `Form with ID "${params.formId}" not found`,
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
 * Extract the actual value from a Typeform answer based on its type
 */
function extractAnswerValue(answer: {
    type: string;
    text?: string;
    email?: string;
    phone_number?: string;
    number?: number;
    boolean?: boolean;
    date?: string;
    url?: string;
    file_url?: string;
    choice?: { id?: string; label?: string; ref?: string };
    choices?: { ids?: string[]; labels?: string[]; refs?: string[] };
    payment?: { amount?: string; last4?: string; name?: string; success?: boolean };
}): unknown {
    switch (answer.type) {
        case "text":
            return answer.text;
        case "email":
            return answer.email;
        case "phone_number":
            return answer.phone_number;
        case "number":
            return answer.number;
        case "boolean":
            return answer.boolean;
        case "date":
            return answer.date;
        case "url":
            return answer.url;
        case "file_url":
            return answer.file_url;
        case "choice":
            return answer.choice?.label || answer.choice?.id;
        case "choices":
            return answer.choices?.labels || answer.choices?.ids;
        case "payment":
            return {
                amount: answer.payment?.amount,
                last4: answer.payment?.last4,
                name: answer.payment?.name,
                success: answer.payment?.success
            };
        default:
            return null;
    }
}
