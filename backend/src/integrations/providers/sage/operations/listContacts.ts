import { z } from "zod";
import type { SageContactOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SageClient } from "../client/SageClient";

export const listContactsSchema = z.object({
    page: z.number().min(1).optional().default(1).describe("Page number for pagination (1-based)"),
    itemsPerPage: z
        .number()
        .min(1)
        .max(200)
        .optional()
        .default(20)
        .describe("Number of items per page (max 200)")
});

export type ListContactsParams = z.infer<typeof listContactsSchema>;

export const listContactsOperation: OperationDefinition = {
    id: "listContacts",
    name: "List Contacts",
    description: "Get a list of contacts from Sage",
    category: "contacts",
    inputSchema: listContactsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListContacts(
    client: SageClient,
    params: ListContactsParams
): Promise<OperationResult> {
    try {
        const response = await client.listContacts(params.page, params.itemsPerPage);
        const contacts = response.$items || [];

        const formattedContacts: SageContactOutput[] = contacts.map((contact) => ({
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
        }));

        return {
            success: true,
            data: {
                contacts: formattedContacts,
                count: formattedContacts.length,
                total: response.$total,
                page: params.page
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list contacts",
                retryable: true
            }
        };
    }
}
