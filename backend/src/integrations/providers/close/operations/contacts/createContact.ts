import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CloseClient } from "../../client/CloseClient";
import type { CloseContact } from "../types";

/**
 * Create Contact Parameters
 */
export const createContactSchema = z.object({
    lead_id: z.string().describe("Lead ID this contact belongs to (required, starts with 'lead_')"),
    name: z.string().min(1).describe("Contact name (required)"),
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

export type CreateContactParams = z.infer<typeof createContactSchema>;

/**
 * Operation Definition
 */
export const createContactOperation: OperationDefinition = {
    id: "createContact",
    name: "Create Contact",
    description: "Create a new contact (must belong to a lead)",
    category: "contacts",
    inputSchema: createContactSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Create Contact
 */
export async function executeCreateContact(
    client: CloseClient,
    params: CreateContactParams
): Promise<OperationResult> {
    try {
        const response = await client.post<CloseContact>("/contact/", params);

        return {
            success: true,
            data: response
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to create contact",
                retryable: false
            }
        };
    }
}
