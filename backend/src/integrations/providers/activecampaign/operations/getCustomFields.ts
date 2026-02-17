import { z } from "zod";
import type { ActiveCampaignCustomFieldOutput } from "./types";
import type { OperationDefinition, OperationResult } from "../../../core/types";
import type { ActiveCampaignClient } from "../client/ActiveCampaignClient";

export const getCustomFieldsSchema = z.object({
    limit: z.number().min(1).max(100).optional().describe("Number of fields to return (max 100)"),
    offset: z.number().min(0).optional().describe("Number of fields to skip")
});

export type GetCustomFieldsParams = z.infer<typeof getCustomFieldsSchema>;

export const getCustomFieldsOperation: OperationDefinition = {
    id: "getCustomFields",
    name: "Get Custom Fields",
    description: "Get all custom fields from ActiveCampaign",
    category: "customfields",
    inputSchema: getCustomFieldsSchema,
    retryable: true,
    timeout: 15000
};

export async function executeGetCustomFields(
    client: ActiveCampaignClient,
    params: GetCustomFieldsParams
): Promise<OperationResult> {
    try {
        const response = await client.getCustomFields({
            limit: params.limit,
            offset: params.offset
        });

        const fields: ActiveCampaignCustomFieldOutput[] = response.fields.map((field) => ({
            id: field.id,
            title: field.title,
            description: field.descript,
            type: field.type,
            personalizationTag: field.perstag,
            defaultValue: field.defval,
            createdAt: field.cdate,
            updatedAt: field.udate
        }));

        return {
            success: true,
            data: {
                fields,
                total: parseInt(response.meta.total, 10),
                hasMore: fields.length === (params.limit || 20)
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get custom fields",
                retryable: true
            }
        };
    }
}
