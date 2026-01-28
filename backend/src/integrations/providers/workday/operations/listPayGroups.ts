import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { toJSONSchema } from "../../../core/schema-utils";
import { WorkdayClient } from "../client/WorkdayClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Pay Groups operation schema
 */
export const listPayGroupsSchema = z.object({
    limit: z.number().min(1).max(100).optional().describe("Number of results per page (1-100)"),
    offset: z.number().min(0).optional().describe("Number of results to skip for pagination")
});

export type ListPayGroupsParams = z.infer<typeof listPayGroupsSchema>;

/**
 * List Pay Groups operation definition
 */
export const listPayGroupsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listPayGroups",
            name: "List Pay Groups",
            description: "List pay group configurations in Workday",
            category: "hr",
            actionType: "read",
            inputSchema: listPayGroupsSchema,
            inputSchemaJSON: toJSONSchema(listPayGroupsSchema),
            retryable: true,
            timeout: 15000
        };
    } catch (error) {
        logger.error(
            { component: "Workday", err: error },
            "Failed to create listPayGroupsOperation"
        );
        throw new Error(
            `Failed to create listPayGroups operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list pay groups operation
 */
export async function executeListPayGroups(
    client: WorkdayClient,
    params: ListPayGroupsParams
): Promise<OperationResult> {
    try {
        const response = await client.listPayGroups({
            limit: params.limit,
            offset: params.offset
        });

        return {
            success: true,
            data: {
                payGroups: response.data.map((payGroup) => ({
                    id: payGroup.id,
                    name: payGroup.name,
                    description: payGroup.description,
                    frequency: payGroup.frequency,
                    country: payGroup.country,
                    currency: payGroup.currency,
                    nextPayDate: payGroup.nextPayDate,
                    workerCount: payGroup.workerCount
                })),
                pagination: {
                    total: response.total,
                    offset: response.offset,
                    limit: response.limit
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list pay groups",
                retryable: true
            }
        };
    }
}
