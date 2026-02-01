import { z } from "zod";
import type { SendGridTemplateOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SendGridClient } from "../client/SendGridClient";

export const getTemplateSchema = z.object({
    templateId: z.string().min(1).describe("The unique ID of the template")
});

export type GetTemplateParams = z.infer<typeof getTemplateSchema>;

export const getTemplateOperation: OperationDefinition = {
    id: "getTemplate",
    name: "Get Template",
    description: "Get a single email template by ID from SendGrid",
    category: "templates",
    inputSchema: getTemplateSchema,
    retryable: true,
    timeout: 10000
};

export async function executeGetTemplate(
    client: SendGridClient,
    params: GetTemplateParams
): Promise<OperationResult> {
    try {
        const template = await client.getTemplate(params.templateId);

        const output: SendGridTemplateOutput = {
            id: template.id,
            name: template.name,
            generation: template.generation,
            updatedAt: template.updated_at,
            versions: template.versions?.map((v) => ({
                id: v.id,
                name: v.name,
                active: v.active === 1,
                updatedAt: v.updated_at
            }))
        };

        return {
            success: true,
            data: output
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get template",
                retryable: true
            }
        };
    }
}
