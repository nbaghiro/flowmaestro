import { z } from "zod";
import { CopperClient } from "../../client/CopperClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { CopperPerson } from "../types";

/**
 * Get Person operation schema
 */
export const getPersonSchema = z.object({
    person_id: z.number().describe("The ID of the person to retrieve")
});

export type GetPersonParams = z.infer<typeof getPersonSchema>;

/**
 * Get Person operation definition
 */
export const getPersonOperation: OperationDefinition = {
    id: "getPerson",
    name: "Get Person",
    description: "Get a specific person (contact) by ID from Copper CRM",
    category: "people",
    inputSchema: getPersonSchema,
    retryable: true,
    timeout: 10000
};

/**
 * Execute get person operation
 */
export async function executeGetPerson(
    client: CopperClient,
    params: GetPersonParams
): Promise<OperationResult> {
    try {
        const person = await client.get<CopperPerson>(`/people/${params.person_id}`);

        return {
            success: true,
            data: person
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get person",
                retryable: false
            }
        };
    }
}
