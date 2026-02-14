import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { SAPSuccessFactorsClient } from "../client/SAPSuccessFactorsClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List Jobs operation schema
 */
export const listJobsSchema = z.object({
    top: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe("Maximum number of results to return (1-1000, default 100)"),
    skip: z.number().min(0).optional().describe("Number of results to skip for pagination"),
    userId: z.string().optional().describe("Filter by specific user ID"),
    filter: z.string().optional().describe("OData filter expression")
});

export type ListJobsParams = z.infer<typeof listJobsSchema>;

/**
 * List Jobs operation definition
 */
export const listJobsOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listJobs",
            name: "List Job Assignments",
            description:
                "List employee job assignments from SAP SuccessFactors with filtering and pagination",
            category: "hr",
            actionType: "read",
            inputSchema: listJobsSchema,
            retryable: true,
            timeout: 60000
        };
    } catch (error) {
        logger.error(
            { component: "SAPSuccessFactors", err: error },
            "Failed to create listJobsOperation"
        );
        throw new Error(
            `Failed to create listJobs operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list jobs operation
 */
export async function executeListJobs(
    client: SAPSuccessFactorsClient,
    params: ListJobsParams
): Promise<OperationResult> {
    try {
        const response = await client.listJobs({
            top: params.top || 100,
            skip: params.skip,
            userId: params.userId,
            filter: params.filter
        });

        const jobs = response.d.results.map((job) => ({
            sequenceNumber: job.seqNumber,
            userId: job.userId,
            startDate: job.startDate,
            endDate: job.endDate,
            jobCode: job.jobCode,
            jobTitle: job.jobTitle,
            department: job.department,
            division: job.division,
            businessUnit: job.businessUnit,
            location: job.location,
            costCenter: job.costCenter,
            managerId: job.managerId,
            employmentType: job.employmentType,
            employeeClass: job.employeeClass,
            payGrade: job.payGrade,
            standardHours: job.standardHours,
            fte: job.fte,
            eventReason: job.eventReason,
            lastModified: job.lastModifiedDateTime
        }));

        const total = response.d.__count ? parseInt(response.d.__count, 10) : null;
        const hasMore = !!response.d.__next;

        return {
            success: true,
            data: {
                jobs,
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
                message: error instanceof Error ? error.message : "Failed to list job assignments",
                retryable: true
            }
        };
    }
}
