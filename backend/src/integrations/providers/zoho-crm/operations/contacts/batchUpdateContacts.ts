import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoRecordResponse, ZohoContact } from "../types";

/**
 * Batch Update Contacts Parameters
 */
export const batchUpdateContactsSchema = z.object({
    contacts: z
        .array(
            z.object({
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
            })
        )
        .min(1)
        .max(100, "Maximum 100 contacts per batch")
});

export type BatchUpdateContactsParams = z.infer<typeof batchUpdateContactsSchema>;

/**
 * Operation Definition
 */
export const batchUpdateContactsOperation: OperationDefinition = {
    id: "batchUpdateContacts",
    name: "Batch Update Contacts",
    description: "Update multiple contacts in Zoho CRM (up to 100 per request)",
    category: "crm",
    inputSchema: batchUpdateContactsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute Batch Update Contacts
 */
export async function executeBatchUpdateContacts(
    client: ZohoCrmClient,
    params: BatchUpdateContactsParams
): Promise<OperationResult> {
    try {
        const response = await client.put<ZohoRecordResponse<ZohoContact>>("/crm/v8/Contacts", {
            data: params.contacts
        });

        const results = response.data.map((item, index) => ({
            index,
            success: item.status === "success",
            data: item.details,
            code: item.code,
            message: item.message
        }));

        const successCount = results.filter((r) => r.success).length;

        return {
            success: successCount > 0,
            data: {
                results,
                successCount,
                failureCount: results.length - successCount
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to batch update contacts",
                retryable: false
            }
        };
    }
}
