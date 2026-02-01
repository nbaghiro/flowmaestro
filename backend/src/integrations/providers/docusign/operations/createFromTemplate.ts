import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { DocuSignClient } from "../client/DocuSignClient";
import { DocuSignTemplateIdSchema } from "../schemas";
import type { DocuSignCreateEnvelopeResponse } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Template role schema
 */
const TemplateRoleSchema = z.object({
    roleName: z.string().min(1).describe("Role name as defined in the template"),
    email: z.string().email().describe("Email address for this role"),
    name: z.string().min(1).describe("Name for this role"),
    clientUserId: z.string().optional().describe("For embedded signing"),
    tabs: z
        .object({
            textTabs: z
                .array(
                    z.object({
                        tabLabel: z.string().describe("Tab label as defined in template"),
                        value: z.string().describe("Value to pre-fill")
                    })
                )
                .optional()
        })
        .optional()
        .describe("Pre-fill tab values")
});

/**
 * Create from template operation schema
 */
export const createFromTemplateSchema = z.object({
    templateId: DocuSignTemplateIdSchema,
    emailSubject: z.string().optional().describe("Override the template email subject"),
    emailBlurb: z.string().optional().describe("Override the template email message"),
    status: z
        .enum(["created", "sent"])
        .default("sent")
        .describe("'created' to save as draft, 'sent' to send immediately"),
    templateRoles: z
        .array(TemplateRoleSchema)
        .min(1)
        .describe("Recipients mapped to template roles")
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
            description: "Create an envelope from a pre-defined DocuSign template",
            category: "envelopes",
            inputSchema: createFromTemplateSchema,
            retryable: false,
            timeout: 60000
        };
    } catch (error) {
        logger.error(
            { component: "DocuSign", err: error },
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
    client: DocuSignClient,
    params: CreateFromTemplateParams
): Promise<OperationResult> {
    try {
        const response = (await client.createFromTemplate({
            templateId: params.templateId,
            emailSubject: params.emailSubject,
            emailBlurb: params.emailBlurb,
            status: params.status,
            templateRoles: params.templateRoles.map((role) => ({
                roleName: role.roleName,
                email: role.email,
                name: role.name,
                clientUserId: role.clientUserId,
                tabs: role.tabs
            }))
        })) as DocuSignCreateEnvelopeResponse;

        return {
            success: true,
            data: {
                envelopeId: response.envelopeId,
                status: response.status,
                statusDateTime: response.statusDateTime,
                uri: response.uri
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
                        : "Failed to create envelope from template",
                retryable: false
            }
        };
    }
}
