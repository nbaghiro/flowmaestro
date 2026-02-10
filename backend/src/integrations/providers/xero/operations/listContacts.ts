import { z } from "zod";
import type { XeroContactOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { XeroClient } from "../client/XeroClient";

export const listContactsSchema = z.object({
    page: z.number().min(1).optional().default(1).describe("Page number for pagination (1-based)")
});

export type ListContactsParams = z.infer<typeof listContactsSchema>;

export const listContactsOperation: OperationDefinition = {
    id: "listContacts",
    name: "List Contacts",
    description: "Get a list of contacts from Xero",
    category: "contacts",
    inputSchema: listContactsSchema,
    retryable: true,
    timeout: 30000
};

export async function executeListContacts(
    client: XeroClient,
    params: ListContactsParams
): Promise<OperationResult> {
    try {
        const response = await client.listContacts(params.page);
        const contacts = response.Contacts || [];

        const formattedContacts: XeroContactOutput[] = contacts.map((contact) => ({
            contactId: contact.ContactID,
            name: contact.Name,
            firstName: contact.FirstName,
            lastName: contact.LastName,
            emailAddress: contact.EmailAddress,
            contactStatus: contact.ContactStatus,
            phones: contact.Phones?.map((p) => ({
                phoneType: p.PhoneType,
                phoneNumber: p.PhoneNumber,
                phoneAreaCode: p.PhoneAreaCode,
                phoneCountryCode: p.PhoneCountryCode
            })),
            addresses: contact.Addresses?.map((a) => ({
                addressType: a.AddressType,
                addressLine1: a.AddressLine1,
                city: a.City,
                region: a.Region,
                postalCode: a.PostalCode,
                country: a.Country
            })),
            isSupplier: contact.IsSupplier,
            isCustomer: contact.IsCustomer,
            updatedDateUTC: contact.UpdatedDateUTC
        }));

        return {
            success: true,
            data: {
                contacts: formattedContacts,
                count: formattedContacts.length,
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
