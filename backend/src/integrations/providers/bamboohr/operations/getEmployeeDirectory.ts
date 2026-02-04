import { z } from "zod";
import { getLogger } from "../../../../core/logging";
import { BambooHRClient } from "../client/BambooHRClient";
import type { OperationDefinition, OperationResult } from "../../../core/types";

const logger = getLogger();

/**
 * Get Employee Directory operation schema
 */
export const getEmployeeDirectorySchema = z.object({});

export type GetEmployeeDirectoryParams = z.infer<typeof getEmployeeDirectorySchema>;

/**
 * Get Employee Directory operation definition
 */
export const getEmployeeDirectoryOperation: OperationDefinition = (() => {
    try {
        return {
            id: "getEmployeeDirectory",
            name: "Get Employee Directory",
            description: "Get the full employee directory from BambooHR",
            category: "hr",
            actionType: "read",
            inputSchema: getEmployeeDirectorySchema,
            retryable: true,
            timeout: 30000
        };
    } catch (error) {
        logger.error(
            { component: "BambooHR", err: error },
            "Failed to create getEmployeeDirectoryOperation"
        );
        throw new Error(
            `Failed to create getEmployeeDirectory operation: ${error instanceof Error ? error.message : "Unknown error"}`
        );
    }
})();

/**
 * Execute get employee directory operation
 */
export async function executeGetEmployeeDirectory(
    client: BambooHRClient,
    _params: GetEmployeeDirectoryParams
): Promise<OperationResult> {
    try {
        const response = await client.getEmployeeDirectory();

        return {
            success: true,
            data: {
                employees: response.data.map((entry) => ({
                    id: entry.id,
                    displayName: entry.displayName,
                    firstName: entry.firstName,
                    lastName: entry.lastName,
                    preferredName: entry.preferredName,
                    jobTitle: entry.jobTitle,
                    workPhone: entry.workPhone,
                    workEmail: entry.workEmail,
                    department: entry.department,
                    location: entry.location,
                    division: entry.division,
                    photoUrl: entry.photoUrl
                }))
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message:
                    error instanceof Error ? error.message : "Failed to get employee directory",
                retryable: true
            }
        };
    }
}
