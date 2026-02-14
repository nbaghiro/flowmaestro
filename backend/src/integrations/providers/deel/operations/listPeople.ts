import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { DeelClient } from "../client/DeelClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * List People operation schema
 */
export const listPeopleSchema = z.object({
    page: z.number().min(1).optional().describe("Page number (starting from 1)"),
    pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe("Number of results per page (1-100, default 50)"),
    workerType: z
        .enum(["employee", "contractor", "eor"])
        .optional()
        .describe("Filter by worker type"),
    status: z
        .enum(["active", "inactive", "pending", "offboarding"])
        .optional()
        .describe("Filter by worker status")
});

export type ListPeopleParams = z.infer<typeof listPeopleSchema>;

/**
 * List People operation definition
 */
export const listPeopleOperation: OperationDefinition = (() => {
    try {
        return {
            id: "listPeople",
            name: "List People",
            description:
                "List all workers (employees, contractors, and EOR workers) in Deel with pagination support",
            category: "hr",
            actionType: "read",
            inputSchema: listPeopleSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Deel", err: error }, "Failed to create listPeopleOperation");
        throw new Error(
            `Failed to create listPeople operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute list people operation
 */
export async function executeListPeople(
    client: DeelClient,
    params: ListPeopleParams
): Promise<OperationResult> {
    try {
        const response = await client.listPeople({
            page: params.page,
            page_size: params.pageSize,
            worker_type: params.workerType,
            status: params.status
        });

        return {
            success: true,
            data: {
                people: response.data.map((person) => ({
                    id: person.id,
                    displayName: person.display_name,
                    firstName: person.first_name,
                    lastName: person.last_name,
                    email: person.email,
                    workerType: person.worker_type,
                    status: person.status,
                    hireDate: person.hire_date,
                    terminationDate: person.termination_date,
                    department: person.department,
                    jobTitle: person.job_title,
                    country: person.country,
                    currency: person.currency,
                    managerId: person.manager_id
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
                message: error instanceof Error ? error.message : "Failed to list people",
                retryable: true
            }
        };
    }
}
