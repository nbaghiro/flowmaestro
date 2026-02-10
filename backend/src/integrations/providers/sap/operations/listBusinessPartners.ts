import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { SapClient } from "../client/SapClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

export const listBusinessPartnersSchema = z.object({
    top: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results to return (1-100, default 50)"),
    skip: z.number().min(0).optional().describe("Number of results to skip for pagination"),
    filter: z.string().optional().describe("OData $filter expression"),
    select: z.string().optional().describe("Comma-separated list of fields to return")
});

export type ListBusinessPartnersParams = z.infer<typeof listBusinessPartnersSchema>;

export const listBusinessPartnersOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listBusinessPartners",
            name: "List Business Partners",
            description: "List business partners in SAP S/4HANA with pagination and filtering",
            category: "erp",
            actionType: "read",
            inputSchema: listBusinessPartnersSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "SAP", err: error },
            "Failed to create listBusinessPartnersOperation"
        );
        throw new Error(
            `Failed to create listBusinessPartners operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

export async function executeListBusinessPartners(
    client: SapClient,
    params: ListBusinessPartnersParams
): Promise<OperationResult> {
    try {
        const response = await client.listBusinessPartners({
            top: params.top,
            skip: params.skip,
            filter: params.filter,
            select: params.select
        });

        return {
            success: true,
            data: {
                businessPartners: response.d.results,
                count: response.d.__count
                    ? parseInt(response.d.__count, 10)
                    : response.d.results.length,
                hasMore: !!response.d.__next
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to list business partners",
                retryable: true
            }
        };
    }
}
