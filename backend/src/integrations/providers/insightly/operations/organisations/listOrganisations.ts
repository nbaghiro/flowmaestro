import { z } from "zod";
import { InsightlyClient } from "../../client/InsightlyClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { InsightlyOrganisation } from "../types";

/**
 * List Organisations operation schema
 */
export const listOrganisationsSchema = z.object({
    skip: z.number().min(0).optional().default(0),
    top: z.number().min(1).max(500).optional().default(50),
    order_by: z.string().optional().describe("Field to sort by (e.g., DATE_UPDATED_UTC desc)")
});

export type ListOrganisationsParams = z.infer<typeof listOrganisationsSchema>;

/**
 * List Organisations operation definition
 */
export const listOrganisationsOperation: OperationDefinition = {
    id: "listOrganisations",
    name: "List Organisations",
    description: "List all organisations in Insightly CRM with pagination",
    category: "organisations",
    inputSchema: listOrganisationsSchema,
    retryable: true,
    timeout: 15000
};

/**
 * Execute list organisations operation
 */
export async function executeListOrganisations(
    client: InsightlyClient,
    params: ListOrganisationsParams
): Promise<OperationResult> {
    try {
        const queryParams: Record<string, unknown> = {
            skip: params.skip,
            top: params.top
        };

        if (params.order_by) {
            queryParams["$orderby"] = params.order_by;
        }

        const organisations = await client.get<InsightlyOrganisation[]>(
            "/Organisations",
            queryParams
        );

        return {
            success: true,
            data: {
                organisations,
                count: organisations.length,
                skip: params.skip,
                top: params.top
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list organisations",
                retryable: true
            }
        };
    }
}
