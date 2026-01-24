import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { HelloSignClient } from "../client/HelloSignClient";
import { HelloSignTemplateIdSchema } from "../schemas";
import type { HelloSignCreateResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Template signer schema (includes role)
 */
const TemplateSignerSchema = z.object({
    email_address: z.string().email().describe("Email address of the signer"),
    name: z.string().min(1).describe("Full name of the signer"),
    role: z.string().min(1).describe("Role name as defined in the template"),
    pin: z.string().optional().describe("4-12 digit PIN for signer verification")
});

/**
 * Template CC schema
 */
const TemplateCCSchema = z.object({
    email_address: z.string().email().describe("Email address to CC"),
    role_name: z.string().min(1).describe("CC role name as defined in the template")
});

/**
 * Custom field schema
 */
const CustomFieldSchema = z.object({
    name: z.string().min(1).describe("Field name as defined in the template"),
    value: z.string().describe("Value to pre-fill in the field")
});

/**
 * Create from template operation schema
 */
export const createFromTemplateSchema = z.object({
    template_ids: z
        .array(HelloSignTemplateIdSchema)
        .min(1)
        .describe("One or more template IDs to use"),
    title: z.string().optional().describe("Override the template title"),
    subject: z.string().optional().describe("Subject line for the email"),
    message: z.string().optional().describe("Message to include in the email"),
    signers: z.array(TemplateSignerSchema).min(1).describe("Signers mapped to template roles"),
    ccs: z.array(TemplateCCSchema).optional().describe("CC recipients mapped to template roles"),
    custom_fields: z.array(CustomFieldSchema).optional().describe("Pre-filled custom field values"),
    test_mode: z.boolean().default(false).describe("Whether to create in test mode"),
    signing_redirect_url: z
        .string()
        .url()
        .optional()
        .describe("URL to redirect signers after signing"),
    metadata: z.record(z.unknown()).optional().describe("Custom metadata to attach")
});

export type CreateFromTemplateParams = z.infer<typeof createFromTemplateSchema>;

/**
 * Create from template operation definition
 */
export const createFromTemplateOperation: OperationDefinition = (() => {
    try {
        return {
            id: "createFromTemplate",
            name: "Create from Template",
            description: "Create a signature request using a pre-defined template",
            category: "signature_requests",
            inputSchema: createFromTemplateSchema,
            inputSchemaJSON: toJSONSchema(createFromTemplateSchema),
            retryable: false,
            timeout: 60000
        };
    } catch (error) {
        logger.error(
            { component: "HelloSign", err: error },
            "Failed to create createFromTemplateOperation"
        );
        throw new Error(
            `Failed to create createFromTemplate operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute create from template operation
 */
export async function executeCreateFromTemplate(
    client: HelloSignClient,
    params: CreateFromTemplateParams
): Promise<OperationResult> {
    try {
        const response = (await client.createFromTemplate({
            template_ids: params.template_ids,
            title: params.title,
            subject: params.subject,
            message: params.message,
            signers: params.signers.map((s) => ({
                email_address: s.email_address,
                name: s.name,
                role: s.role,
                pin: s.pin
            })),
            ccs: params.ccs?.map((c) => ({
                email_address: c.email_address,
                role_name: c.role_name
            })),
            custom_fields: params.custom_fields?.map((f) => ({
                name: f.name,
                value: f.value
            })),
            test_mode: params.test_mode,
            signing_redirect_url: params.signing_redirect_url,
            metadata: params.metadata
        })) as HelloSignCreateResponse;

        return {
            success: true,
            data: {
                signature_request_id: response.signature_request.signature_request_id,
                title: response.signature_request.title,
                is_complete: response.signature_request.is_complete,
                is_declined: response.signature_request.is_declined,
                created_at: response.signature_request.created_at,
                signing_url: response.signature_request.signing_url,
                details_url: response.signature_request.details_url,
                signatures: response.signature_request.signatures
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error
                        ? error.message
                        : "Failed to create signature request from template",
                retryable: false
            }
        };
    }
}
