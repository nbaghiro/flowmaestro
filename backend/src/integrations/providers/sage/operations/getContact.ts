import { z } from "zod";
import type { SageContactOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SageClient } from "../client/SageClient";

export const getContactSchema = z.object({
    contactId: z.string().min(1).describe("The Sage contact ID")
});

export type GetContactParams = z.infer<typeof getContactSchema>;

export const getContactOperation: OperationDefinition = {
    id: "getContact",
    name: "Get Contact",
    description: "Get a single contact by ID from Sage",
    category: "contacts",
    inputSchema: getContactSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetContact(
    client: SageClient,
    params: GetContactParams
): Promise<OperationResult> {
    try {
        const contact = await client.getContact(params.contactId);

        if (!contact || !contact.id) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `Contact with ID '${params.contactId}' not found`,
                    retryable: false
                }
            };
        }

        const formatted: SageContactOutput = {
            id: contact.id,
            name: contact.name || contact.displayed_as || "Unknown",
            contactTypeName: contact.contact_type_name,
            reference: contact.reference,
            email: contact.email,
            telephone: contact.telephone,
            mobile: contact.mobile,
            mainAddress: contact.main_address
                ? {
                      addressLine1: contact.main_address.address_line_1,
                      addressLine2: contact.main_address.address_line_2,
                      city: contact.main_address.city,
                      region: contact.main_address.region,
                      postalCode: contact.main_address.postal_code,
                      country: contact.main_address.country
                  }
                : undefined,
            creditLimit: contact.credit_limit,
            creditDays: contact.credit_days,
            currency: contact.currency,
            createdAt: contact.created_at,
            updatedAt: contact.updated_at
        };

        return {
            success: true,
            data: formatted
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get contact",
                retryable: true
            }
        };
    }
}
