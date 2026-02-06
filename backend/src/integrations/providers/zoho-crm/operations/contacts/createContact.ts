import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoRecordResponse, ZohoContact } from "../types";

/**
 * Create Contact Parameters
 */
export const createContactSchema = z.object({
    Last_Name: z.string().min(1, "Last name is required"),
    First_Name: z.string().optional(),
    Email: z.string().email().optional(),
    Phone: z.string().optional(),
    Mobile: z.string().optional(),
    Account_Name: z.object({ id: z.string() }).optional(),
    Title: z.string().optional(),
    Department: z.string().optional(),
    Description: z.string().optional(),
    Mailing_Street: z.string().optional(),
    Mailing_City: z.string().optional(),
    Mailing_State: z.string().optional(),
    Mailing_Zip: z.string().optional(),
    Mailing_Country: z.string().optional()
});

export type CreateContactParams = z.infer<typeof createContactSchema>;

/**
 * Operation Definition
 */
export const createContactOperation: OperationDefinition = {
    id: "createContact",
    name: "Create Contact",
    description: "Create a new contact in Zoho CRM",
    category: "crm",
    inputSchema: createContactSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Create Contact
 */
export async function executeCreateContact(
    client: ZohoCrmClient,
    params: CreateContactParams
): Promise<OperationResult> {
    try {
        const response = await client.post<ZohoRecordResponse<ZohoContact>>("/crm/v8/Contacts", {
            data: [params]
        });

        if (response.data?.[0]?.status === "success") {
            return {
                success: true,
                data: response.data[0].details
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message: response.data?.[0]?.message || "Failed to create contact",
                retryable: false
            }
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
