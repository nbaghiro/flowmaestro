import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloseClient } from "../../client/CloseClient";
import type { CloseContact } from "../types";

/**
 * Update Contact Parameters
 */
export const updateContactSchema = z.object({
    id: z.string().describe("The contact ID to update (starts with 'cont_')"),
    name: z.string().min(1).optional().describe("Contact name"),
    title: z.string().optional().describe("Job title"),
    emails: z
        .array(
            z.object({
                email: z.string().email(),
                type: z
                    .enum(["office", "home", "direct", "mobile", "fax", "other"])
                    .optional()
                    .default("office")
            })
        )
        .optional()
        .describe("Email addresses"),
    phones: z
        .array(
            z.object({
                phone: z.string(),
                type: z
                    .enum(["office", "home", "direct", "mobile", "fax", "other"])
                    .optional()
                    .default("office")
            })
        )
        .optional()
        .describe("Phone numbers"),
    urls: z
        .array(
            z.object({
                url: z.string().url(),
                type: z
                    .enum(["url", "website", "linkedin", "facebook", "twitter", "other"])
                    .optional()
                    .default("url")
            })
        )
        .optional()
        .describe("URLs (LinkedIn, website, etc.)")
});

export type UpdateContactParams = z.infer<typeof updateContactSchema>;

/**
 * Operation Definition
 */
export const updateContactOperation: OperationDefinition = {
    id: "updateContact",
    name: "Update Contact",
    description: "Update an existing contact",
    category: "contacts",
    inputSchema: updateContactSchema,
    inputSchemaJSON: toJSONSchema(updateContactSchema),
    retryable: false,
    timeout: 10000
};

/**
 * Execute Update Contact
 */
export async function executeUpdateContact(
    client: CloseClient,
    params: UpdateContactParams
): Promise<OperationResult> {
    try {
        const { id, ...updateData } = params;

        const response = await client.put<CloseContact>(`/contact/${id}/`, updateData);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to update contact",
                retryable: false
            }
        };
    }
}
