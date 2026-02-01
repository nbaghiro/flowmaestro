import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { HubspotClient } from "../../client/HubspotClient";
import type { HubspotContact } from "../types";

/**
 * Create Contact Parameters
 */
export const createContactSchema = z.object({
    properties: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
    associations: z
        .array(
            z.object({
                to: z.object({
                    id: z.string()
                }),
                types: z.array(
                    z.object({
                        associationCategory: z.string(),
                        associationTypeId: z.number()
                    })
                )
            })
        )
        .optional()
});

export type CreateContactParams = z.infer<typeof createContactSchema>;

/**
 * Operation Definition
 */
export const createContactOperation: OperationDefinition = {
    id: "createContact",
    name: "Create Contact",
    description: "Create a new contact in HubSpot CRM",
    category: "crm",
    inputSchema: createContactSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Create Contact
 */
export async function executeCreateContact(
    client: HubspotClient,
    params: CreateContactParams
): Promise<OperationResult> {
    try {
        const response = await client.post<HubspotContact>("/crm/v3/objects/contacts", {
            properties: params.properties,
            associations: params.associations
        });

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
