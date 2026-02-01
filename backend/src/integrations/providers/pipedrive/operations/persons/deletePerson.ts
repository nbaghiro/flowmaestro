import { z } from "zod";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveResponse } from "../types";

/**
 * Delete Person Parameters
 */
export const deletePersonSchema = z.object({
    id: z.number().int().describe("The person (contact) ID to delete")
});

export type DeletePersonParams = z.infer<typeof deletePersonSchema>;

/**
 * Operation Definition
 */
export const deletePersonOperation: OperationDefinition = {
    id: "deletePerson",
    name: "Delete Contact",
    description: "Delete a contact (person)",
    category: "persons",
    inputSchema: deletePersonSchema,
    retryable: false,
    timeout: 10000
};

/**
 * Execute Delete Person
 */
export async function executeDeletePerson(
    client: PipedriveClient,
    params: DeletePersonParams
): Promise<OperationResult> {
    try {
        const response = await client.delete<PipedriveResponse<{ id: number }>>(
            `/persons/${params.id}`
        );

        if (!response.success) {
            return {
                success: false,
                error: {
                    type: "server_error",
                    message: "Failed to delete contact",
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: { deleted: true, id: params.id }
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to delete contact",
                retryable: false
            }
        };
    }
}
