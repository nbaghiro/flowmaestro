import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { ZohoCrmClient } from "../../client/ZohoCrmClient";
import type { ZohoLeadConvertResponse } from "../types";

/**
 * Convert Lead Parameters
 */
export const convertLeadSchema = z.object({
    id: z.string().min(1, "Lead ID is required"),
    overwrite: z.boolean().optional().default(false),
    notify_lead_owner: z.boolean().optional().default(false),
    notify_new_entity_owner: z.boolean().optional().default(false),
    Accounts: z.string().optional(),
    Contacts: z.string().optional(),
    Deal: z
        .object({
            Deal_Name: z.string().min(1, "Deal name is required"),
            Amount: z.number().optional(),
            Closing_Date: z.string().optional(),
            Stage: z.string().optional()
        })
        .optional(),
    carry_over_tags: z
        .object({
            Contacts: z.array(z.string()).optional(),
            Accounts: z.array(z.string()).optional(),
            Deals: z.array(z.string()).optional()
        })
        .optional()
});

export type ConvertLeadParams = z.infer<typeof convertLeadSchema>;

/**
 * Operation Definition
 */
export const convertLeadOperation: OperationDefinition = {
    id: "convertLead",
    name: "Convert Lead",
    description: "Convert a lead to Contact, Account, and optionally a Deal",
    category: "crm",
    inputSchema: convertLeadSchema,
    retryable: false,
    timeout: 15000
};

/**
 * Execute Convert Lead
 */
export async function executeConvertLead(
    client: ZohoCrmClient,
    params: ConvertLeadParams
): Promise<OperationResult> {
    try {
        const { id, Deal, ...restParams } = params;

        const requestData: Record<string, unknown> = {
            ...restParams
        };

        if (Deal) {
            requestData.Deals = Deal;
        }

        const response = await client.post<ZohoLeadConvertResponse>(
            `/crm/v8/Leads/${id}/actions/convert`,
            {
                data: [requestData]
            }
        );

        if (response.data?.[0]) {
            return {
                success: true,
                data: {
                    converted: true,
                    leadId: id,
                    contactId: response.data[0].Contacts,
                    accountId: response.data[0].Accounts,
                    dealId: response.data[0].Deals
                }
            };
        }

        return {
            success: false,
            error: {
                type: "server_error",
                message: "Failed to convert lead",
                retryable: false
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to convert lead",
                retryable: false
            }
        };
    }
}
