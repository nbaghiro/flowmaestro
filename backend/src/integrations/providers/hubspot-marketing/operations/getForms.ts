import { z } from "zod";
import type { HubspotMarketingFormOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { HubspotMarketingClient } from "../client/HubspotMarketingClient";

export const getFormsSchema = z.object({
    limit: z.number().min(1).max(100).optional().describe("Number of forms to return (max 100)"),
    offset: z.number().min(0).optional().describe("Number of forms to skip"),
    formTypes: z
        .array(z.string())
        .optional()
        .describe("Filter by form types (e.g., 'HUBSPOT', 'CAPTURED', 'FLOW')")
});

export type GetFormsParams = z.infer<typeof getFormsSchema>;

export const getFormsOperation: OperationDefinition = {
    id: "getForms",
    name: "Get Forms",
    description: "Get all forms from HubSpot Marketing",
    category: "forms",
    inputSchema: getFormsSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetForms(
    client: HubspotMarketingClient,
    params: GetFormsParams
): Promise<OperationResult> {
    try {
        const forms = await client.getForms({
            limit: params.limit,
            offset: params.offset,
            formTypes: params.formTypes
        });

        const output: HubspotMarketingFormOutput[] = forms.map((form) => ({
            id: form.guid,
            name: form.name,
            formType: form.formType,
            submitText: form.submitText,
            createdAt: new Date(form.createdAt).toISOString(),
            updatedAt: new Date(form.updatedAt).toISOString(),
            fields:
                form.formFieldGroups?.flatMap((group) =>
                    group.fields.map((field) => ({
                        name: field.name,
                        label: field.label,
                        type: field.type,
                        required: field.required
                    }))
                ) || []
        }));

        return {
            success: true,
            data: {
                forms: output,
                totalItems: output.length
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get forms",
                retryable: true
            }
        };
    }
}
