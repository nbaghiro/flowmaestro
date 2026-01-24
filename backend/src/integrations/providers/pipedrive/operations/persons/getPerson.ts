import { z } from "zod";
import { toJSONSchema } from "../../../../core/schema-utils";
import type { OperationDefinition, OperationResult } from "../../../../core/types";
import type { PipedriveClient } from "../../client/PipedriveClient";
import type { PipedriveResponse, PipedrivePerson } from "../types";

/**
 * Get Person Parameters
 */
export const getPersonSchema = z.object({
    id: z.number().int().describe("The person (contact) ID")
});

export type GetPersonParams = z.infer<typeof getPersonSchema>;

/**
 * Operation Definition
 */
export const getPersonOperation: OperationDefinition = {
    id: "getPerson",
    name: "Get Contact",
    description: "Get a specific contact (person) by ID",
    category: "persons",
    inputSchema: getPersonSchema,
    inputSchemaJSON: toJSONSchema(getPersonSchema),
    retryable: true,
    timeout: 10000
};

/**
 * Execute Get Person
 */
export async function executeGetPerson(
    client: PipedriveClient,
    params: GetPersonParams
): Promise<OperationResult> {
    try {
        const response = await client.get<PipedriveResponse<PipedrivePerson>>(
            `/persons/${params.id}`
        );

        if (!response.success || !response.data) {
            return {
                success: false,
                error: {
                    type: "not_found",
                    message: `Contact with ID ${params.id} not found`,
                    retryable: false
                }
            };
        }

        return {
            success: true,
            data: response.data
        };
    } catch (error) {
        return {
            success: false,
            error: {
                type: "server_error",
                message: error instanceof Error ? error.message : "Failed to get contact",
                retryable: true
            }
        };
    }
}
