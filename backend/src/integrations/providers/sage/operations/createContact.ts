import { z } from "zod";
import type { SageContactOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { SageClient } from "../client/SageClient";

export const createContactSchema = z.object({
    name: z.string().min(1).describe("Contact name (required)"),
    contactTypeId: z.string().min(1).describe("Contact type ID (e.g., CUSTOMER or VENDOR)"),
    reference: z.string().optional().describe("Reference code"),
    email: z.string().email().optional().describe("Email address"),
    telephone: z.string().optional().describe("Telephone number"),
    mobile: z.string().optional().describe("Mobile number"),
    addressLine1: z.string().optional().describe("Address line 1"),
    city: z.string().optional().describe("City"),
    region: z.string().optional().describe("Region/State"),
    postalCode: z.string().optional().describe("Postal/ZIP code"),
    country: z.string().optional().describe("Country")
});

export type CreateContactParams = z.infer<typeof createContactSchema>;

export const createContactOperation: OperationDefinition = {
    id: "createContact",
    name: "Create Contact",
    description: "Create a new contact in Sage",
    category: "contacts",
    inputSchema: createContactSchema,
    retryable: false,
    timeout: 30000
};

export async function executeCreateContact(
    client: SageClient,
    params: CreateContactParams
): Promise<OperationResult> {
    try {
        const requestData: {
            contact: {
                name: string;
                contact_type_ids: string[];
                reference?: string;
                email?: string;
                telephone?: string;
                mobile?: string;
                main_address?: {
                    address_line_1?: string;
                    city?: string;
                    region?: string;
                    postal_code?: string;
                    country?: string;
                };
            };
        } = {
            contact: {
                name: params.name,
                contact_type_ids: [params.contactTypeId]
            }
        };

        if (params.reference) {
            requestData.contact.reference = params.reference;
        }
        if (params.email) {
            requestData.contact.email = params.email;
        }
        if (params.telephone) {
            requestData.contact.telephone = params.telephone;
        }
        if (params.mobile) {
            requestData.contact.mobile = params.mobile;
        }

        if (
            params.addressLine1 ||
            params.city ||
            params.region ||
            params.postalCode ||
            params.country
        ) {
            requestData.contact.main_address = {};
            if (params.addressLine1) {
                requestData.contact.main_address.address_line_1 = params.addressLine1;
            }
            if (params.city) {
                requestData.contact.main_address.city = params.city;
            }
            if (params.region) {
                requestData.contact.main_address.region = params.region;
            }
            if (params.postalCode) {
                requestData.contact.main_address.postal_code = params.postalCode;
            }
            if (params.country) {
                requestData.contact.main_address.country = params.country;
            }
        }

        const contact = await client.createContact(requestData);

        if (!contact || !contact.id) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Failed to create contact - no response data",
                    retryable: false
                }
            };
        }

        const formatted: SageContactOutput = {
            id: contact.id,
            name: contact.name || contact.displayed_as || params.name,
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
                message: error instanceof Error ? error.message : "Failed to create contact",
                retryable: false
            }
        };
    }
}
