import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { DeelClient } from "../client/DeelClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Person operation schema
 */
export const getPersonSchema = z.object({
    personId: z.string().min(1).describe("The unique identifier of the person")
});

export type GetPersonParams = z.infer<typeof getPersonSchema>;

/**
 * Get Person operation definition
 */
export const getPersonOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getPerson",
            name: "Get Person",
            description: "Get detailed information about a specific worker by their ID",
            category: "hr",
            actionType: "read",
            inputSchema: getPersonSchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error({ component: "Deel", err: error }, "Failed to create getPersonOperation");
        throw new Error(
            `Failed to create getPerson operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get person operation
 */
export async function executeGetPerson(
    client: DeelClient,
    params: GetPersonParams
): Promise<OperationResult> {
    try {
        const response = await client.getPerson(params.personId);
        const person = response.data;

        return {
            success: true,
            data: {
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
                managerId: person.manager_id,
                createdAt: person.created_at,
                updatedAt: person.updated_at
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get person",
                retryable: true
            }
        };
    }
}
