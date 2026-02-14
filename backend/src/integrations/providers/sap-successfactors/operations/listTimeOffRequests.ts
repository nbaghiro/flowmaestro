import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { SAPSuccessFactorsClient } from "../client/SAPSuccessFactorsClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Time Off Requests operation schema
 */
export const listTimeOffRequestsSchema = z.object({
    top: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe("Maximum number of results to return (1-1000, default 100)"),
    skip: z.number().min(0).optional().describe("Number of results to skip for pagination"),
    userId: z.string().optional().describe("Filter by specific user ID"),
    filter: z
        .string()
        .optional()
        .describe("OData filter expression (e.g., \"approvalStatus eq 'PENDING'\")")
});

export type ListTimeOffRequestsParams = z.infer<typeof listTimeOffRequestsSchema>;

/**
 * List Time Off Requests operation definition
 */
export const listTimeOffRequestsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listTimeOffRequests",
            name: "List Time Off Requests",
            description:
                "List employee time off requests from SAP SuccessFactors with filtering and pagination",
            category: "hr",
            actionType: "read",
            inputSchema: listTimeOffRequestsSchema,
            retryable: true,
            timeout: 60000
        };
    } catch (error) {
        logger.error(
            { component: "SAPSuccessFactors", err: error },
            "Failed to create listTimeOffRequestsOperation"
        );
        throw new Error(
            `Failed to create listTimeOffRequests operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list time off requests operation
 */
export async function executeListTimeOffRequests(
    client: SAPSuccessFactorsClient,
    params: ListTimeOffRequestsParams
): Promise<OperationResult> {
    try {
        const response = await client.listTimeOffRequests({
            top: params.top || 100,
            skip: params.skip,
            userId: params.userId,
            filter: params.filter
        });

        const timeOffRequests = response.d.results.map((request) => ({
            id: request.externalCode,
            userId: request.userId,
            timeType: request.timeType,
            timeTypeName: request.timeTypeName,
            startDate: request.startDate,
            endDate: request.endDate,
            daysRequested: request.quantityInDays,
            hoursRequested: request.quantityInHours,
            status: request.approvalStatus,
            comment: request.comment,
            workflowRequestId: request.workflowRequestId,
            createdAt: request.createdDateTime,
            lastModified: request.lastModifiedDateTime
        }));

        const total = response.d.__count ? parseInt(response.d.__count, 10) : null;
        const hasMore = !!response.d.__next;

        return {
            success: true,
            data: {
                timeOffRequests,
                pagination: {
                    total,
                    top: params.top || 100,
                    skip: params.skip || 0,
                    hasMore,
                    nextLink: response.d.__next || null
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to list time off requests",
                retryable: true
            }
        };
    }
}
