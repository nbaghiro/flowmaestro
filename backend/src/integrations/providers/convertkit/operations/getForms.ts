import { z } from "zod";
import type { ConvertKitFormOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ConvertKitClient } from "../client/ConvertKitClient";

export const getFormsSchema = z.object({});

export type GetFormsParams = z.infer<typeof getFormsSchema>;

export const getFormsOperation: OperationDefinition = {
    id: "getForms",
    name: "Get Forms",
    description: "Retrieve all forms from ConvertKit",
    category: "forms",
    inputSchema: getFormsSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetForms(
    client: ConvertKitClient,
    _params: GetFormsParams
): Promise<OperationResult> {
    try {
        const response = await client.getForms();

        const forms: ConvertKitFormOutput[] = response.forms.map((form) => ({
            id: String(form.id),
            name: form.name,
            type: form.type,
            format: form.format,
            embedJs: form.embed_js,
            embedUrl: form.embed_url,
            archived: form.archived,
            uid: form.uid
        }));

        return {
            success: true,
            data: {
                forms,
                total: forms.length
            }
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to get forms";
        return {
            success: false,
            error: {
                type: message.includes("rate limit") ? "rate_limit" : "server_error",
                message,
                retryable: message.includes("rate limit")
            }
        };
    }
}
