import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { DeelClient } from "../client/DeelClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Timesheets operation schema
 */
export const listTimesheetsSchema = z.object({
    page: z.number().min(1).optional().describe("Page number (starting from 1)"),
    pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results per page (1-100, default 50)"),
    personId: z.string().optional().describe("Filter by person ID"),
    status: z
        .enum(["draft", "submitted", "approved", "rejected", "paid"])
        .optional()
        .describe("Filter by timesheet status"),
    periodStart: z
        .string()
        .optional()
        .describe("Filter by period start date (ISO 8601 format: YYYY-MM-DD)"),
    periodEnd: z
        .string()
        .optional()
        .describe("Filter by period end date (ISO 8601 format: YYYY-MM-DD)")
});

export type ListTimesheetsParams = z.infer<typeof listTimesheetsSchema>;

/**
 * List Timesheets operation definition
 */
export const listTimesheetsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listTimesheets",
            name: "List Timesheets",
            description:
                "List contractor timesheets with optional filtering by person, status, or period",
            category: "hr",
            actionType: "read",
            inputSchema: listTimesheetsSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Deel", err: error }, "Failed to create listTimesheetsOperation");
        throw new Error(
            `Failed to create listTimesheets operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list timesheets operation
 */
export async function executeListTimesheets(
    client: DeelClient,
    params: ListTimesheetsParams
): Promise<OperationResult> {
    try {
        const response = await client.listTimesheets({
            page: params.page,
            page_size: params.pageSize,
            person_id: params.personId,
            status: params.status,
            period_start: params.periodStart,
            period_end: params.periodEnd
        });

        return {
            success: true,
            data: {
                timesheets: response.data.map((timesheet) => ({
                    id: timesheet.id,
                    personId: timesheet.person_id,
                    personName: timesheet.person_name,
                    contractId: timesheet.contract_id,
                    periodStart: timesheet.period_start,
                    periodEnd: timesheet.period_end,
                    status: timesheet.status,
                    totalHours: timesheet.total_hours,
                    totalAmount: timesheet.total_amount,
                    currency: timesheet.currency,
                    submittedAt: timesheet.submitted_at,
                    approvedAt: timesheet.approved_at,
                    createdAt: timesheet.created_at,
                    updatedAt: timesheet.updated_at
                })),
                pagination: {
                    total: response.pagination.total,
                    page: response.pagination.page,
                    pageSize: response.pagination.page_size,
                    totalPages: response.pagination.total_pages,
                    hasMore: response.pagination.has_more
                }
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to list timesheets",
                retryable: true
            }
        };
    }
}
