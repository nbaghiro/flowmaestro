import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoRecordResponse, ZohoContact } from "../types";

/**
 * Batch Create Contacts Parameters
 */
export const batchCreateContactsSchema = z.object({
    contacts: z
        .array(
            z.object({
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
            })
        )
        .min(1)
        .max(100, "Maximum 100 contacts per batch")
});

export type BatchCreateContactsParams = z.infer<typeof batchCreateContactsSchema>;

/**
 * Operation Definition
 */
export const batchCreateContactsOperation: OperationDefinition = {
    id: "batchCreateContacts",
    name: "Batch Create Contacts",
    description: "Create multiple contacts in Zoho CRM (up to 100 per request)",
    category: "crm",
    inputSchema: batchCreateContactsSchema,
    retryable: true,
    timeout: 30000
};

/**
 * Execute Batch Create Contacts
 */
export async function executeBatchCreateContacts(
    client: ZohoCrmClient,
    params: BatchCreateContactsParams
): Promise<OperationResult> {
    try {
        const response = await client.post<ZohoRecordResponse<ZohoContact>>("/crm/v8/Contacts", {
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
                message: error instanceof Error ? error.message : "Failed to batch create contacts",
                retryable: false
            }
        };
    }
}
