import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoRecordResponse, ZohoContact } from "../types";

/**
 * Update Contact Parameters
 */
export const updateContactSchema = z.object({
    id: z.string().min(1, "Contact ID is required"),
    Last_Name: z.string().optional(),
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

export type UpdateContactParams = z.infer<typeof updateContactSchema>;

/**
 * Operation Definition
 */
export const updateContactOperation: OperationDefinition = {
    id: "updateContact",
    name: "Update Contact",
    description: "Update an existing contact in Zoho CRM",
    category: "crm",
    inputSchema: updateContactSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute Update Contact
 */
export async function executeUpdateContact(
    client: ZohoCrmClient,
    params: UpdateContactParams
): Promise<OperationResult> {
    try {
        const { id, ...updateData } = params;

        const response = await client.put<ZohoRecordResponse<ZohoContact>>(
            `/crm/v8/Contacts/${id}`,
            {
                data: [updateData]
            }
        );

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
                message: response.data?.[0]?.message || "Failed to update contact",
                retryable: false
            }
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
