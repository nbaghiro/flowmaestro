import { z } from "zod";
import { toJSONSchema } from "../../../core/schema-utils";
import { TypeformClient } from "../client/TypeformClient";
import { GetFormSchema } from "../schemas";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { TypeformFormDetail } from "../types";

export const getFormSchema = GetFormSchema;

export type GetFormParams = z.infer<typeof getFormSchema>;

export const getFormOperation: OperationDefinition = {
    id: "getForm",
    name: "Get Form",
    description:
        "Get detailed information about a specific typeform including its fields, logic, and settings.",
    category: "forms",
    inputSchema: getFormSchema,
    inputSchemaJSON: toJSONSchema(getFormSchema),
    retryable: true,
    timeout: 30000
};

export async function executeGetForm(
    client: TypeformClient,
    params: GetFormParams
): Promise<OperationResult> {
    try {
        const form = (await client.getForm(params.formId)) as TypeformFormDetail;

        return {
            success: true,
            data: {
                id: form.id,
                title: form.title,
                type: form.type,
                lastUpdatedAt: form.last_updated_at,
                createdAt: form.created_at,
                workspaceHref: form.workspace?.href,
                displayLink: form._links?.display,
                settings: form.settings,
                welcomeScreens: form.welcome_screens?.map((screen) => ({
                    ref: screen.ref,
                    title: screen.title,
                    buttonText: screen.properties?.button_text,
                    description: screen.properties?.description
                })),
                thankYouScreens: form.thankyou_screens?.map((screen) => ({
                    ref: screen.ref,
                    title: screen.title,
                    buttonText: screen.properties?.button_text,
                    redirectUrl: screen.properties?.redirect_url
                })),
                fields: form.fields?.map((field) => ({
                    id: field.id,
                    ref: field.ref,
                    title: field.title,
                    type: field.type,
                    required: field.validations?.required,
                    properties: field.properties
                })),
                fieldCount: form.fields?.length || 0,
                hasLogic: (form.logic?.length || 0) > 0,
                variables: form.variables
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get form";

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
