import { z } from "zod";
import type { XeroContactOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { XeroClient } from "../client/XeroClient";

export const getContactSchema = z.object({
    contactId: z.string().min(1).describe("The Xero contact ID")
});

export type GetContactParams = z.infer<typeof getContactSchema>;

export const getContactOperation: OperationDefinition = {
    id: "getContact",
    name: "Get Contact",
    description: "Get a single contact by ID from Xero",
    category: "contacts",
    inputSchema: getContactSchema,
    retryable: true,
    timeout: 30000
};

export async function executeGetContact(
    client: XeroClient,
    params: GetContactParams
): Promise<OperationResult> {
    try {
        const response = await client.getContact(params.contactId);
        const contacts = response.Contacts || [];

        if (contacts.length === 0) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `Contact with ID '${params.contactId}' not found`,
                    retryable: false
                }
            };
        }

        const contact = contacts[0];
        const formatted: XeroContactOutput = {
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
