import { z } from "zod";
import type { XeroContactOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { XeroClient } from "../client/XeroClient";

export const createContactSchema = z.object({
    name: z.string().min(1).describe("Contact name (required)"),
    firstName: z.string().optional().describe("First name"),
    lastName: z.string().optional().describe("Last name"),
    emailAddress: z.string().email().optional().describe("Email address"),
    phone: z.string().optional().describe("Phone number")
});

export type CreateContactParams = z.infer<typeof createContactSchema>;

export const createContactOperation: OperationDefinition = {
    id: "createContact",
    name: "Create Contact",
    description: "Create a new contact in Xero",
    category: "contacts",
    inputSchema: createContactSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCreateContact(
    client: XeroClient,
    params: CreateContactParams
): Promise<OperationResult> {
    try {
        const requestData: {
            Name: string;
            FirstName?: string;
            LastName?: string;
            EmailAddress?: string;
            Phones?: Array<{ PhoneType: string; PhoneNumber?: string }>;
        } = {
            Name: params.name
        };

        if (params.firstName) {
            requestData.FirstName = params.firstName;
        }
        if (params.lastName) {
            requestData.LastName = params.lastName;
        }
        if (params.emailAddress) {
            requestData.EmailAddress = params.emailAddress;
        }
        if (params.phone) {
            requestData.Phones = [
                {
                    PhoneType: "DEFAULT",
                    PhoneNumber: params.phone
                }
            ];
        }

        const response = await client.createContact(requestData);
        const contacts = response.Contacts || [];

        if (contacts.length === 0) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Failed to create contact - no response data",
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
                message: error instanceof Error ? error.message : "Failed to create contact",
                retryable: false
            }
        };
    }
}
