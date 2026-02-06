import { z } from "zod";
import { CopperClient } from "../../client/CopperClient";
import type { OperationDefinition, OperationResult } from "../../../../core/types";

/**
 * Delete Person operation schema
 */
export const deletePersonSchema = z.object({
    person_id: z.number().describe("The ID of the person to delete")
});

export type DeletePersonParams = z.infer<typeof deletePersonSchema>;

/**
 * Delete Person operation definition
 */
export const deletePersonOperation: OperationDefinition = {
    id: "deletePerson",
    name: "Delete Person",
    description: "Delete a person (contact) from Copper CRM",
    category: "people",
    inputSchema: deletePersonSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute delete person operation
 */
export async function executeDeletePerson(
    client: CopperClient,
    params: DeletePersonParams
): Promise<OperationResult> {
    try {
        await client.delete(`/people/${params.person_id}`);

        return {
            success: true,
            data: {
                deleted: true,
                person_id: params.person_id
            }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete person",
                retryable: false
            }
        };
    }
}
